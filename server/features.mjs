import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { subjects, curricula } from './validation.mjs';
import { answerWithGemini } from './tutor.mjs';

const preferenceSchema = z.object({
  onboarded: z.boolean().default(false),
  curriculum: z.enum(curricula).default('UTBK'),
  focus: z.enum(['UTBK', 'Ujian Sekolah']).default('UTBK'),
  university: z.string().trim().max(100).default(''),
  major: z.string().trim().max(100).default(''),
  dailyMinutes: z.number().int().min(10).max(240).default(30),
  leaderboardOptIn: z.boolean().default(false),
});
const eventDefinitions = [
  {
    id: 'utbk',
    title: 'Tryout UTBK',
    description: 'Penalaran, literasi, dan kemampuan dasar dari bank soalmu.',
    category: 'UTBK',
    subjects: [
      'Penalaran Umum',
      'Pengetahuan & Pemahaman Umum',
      'Kemampuan Memahami Bacaan dan Menulis',
      'Pengetahuan Kuantitatif',
      'Literasi Bahasa Indonesia',
      'Literasi Bahasa Inggris',
      'Penalaran Matematika',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'Matematika',
    ],
    code: 'PAHAMIN-UTBK',
  },
  {
    id: 'tka-sma',
    title: 'Tryout TKA SMA',
    description: 'Latihan mata pelajaran wajib dan pilihan tingkat SMA.',
    category: 'TKA SMA',
    subjects,
    code: 'PAHAMIN-SMA',
  },
  {
    id: 'tka-smp',
    title: 'Tryout TKA SMP',
    description: 'Latihan tingkat SMP dari soal yang kamu impor.',
    category: 'TKA SMP',
    subjects: ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'],
    code: 'PAHAMIN-SMP',
  },
  {
    id: 'mandiri',
    title: 'Tryout Ujian Mandiri',
    description: 'Persiapan UM UGM dan SIMAK UI dari bank soalmu.',
    category: 'Ujian Mandiri',
    subjects,
    code: 'PAHAMIN-UM',
  },
];
export const belongsToEvent = (q, event) =>
  event.subjects.includes(q.subject) &&
  (event.id === 'utbk'
    ? (q.curriculum || 'UTBK') === 'UTBK'
    : event.id === 'tka-sma'
      ? /^Kelas 1[012]/.test(q.curriculum || '')
      : event.id === 'tka-smp'
        ? /^Kelas [789]$/.test(q.curriculum || '')
        : ['UM UGM', 'SIMAK UI'].includes(q.curriculum));

