import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { materialSchema, questionSchema, importSchema } from './validation.mjs';

// A lesson can be authored independently; questions are managed in the question bank.
export const adminMaterialSchema = materialSchema.omit({ quiz: true });
const statusSchema = z.enum(['draft', 'published', 'archived']);
const revisionSchema = z.number().int().positive();
const error = (status, message) => Object.assign(new Error(message), { status });
const entry = (row) => ({
  id: row.id,
  kind: row.kind,
  status: row.status,
  payload: row.payload,
  revision: row.revision,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export function materialRecord(content, id) {
  return {
    ...content,
    id,
    source: 'Pahamin Academy',
    origin: 'academy',
    createdAt: new Date().toISOString(),
    minutes: Math.max(
      3,
      Math.ceil(content.sections.reduce((n, s) => n + s.content.length, 0) / 900),
    ),
    color: 'mint',
    icon: 'book',
  };
}

export function registerAdmin({ app, db, requireUser, limit }) {
  const requireAdmin = (req, res, next) =>
    req.user.role === 'admin'
      ? next()
      : res.status(403).json({ error: 'Halaman ini hanya untuk admin.' });
  app.use('/api/admin', requireUser, requireAdmin, limit('admin', 120));
  app.get('/api/admin/content', async (_req, res) => {
    const rows = await db.all('SELECT * FROM pahamin.catalogue ORDER BY updated_at DESC, id');
    res.json({ entries: rows.map(entry) });
  });
  app.post('/api/admin/materials/from-ai', async (req, res) => {
    const { material } = z.object({ material: materialSchema }).parse(req.body);
    const id = randomUUID();
    const { quiz, ...content } = material;
    await db.transaction(async (tx) => {
      await tx.run(
        "INSERT INTO pahamin.catalogue(id,kind,payload,created_by,updated_by) VALUES ($1,'material',$2,$3,$3)",
        id,
        JSON.stringify(materialRecord(content, id)),
        req.user.id,
      );
      for (const q of quiz) {
        const qid = randomUUID();
        await tx.run(
          "INSERT INTO pahamin.catalogue(id,kind,payload,created_by,updated_by) VALUES ($1,'question',$2,$3,$3)",
          qid,
          JSON.stringify({ ...q, id: qid, source: 'Pahamin Academy', origin: 'academy' }),
          req.user.id,
        );
      }
    });
    res.status(201).json({ id, questions: quiz.length });
  });
  app.post('/api/admin/content/status', async (req, res) => {
    const { items, status } = z
      .object({
        items: z
          .array(z.object({ id: z.uuid(), revision: revisionSchema }))
          .min(1)
          .max(200),
        status: statusSchema,
      })
      .parse(req.body);
    if (new Set(items.map((i) => i.id)).size !== items.length)
      throw error(400, 'Pilihan konten mengandung duplikat.');
    await db.transaction(async (tx) => {
      // Lock in deterministic order to avoid deadlocks between batch edits.
      for (const item of items.sort((a, b) => a.id.localeCompare(b.id))) {
        const row = await tx.get(
          'UPDATE pahamin.catalogue SET status=$1,revision=revision+1,updated_by=$2,updated_at=now() WHERE id=$3 AND revision=$4 RETURNING id',
          status,
          req.user.id,
          item.id,
          item.revision,
        );
        if (!row)
          throw error(
            409,
            'Salah satu konten sudah berubah. Muat ulang daftar; seluruh perubahan dibatalkan.',
          );
      }
    });
    res.json({ count: items.length });
  });
  for (const [route, kind, schema] of [
    ['materials', 'material', adminMaterialSchema],
    ['questions', 'question', questionSchema],
  ]) {
    const bodySchema = z.object({
      content: schema,
      status: z.enum(['draft', 'published']).default('draft'),
    });
    app.post(`/api/admin/${route}`, async (req, res) => {
      const input = bodySchema.parse(req.body);
      const id = randomUUID();
      const payload =
        kind === 'material'
          ? materialRecord(input.content, id)
          : { ...input.content, id, source: 'Pahamin Academy', origin: 'academy' };
      const row = await db.get(
        'INSERT INTO pahamin.catalogue(id,kind,status,payload,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$5) RETURNING *',
        id,
        kind,
        input.status,
        JSON.stringify(payload),
        req.user.id,
      );
      res.status(201).json(entry(row));
    });
    app.put(`/api/admin/${route}/:id`, async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      const { content, status, revision } = bodySchema
        .extend({ revision: revisionSchema })
        .parse(req.body);
      const row = await db.transaction(async (tx) => {
        const previous = await tx.get(
          'SELECT * FROM pahamin.catalogue WHERE id=$1 AND kind=$2 FOR UPDATE',
          id,
          kind,
        );
        if (!previous) throw error(404, 'Konten tidak ditemukan.');
        if (previous.revision !== revision || previous.status === 'archived')
          throw error(409, 'Konten sudah berubah. Muat ulang daftar sebelum mengedit lagi.');
        const payload =
          kind === 'material'
            ? { ...materialRecord(content, id), createdAt: previous.payload.createdAt }
            : { ...content, id, source: 'Pahamin Academy', origin: 'academy' };
        return tx.get(
          'UPDATE pahamin.catalogue SET payload=$1,status=$2,revision=revision+1,updated_by=$3,updated_at=now() WHERE id=$4 RETURNING *',
          JSON.stringify(payload),
          status,
          req.user.id,
          id,
        );
      });
      res.json(entry(row));
    });
  }
  app.patch('/api/admin/content/:id/status', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const { status, revision } = z
      .object({ status: statusSchema, revision: revisionSchema })
      .parse(req.body);
    const row = await db.get(
      'UPDATE pahamin.catalogue SET status=$1,revision=revision+1,updated_by=$2,updated_at=now() WHERE id=$3 AND revision=$4 RETURNING *',
      status,
      req.user.id,
      id,
      revision,
    );
    if (!row) throw error(409, 'Konten sudah berubah atau tidak ditemukan. Muat ulang daftar.');
    res.json(entry(row));
  });
  app.post('/api/admin/questions/import', async (req, res) => {
    const { questions } = z.object({ questions: importSchema }).parse(req.body);
    let count = 0;
    await db.transaction(async (tx) => {
      // Serialize editorial imports across all admins, including duplicates within a file.
      await tx.get('SELECT pg_advisory_xact_lock(70126002)');
      const existing = new Set(
        (
          await tx.all(
            "SELECT payload FROM pahamin.catalogue WHERE kind='question' AND status<>'archived'",
          )
        ).map(
          (r) =>
            `${r.payload.curriculum}:${r.payload.subject}:${r.payload.question.trim().toLowerCase()}`,
        ),
      );
      for (const content of questions) {
        const key = `${content.curriculum}:${content.subject}:${content.question.trim().toLowerCase()}`;
        if (existing.has(key)) continue;
        const id = randomUUID();
        await tx.run(
          "INSERT INTO pahamin.catalogue(id,kind,payload,created_by,updated_by) VALUES ($1,'question',$2,$3,$3)",
          id,
          JSON.stringify({ ...content, id, source: 'Pahamin Academy', origin: 'academy' }),
          req.user.id,
        );
        existing.add(key);
        count++;
      }
    });
    res.status(201).json({ count, skipped: questions.length - count });
  });
}
