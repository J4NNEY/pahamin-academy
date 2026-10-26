import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { connectDatabase, assertSchema } from './database.mjs';
import { z } from 'zod';
import { seedMaterials, seedQuestions } from './seed.mjs';
import {
  subjects,
  curricula,
  importSchema,
  materialSchema,
  parseQuestions,
  gradeQuestions,
} from './validation.mjs';
import { generateWithGemini } from './gemini.mjs';
import { registerFeatures } from './features.mjs';
import { registerAdmin } from './admin.mjs';

const hash = (s) => createHash('sha256').update(s).digest('hex');
const publicQuestion = ({ answer, explanation, ...q }) => q;
export async function createApp({
  database,
  provider = generateWithGemini,
  tutorProvider,
  checkSchema = true,
  serveStatic = true,
  trustCloudflare = false,
} = {}) {
  const db = database || (await connectDatabase());
  try {
    if (checkSchema) await assertSchema(db);
  } catch (error) {
    if (!database) await db.close();
    throw error;
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(async (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin) {
      const allowed = [
        `http://${req.get('host')}`,
        `https://${req.get('host')}`,
        'http://127.0.0.1:5173',
        'http://localhost:5173',
      ];
      if (!allowed.includes(origin))
        return res.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
    }
    next();
  });
  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());
  app.use(async (req, _res, next) => {
    const token = req.cookies.pa_session;
    req.user = token
      ? await db.get(
          'SELECT u.id,u.email,u.name,u.goal,u.role FROM pahamin.users u JOIN pahamin.sessions s ON u.id=s.user_id WHERE s.token=$1 AND s.expires>$2',
          hash(token),
          Date.now(),
        )
      : undefined;
    next();
  });
  const requireUser = async (req, res, next) =>
    req.user
      ? next()
      : res
          .status(401)
          .json({ error: 'Masuk dulu untuk menyimpan progres dan menggunakan fitur ini.' });
  const limits = new Map();
  const limit =
    (name, max, window = 60000) =>
    async (req, res, next) => {
      const now = Date.now(),
        key = `${name}:${req.user?.id || (trustCloudflare && req.get('cf-connecting-ip')) || req.ip}`;
      let entry = limits.get(key);
      if (!entry || now > entry.until) {
        entry = { count: 0, until: now + window };
        limits.set(key, entry);
      }
      if (++entry.count > max)
        return res
          .status(429)
          .json({ error: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' });
      if (limits.size > 2000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
      next();
    };
  const readMaterials = async (userId) => [
    ...seedMaterials.map((m) => ({ ...m, curriculum: 'UTBK' })),
    ...(
      await db.all(
        "SELECT payload FROM pahamin.catalogue WHERE kind='material' AND status='published' ORDER BY created_at,id",
      )
    ).map((r) => r.payload),
    ...(userId
      ? (await db.all('SELECT payload FROM pahamin.materials WHERE user_id=$1', userId)).map(
          (r) => r.payload,
        )
      : []),
  ];
  const readQuestions = async (userId) => [
    ...seedQuestions.map((q) => ({ ...q, curriculum: 'UTBK' })),
    ...(
      await db.all(
        "SELECT payload FROM pahamin.catalogue WHERE kind='question' AND status='published' ORDER BY created_at,id",
      )
    ).map((r) => r.payload),
    ...(userId
      ? (await db.all('SELECT payload FROM pahamin.questions WHERE user_id=$1', userId)).map(
          (r) => r.payload,
        )
      : []),
  ];
  async function session(res, userId) {
    const token = randomBytes(32).toString('hex');
    await db.run('DELETE FROM pahamin.sessions WHERE expires<$1', Date.now());
    await db.run(
      'INSERT INTO pahamin.sessions VALUES ($1,$2,$3)',
      hash(token),
      userId,
      Date.now() + 7 * 86400000,
    );
    res.cookie('pa_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.SECURE_COOKIES === 'true',
      maxAge: 7 * 86400000,
      path: '/',
    });
  }
  app.get('/api/state', async (req, res) => {
    const userId = req.user?.id;
    const [materials, questions, featureState, completed, bookmarks, attempts] = await Promise.all([
      readMaterials(userId),
      readQuestions(userId),
      features.state(userId),
      userId
        ? db.all(
            'SELECT material_id AS id,completed_at AS date FROM pahamin.progress WHERE user_id=$1',
            userId,
          )
        : [],
      userId ? db.all('SELECT material_id FROM pahamin.bookmarks WHERE user_id=$1', userId) : [],
      userId
        ? db.all(
            'SELECT id,mode,started,duration,result FROM pahamin.attempts WHERE user_id=$1 AND result IS NOT NULL ORDER BY started DESC LIMIT 100',
            userId,
          )
        : [],
    ]);
    res.json({
      user: req.user || null,
      ...featureState,
      subjects,
      materials,
      questions: questions.map(publicQuestion),
      completed,
      bookmarks: bookmarks.map((r) => r.material_id),
      attempts,
      ai: {
        configured: !!process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      },
    });
  });
  const credentials = z.object({
    email: z
      .string()
      .trim()
      .email()
      .max(200)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(8).max(128),
  });
  app.post('/api/auth/register', limit('auth', 12, 900000), async (req, res) => {
    const input = credentials.extend({ name: z.string().trim().min(2).max(60) }).parse(req.body);
    if (await db.get('SELECT id FROM pahamin.users WHERE email=$1', input.email))
      return res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan masuk.' });
    const id = randomUUID(),
      salt = randomBytes(16).toString('hex');
    await db.run(
      'INSERT INTO pahamin.users(id,email,name,password) VALUES ($1,$2,$3,$4)',
      id,
      input.email,
      input.name,
      `${salt}:${scryptSync(input.password, salt, 64).toString('hex')}`,
    );
    await session(res, id);
    res.status(201).json({ ok: true });
  });
  app.post('/api/auth/login', limit('auth', 12, 900000), async (req, res) => {
    const input = credentials.parse(req.body),
      user = await db.get('SELECT * FROM pahamin.users WHERE email=$1', input.email);
    const [salt, stored] = (
      user?.password || '00000000000000000000000000000000:' + '00'.repeat(64)
    ).split(':');
    const valid = timingSafeEqual(scryptSync(input.password, salt, 64), Buffer.from(stored, 'hex'));
    if (!user || !valid)
      return res.status(401).json({ error: 'Email atau password belum sesuai.' });
    await session(res, user.id);
    res.json({ ok: true });
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.pa_session)
      await db.run('DELETE FROM pahamin.sessions WHERE token=$1', hash(req.cookies.pa_session));
    res.clearCookie('pa_session', { path: '/' }).json({ ok: true });
  });
  app.patch('/api/profile', requireUser, async (req, res) => {
    const p = z
      .object({ name: z.string().trim().min(2).max(60), goal: z.number().int().min(1).max(10) })
      .parse(req.body);
    await db.run(
      'UPDATE pahamin.users SET name=$1,goal=$2 WHERE id=$3',
      p.name,
      p.goal,
      req.user.id,
    );
    res.json({ ok: true });
  });
  app.post('/api/materials/:id/complete', requireUser, async (req, res) => {
    if (!(await readMaterials(req.user.id)).some((m) => m.id === req.params.id))
      return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    await db.run(
      'INSERT INTO pahamin.progress VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      req.user.id,
      req.params.id,
      new Date().toISOString(),
    );
    res.json({ ok: true });
  });
  app.post('/api/materials/:id/bookmark', requireUser, async (req, res) => {
    if (!(await readMaterials(req.user.id)).some((m) => m.id === req.params.id))
      return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    await db.transaction(async (tx) => {
      await tx.get('SELECT id FROM pahamin.users WHERE id=$1 FOR UPDATE', req.user.id);
      const existing = await tx.get(
        'SELECT 1 FROM pahamin.bookmarks WHERE user_id=$1 AND material_id=$2',
        req.user.id,
        req.params.id,
      );
      if (existing)
        await tx.run(
          'DELETE FROM pahamin.bookmarks WHERE user_id=$1 AND material_id=$2',
          req.user.id,
          req.params.id,
        );
      else await tx.run('INSERT INTO pahamin.bookmarks VALUES ($1,$2)', req.user.id, req.params.id);
    });
    res.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5, fieldSize: 2000 },
  }).single('file');
  const features = registerFeatures({
    app,
    db,
    requireUser,
    limit,
    upload,
    readQuestions,
    readMaterials,
    tutorProvider,
  });
  registerAdmin({ app, db, requireUser, limit });
  app.post('/api/import/preview', requireUser, limit('ai', 8), upload, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Pilih file soal terlebih dahulu.' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let questions;
    if (['.csv', '.json'].includes(ext)) {
      try {
        questions = parseQuestions(req.file.buffer.toString('utf8'), ext);
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    } else {
      const subject = z.enum(subjects).parse(req.body.subject);
      questions = importSchema.parse(
        await provider({ file: req.file, subject, mode: 'questions' }),
      );
    }
    const curriculum = z.enum(curricula).parse(req.body.curriculum || 'UTBK');
    res.json({
      questions: questions.map((q) => ({ ...q, curriculum })),
      source: req.file.originalname,
      ai: !['.csv', '.json'].includes(ext),
    });
  });
  app.post('/api/questions/import', requireUser, async (req, res) => {
    const { questions, source } = z
      .object({ questions: importSchema, source: z.string().max(200) })
      .parse(req.body);
    let count = 0;
    await db.transaction(async (tx) => {
      // Serialize imports for this owner so two previews cannot insert duplicates.
      await tx.get('SELECT id FROM pahamin.users WHERE id=$1 FOR UPDATE', req.user.id);
      const existing = new Set(
        [
          ...seedQuestions,
          ...(
            await tx.all('SELECT payload FROM pahamin.questions WHERE user_id=$1', req.user.id)
          ).map((r) => r.payload),
        ].map((q) => q.question.trim().toLowerCase()),
      );
      for (const q of questions) {
        if (existing.has(q.question.trim().toLowerCase())) continue;
        const id = randomUUID();
        const inserted = await tx.get(
          'INSERT INTO pahamin.questions VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',
          id,
          req.user.id,
          JSON.stringify({ ...q, id, source }),
        );
        existing.add(q.question.trim().toLowerCase());
        if (inserted) count++;
      }
    });
    res.status(201).json({ count, skipped: questions.length - count });
  });
  app.post('/api/ai/generate', requireUser, limit('ai', 8), upload, async (req, res) => {
    const input = z
      .object({ subject: z.enum(subjects), instruction: z.string().max(1000).default('') })
      .parse(req.body);
    const curriculum = z.enum(curricula).parse(req.body.curriculum || 'UTBK');
    const generated = await provider({ ...input, file: req.file });
    const material = materialSchema.parse({
      ...generated,
      curriculum,
      quiz: generated.quiz?.map((q) => ({ ...q, curriculum })),
    });
    res.json({ material, source: req.file.originalname });
  });
  app.post('/api/materials', requireUser, async (req, res) => {
    const { material, source } = z
      .object({ material: materialSchema, source: z.string().max(200) })
      .parse(req.body);
    const id = randomUUID();
    const { quiz, ...content } = material;
    const record = {
      ...content,
      id,
      source: `Gemini · ${source}`,
      createdAt: new Date().toISOString(),
      minutes: Math.max(
        3,
        Math.ceil(content.sections.reduce((n, s) => n + s.content.length, 0) / 900),
      ),
      color: 'mint',
      icon: 'sparkles',
    };
    await db.transaction(async (tx) => {
      await tx.run(
        'INSERT INTO pahamin.materials VALUES ($1,$2,$3)',
        id,
        req.user.id,
        JSON.stringify(record),
      );
      for (const q of quiz) {
        const qid = randomUUID();
        await tx.run(
          'INSERT INTO pahamin.questions VALUES ($1,$2,$3)',
          qid,
          req.user.id,
          JSON.stringify({ ...q, id: qid, source: `Gemini · ${material.title}` }),
        );
      }
    });
    res.status(201).json({ id });
  });
  app.post('/api/practice', requireUser, async (req, res) => {
    const input = z
      .object({
        subject: z.enum([...subjects, 'Semua']).default('Semua'),
        mode: z.enum(['practice', 'tryout']),
        count: z.number().int().min(1).max(30),
        curriculum: z.enum(curricula).optional(),
        topic: z.string().max(120).optional(),
        difficulty: z.enum(['Mudah', 'Sedang', 'Sulit']).optional(),
        adaptive: z.boolean().default(false),
        eventId: z.string().max(50).optional(),
      })
      .parse(req.body);
    if (input.eventId && input.mode !== 'tryout')
      return res.status(400).json({ error: 'Subtes harus memakai mode tryout.' });
    const pool = (
      input.eventId
        ? await features.eventPool(req.user.id, input.eventId)
        : await readQuestions(req.user.id)
    ).filter(
      (q) =>
        (input.subject === 'Semua' || q.subject === input.subject) &&
        (!input.curriculum || (q.curriculum || 'UTBK') === input.curriculum) &&
        (!input.topic || q.topic === input.topic) &&
        (!input.difficulty || q.difficulty === input.difficulty),
    );
    if (!pool.length)
      return res
        .status(400)
        .json({ error: 'Belum ada soal untuk pelajaran ini. Impor soal terlebih dahulu.' });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randomBytes(4).readUInt32LE(0) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (input.adaptive) {
      const recent = (
        await db.all(
          'SELECT result FROM pahamin.attempts WHERE user_id=$1 AND result IS NOT NULL ORDER BY started DESC LIMIT 20',
          req.user.id,
        )
      ).flatMap((a) => a.result.review);
      const last = new Map();
      for (const q of recent) if (!last.has(q.id)) last.set(q.id, q.correct);
      const weight = (q) => (last.get(q.id) === false ? 2 : !last.has(q.id) ? 1 : 0);
      pool.sort((a, b) => weight(b) - weight(a));
    }
    const questions = pool.slice(0, input.count),
      id = randomUUID(),
      started = Date.now(),
      duration = input.mode === 'tryout' ? questions.length * 90 : 0;
    await db.transaction(async (tx) => {
      await tx.run(
        'INSERT INTO pahamin.attempts VALUES ($1,$2,$3,$4,$5,$6,$7,NULL)',
        id,
        req.user.id,
        input.mode,
        started,
        duration,
        JSON.stringify(questions),
        '{}',
      );
      if (input.eventId)
        await tx.run(
          'INSERT INTO pahamin.event_attempts VALUES ($1,$2,$3,$4)',
          id,
          req.user.id,
          input.eventId,
          input.subject,
        );
    });
    res
      .status(201)
      .json({ id, started, duration, mode: input.mode, questions: questions.map(publicQuestion) });
  });
  const findAttempt = async (req) =>
    await db.get(
      'SELECT * FROM pahamin.attempts WHERE id=$1 AND user_id=$2',
      req.params.id,
      req.user.id,
    );
  app.patch('/api/attempts/:id/answers', requireUser, async (req, res) => {
    await db.transaction(async (tx) => {
      const a = await tx.get(
        'SELECT * FROM pahamin.attempts WHERE id=$1 AND user_id=$2 FOR UPDATE',
        req.params.id,
        req.user.id,
      );
      if (!a) throw Object.assign(new Error('Sesi tidak ditemukan.'), { status: 404 });
      if (a.result) throw Object.assign(new Error('Sesi sudah selesai.'), { status: 409 });
      if (a.duration && Date.now() > a.started + a.duration * 1000)
        throw Object.assign(
          new Error('Waktu try out sudah habis. Selesaikan untuk melihat nilai.'),
          { status: 409 },
        );
      const { index, answer } = z
        .object({ index: z.number().int().min(0), answer: z.number().int().min(0).max(4) })
        .parse(req.body);
      const questions = a.questions;
      if (!questions[index] || answer >= questions[index].options.length)
        throw Object.assign(new Error('Pilihan jawaban tidak valid.'), { status: 400 });
      const answers = a.answers;
      answers[index] = answer;
      await tx.run(
        'UPDATE pahamin.attempts SET answers=$1 WHERE id=$2',
        JSON.stringify(answers),
        a.id,
      );
    });
    res.json({ ok: true });
  });
  app.post('/api/attempts/:id/submit', requireUser, async (req, res) => {
    const result = await db.transaction(async (tx) => {
      const a = await tx.get(
        'SELECT * FROM pahamin.attempts WHERE id=$1 AND user_id=$2 FOR UPDATE',
        req.params.id,
        req.user.id,
      );
      if (!a) throw Object.assign(new Error('Sesi tidak ditemukan.'), { status: 404 });
      if (a.result) return a.result;
      const result = {
        ...gradeQuestions(a.questions, a.answers),
        finishedAt: new Date().toISOString(),
      };
      await tx.run(
        'UPDATE pahamin.attempts SET result=$1 WHERE id=$2',
        JSON.stringify(result),
        a.id,
      );
      return result;
    });
    res.json(result);
  });
  app.get('/api/attempts/:id', requireUser, async (req, res) => {
    const a = await findAttempt(req);
    if (!a) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    res.json({
      id: a.id,
      started: a.started,
      duration: a.duration,
      mode: a.mode,
      questions: a.questions.map(publicQuestion),
      answers: a.answers,
      result: a.result ? a.result : null,
    });
  });
  const dist = path.resolve('dist');
  if (serveStatic && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', async (req, res, next) =>
      req.path.startsWith('/api/') ? next() : res.sendFile(path.join(dist, 'index.html')),
    );
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
  app.use((error, _req, res, _next) => {
    if (error.code === '23505')
      return res.status(409).json({ error: 'Data ini sudah tersimpan. Muat ulang dan coba lagi.' });
    if (error.code === '22P02')
      return res.status(400).json({ error: 'ID atau data permintaan belum valid.' });
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: 'Data belum valid: ' + error.issues[0].message });
    if (error instanceof multer.MulterError)
      return res.status(400).json({
        error:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Ukuran file maksimal 10 MB.'
            : 'Unggahan tidak valid. Pilih satu file.',
      });
    if (error.name === 'TimeoutError' || error.name === 'AbortError')
      return res
        .status(504)
        .json({ error: 'Gemini belum selesai merespons. Tunggu sebentar lalu coba kembali.' });
    const status = error.status || 500;
    res.status(status).json({
      error:
        status < 500 || status === 502 || status === 503
          ? error.message
          : 'Server gagal memproses permintaan. Coba lagi.',
    });
  });
  return { app, db };
}