export function registerFeatures({
  app,
  db,
  requireUser,
  limit,
  upload,
  readQuestions,
  readMaterials,
  tutorProvider = answerWithGemini,
}) {
  const preferences = async (id) =>
    preferenceSchema.parse(
      id
        ? (await db.get('SELECT payload FROM pahamin.study_preferences WHERE user_id=$1', id))
            ?.payload || {}
        : {},
    );
  const stats = async (id) => {
    const reviews = id
      ? (
          await db.all(
            'SELECT result FROM pahamin.attempts WHERE user_id=$1 AND result IS NOT NULL ORDER BY started DESC LIMIT 100',
            id,
          )
        ).flatMap((a) => a.result.review)
      : [];
    return subjects.map((subject) => {
      const list = reviews.filter((q) => q.subject === subject),
        correct = list.filter((q) => q.correct).length;
      return {
        subject,
        total: list.length,
        correct,
        accuracy: list.length ? Math.round((correct / list.length) * 100) : null,
      };
    });
  };
  const events = async (id) => {
    const questions = await readQuestions(id),
      enrolled = new Set(
        id
          ? (
              await db.all('SELECT event_id FROM pahamin.event_enrollments WHERE user_id=$1', id)
            ).map((r) => r.event_id)
          : [],
      );
    return eventDefinitions.map((event) => {
      const pool = questions.filter((q) => belongsToEvent(q, event));
      return {
        ...event,
        enrolled: enrolled.has(event.id),
        total: pool.length,
        duration: pool.length * 90,
        subtests: event.subjects.map((subject) => ({
          subject,
          count: pool.filter((q) => q.subject === subject).length,
        })),
        source: 'Bank soal lokal',
        price: 0,
      };
    });
  };
  const state = async (id) => {
    const [
      savedPreferences,
      subjectStats,
      tryouts,
      questionBookmarks,
      eventAttempts,
      liveSessions,
      activeAttempts,
      tutorMessages,
    ] = await Promise.all([
      preferences(id),
      stats(id),
      events(id),
      id ? db.all('SELECT question_id FROM pahamin.question_bookmarks WHERE user_id=$1', id) : [],
      id ? db.all('SELECT * FROM pahamin.event_attempts WHERE user_id=$1', id) : [],
      id ? db.all('SELECT payload FROM pahamin.live_sessions WHERE user_id=$1', id) : [],
      id
        ? db.all(
            'SELECT a.id,a.mode,a.started,a.duration,a.questions,e.event_id FROM pahamin.attempts a LEFT JOIN pahamin.event_attempts e ON e.attempt_id=a.id WHERE a.user_id=$1 AND a.result IS NULL ORDER BY a.started DESC LIMIT 20',
            id,
          )
        : [],
      id
        ? db.all(
            'SELECT role,content,created,id FROM pahamin.tutor_messages WHERE user_id=$1 ORDER BY sequence DESC LIMIT 40',
            id,
          )
        : [],
    ]);
    return {
      preferences: savedPreferences,
      subjectStats,
      curricula,
      questionBookmarks: questionBookmarks.map((r) => r.question_id),
      tryouts,
      eventAttempts,
      liveSessions: liveSessions.map((r) => r.payload),
      activeAttempts: activeAttempts.map((a) => ({
        id: a.id,
        mode: a.mode,
        started: a.started,
        duration: a.duration,
        eventId: a.event_id,
        questionCount: a.questions.length,
        subjects: [...new Set(a.questions.map((q) => q.subject))],
      })),
      tutorMessages: tutorMessages.reverse(),
    };
  };
  app.patch('/api/study/preferences', requireUser, async (req, res) => {
    const validated = preferenceSchema.partial().parse(req.body);
    const patch = Object.fromEntries(
      Object.keys(req.body)
        .filter((k) => Object.hasOwn(validated, k))
        .map((k) => [k, validated[k]]),
    );
    const saved = await db.get(
      'INSERT INTO pahamin.study_preferences VALUES ($1,$2) ON CONFLICT(user_id) DO UPDATE SET payload=pahamin.study_preferences.payload || $3::jsonb RETURNING payload',
      req.user.id,
      JSON.stringify(preferenceSchema.parse(patch)),
      JSON.stringify(patch),
    );
    res.json({ preferences: preferenceSchema.parse(saved.payload) });
  });
  app.post('/api/questions/:id/bookmark', requireUser, async (req, res) => {
    if (!(await readQuestions(req.user.id)).some((q) => q.id === req.params.id))
      return res.status(404).json({ error: 'Soal tidak ditemukan.' });
    await db.transaction(async (tx) => {
      await tx.get('SELECT id FROM pahamin.users WHERE id=$1 FOR UPDATE', req.user.id);
      const exists = await tx.get(
        'SELECT 1 FROM pahamin.question_bookmarks WHERE user_id=$1 AND question_id=$2',
        req.user.id,
        req.params.id,
      );
      if (exists)
        await tx.run(
          'DELETE FROM pahamin.question_bookmarks WHERE user_id=$1 AND question_id=$2',
          req.user.id,
          req.params.id,
        );
      else
        await tx.run(
          'INSERT INTO pahamin.question_bookmarks VALUES ($1,$2)',
          req.user.id,
          req.params.id,
        );
    });
    res.json({ ok: true });
  });
  app.get('/api/leaderboard', requireUser, async (req, res) => {
    const since = Date.now() - 7 * 86400000;
    const rows = await db.all(
      "SELECT u.id,u.name,a.result FROM pahamin.users u JOIN pahamin.study_preferences p ON p.user_id=u.id JOIN pahamin.attempts a ON a.user_id=u.id WHERE p.payload->>'leaderboardOptIn'='true' AND a.result IS NOT NULL AND a.started>=$1",
      since,
    );
    const grouped = new Map();
    for (const r of rows) {
      const item = grouped.get(r.id) || { id: r.id, name: r.name, points: 0, correct: 0, total: 0 };
      const a = r.result;
      item.points += a.correct * 10;
      item.correct += a.correct;
      item.total += a.total;
      grouped.set(r.id, item);
    }
    const all = [...grouped.values()].sort(
      (a, b) => b.points - a.points || a.name.localeCompare(b.name),
    );
    res.json({
      scope: 'Pengguna server lokal yang memilih ikut, 7 hari terakhir',
      rows: all.slice(0, 20).map((r, i) => ({
        rank: i + 1,
        name: r.name,
        points: r.points,
        correct: r.correct,
        total: r.total,
        isYou: r.id === req.user.id,
      })),
      yourRank: all.findIndex((r) => r.id === req.user.id) + 1 || null,
      optedIn: (await preferences(req.user.id)).leaderboardOptIn,
    });
  });
  app.post('/api/tryouts/code', requireUser, async (req, res) => {
    const { code } = z.object({ code: z.string().trim().min(3).max(50) }).parse(req.body);
    const event = eventDefinitions.find((e) => e.code === code.toUpperCase());
    if (!event)
      return res
        .status(404)
        .json({ error: 'Kode tidak ditemukan. Gunakan kode tryout lokal yang tersedia.' });
    await db.run(
      'INSERT INTO pahamin.event_enrollments VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      req.user.id,
      event.id,
      new Date().toISOString(),
    );
    res.json({ id: event.id });
  });
  app.post('/api/tryouts/:id/enroll', requireUser, async (req, res) => {
    const event = eventDefinitions.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Tryout tidak ditemukan.' });
    if (!(await events(req.user.id)).find((e) => e.id === event.id)?.total)
      return res.status(400).json({
        error: 'Belum ada soal untuk kategori ini. Impor soal dengan kurikulum yang sesuai.',
      });
    await db.run(
      'INSERT INTO pahamin.event_enrollments VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      req.user.id,
      event.id,
      new Date().toISOString(),
    );
    res.json({ ok: true });
  });
  const httpsUrl = z
    .string()
    .trim()
    .max(1500)
    .refine(
      (s) =>
        !s ||
        (() => {
          try {
            const u = new URL(s);
            return u.protocol === 'https:' && !u.username && !u.password;
          } catch {
            return false;
          }
        })(),
      { message: 'Tautan harus berupa URL HTTPS yang valid.' },
    );
  const liveSchema = z.object({
    title: z.string().trim().min(3).max(160),
    subject: z.enum(subjects),
    className: z.string().trim().min(2).max(100),
    teacher: z.string().trim().min(2).max(100),
    startsAt: z.string().datetime(),
    duration: z.number().int().min(10).max(300),
    meetingUrl: httpsUrl.default(''),
    recordingUrl: httpsUrl.default(''),
  });
  app.post('/api/live-sessions', requireUser, async (req, res) => {
    const input = liveSchema.parse(req.body),
      id = randomUUID(),
      record = { ...input, id };
    await db.run(
      'INSERT INTO pahamin.live_sessions VALUES ($1,$2,$3)',
      id,
      req.user.id,
      JSON.stringify(record),
    );
    res.status(201).json(record);
  });
  app.patch('/api/live-sessions/:id', requireUser, async (req, res) => {
    const old = await db.get(
      'SELECT payload FROM pahamin.live_sessions WHERE id=$1 AND user_id=$2',
      req.params.id,
      req.user.id,
    );
    if (!old) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    const record = {
      ...liveSchema.parse({ ...old.payload, ...req.body }),
      id: req.params.id,
    };
    await db.run(
      'UPDATE pahamin.live_sessions SET payload=$1 WHERE id=$2 AND user_id=$3',
      JSON.stringify(record),
      req.params.id,
      req.user.id,
    );
    res.json(record);
  });
  app.post('/api/tutor', requireUser, limit('tutor', 8), upload, async (req, res) => {
    const { message, materialId } = z
      .object({
        message: z.string().trim().min(3).max(6000),
        materialId: z.string().max(100).optional(),
      })
      .parse(req.body);
    const material = materialId
      ? (await readMaterials(req.user.id)).find((m) => m.id === materialId)
      : null;
    if (materialId && !material) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    const history = (
      await db.all(
        'SELECT role,content FROM pahamin.tutor_messages WHERE user_id=$1 ORDER BY sequence DESC LIMIT 12',
        req.user.id,
      )
    ).reverse();
    const reply = await tutorProvider({ message, history, file: req.file, material });
    if (typeof reply !== 'string' || !reply.trim() || reply.length > 30000)
      throw Object.assign(new Error('Jawaban AI belum valid. Silakan coba lagi.'), { status: 502 });
    const created = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.run(
        'INSERT INTO pahamin.tutor_messages(id,user_id,role,content,created) VALUES ($1,$2,$3,$4,$5)',
        randomUUID(),
        req.user.id,
        'user',
        message + (req.file ? `\n📎 ${req.file.originalname}` : ''),
        created,
      );
      await tx.run(
        'INSERT INTO pahamin.tutor_messages(id,user_id,role,content,created) VALUES ($1,$2,$3,$4,$5)',
        randomUUID(),
        req.user.id,
        'assistant',
        reply,
        created,
      );
    });
    res.json({ reply });
  });
  const eventPool = async (userId, eventId) => {
    const event = eventDefinitions.find((e) => e.id === eventId);
    if (!event) throw Object.assign(new Error('Tryout tidak ditemukan.'), { status: 404 });
    if (
      !(await db.get(
        'SELECT 1 FROM pahamin.event_enrollments WHERE user_id=$1 AND event_id=$2',
        userId,
        eventId,
      ))
    )
      throw Object.assign(new Error('Daftar tryout gratis ini terlebih dahulu.'), { status: 403 });
    return (await readQuestions(userId)).filter((q) => belongsToEvent(q, event));
  };
  return {
    state,
    preferences,
    stats,
    eventPool,
  };
}
