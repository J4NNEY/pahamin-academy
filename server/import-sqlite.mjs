import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { assertSchema } from './database.mjs';

// Identifiers are a fixed allowlist, never read from CLI input or a file.
const definitions = [
  ['users', ['id', 'email', 'name', 'password', 'goal']],
  ['materials', ['id', 'user_id', 'payload']],
  ['questions', ['id', 'user_id', 'payload']],
  ['progress', ['user_id', 'material_id', 'completed_at']],
  ['bookmarks', ['user_id', 'material_id']],
  ['attempts', ['id', 'user_id', 'mode', 'started', 'duration', 'questions', 'answers', 'result']],
  ['study_preferences', ['user_id', 'payload']],
  ['question_bookmarks', ['user_id', 'question_id']],
  ['event_enrollments', ['user_id', 'event_id', 'created']],
  ['event_attempts', ['attempt_id', 'user_id', 'event_id', 'subject']],
  ['live_sessions', ['id', 'user_id', 'payload']],
  ['tutor_messages', ['id', 'user_id', 'role', 'content', 'created']],
];
const jsonColumns = new Set(['payload', 'questions', 'answers', 'result']);

export function readSqliteSnapshot(sourcePath) {
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    source.exec('BEGIN');
    const existing = new Set(
      source
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r) => r.name),
    );
    if (!existing.has('users')) throw new Error('File ini bukan database Pahamin yang didukung.');
    const snapshot = {};
    for (const [table, columns] of definitions) {
      // Preserve the original tutor ordering, including messages with identical timestamps.
      snapshot[table] = existing.has(table)
        ? source.prepare(`SELECT ${columns.join(',')} FROM ${table} ORDER BY rowid`).all()
        : [];
      for (const row of snapshot[table])
        for (const column of columns) {
          if (jsonColumns.has(column) && row[column] !== null) {
            try {
              JSON.parse(row[column]);
            } catch {
              throw new Error(`JSON SQLite tidak valid pada tabel ${table}; impor dibatalkan.`);
            }
          }
        }
    }
    const owners = new Set(snapshot.users.map((row) => row.id));
    for (const [table, rows] of Object.entries(snapshot)) {
      if (table !== 'users' && rows.some((row) => !owners.has(row.user_id)))
        throw new Error(`Data tanpa pemilik ditemukan pada tabel ${table}; impor dibatalkan.`);
    }
    const skippedSessions = existing.has('sessions')
      ? source.prepare('SELECT count(*) AS count FROM sessions').get().count
      : 0;
    source.exec('COMMIT');
    return { snapshot, skippedSessions };
  } finally {
    source.close();
  }
}

export async function importSqlite(db, sourcePath, { apply = false } = {}) {
  await assertSchema(db);
  const { snapshot, skippedSessions } = readSqliteSnapshot(sourcePath);
  const counts = Object.fromEntries(definitions.map(([table]) => [table, snapshot[table].length]));
  const marker =
    'sqlite-import-v1:' + createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  return db.transaction(async (tx) => {
    await tx.get('SELECT pg_advisory_xact_lock(70126001)');
    const prior = await tx.get(
      "SELECT version FROM pahamin.schema_migrations WHERE version LIKE 'sqlite-import-v1:%'",
    );
    if (prior) {
      if (prior.version !== marker)
        throw new Error(
          'Database ini sudah menerima impor SQLite lain. Impor dihentikan agar data tidak tertimpa.',
        );
      return { applied: false, alreadyImported: true, counts, skippedSessions };
    }
    if (apply)
      await tx.query(
        `LOCK TABLE ${definitions.map(([table]) => `pahamin.${table}`).join(',')}, pahamin.sessions IN ACCESS EXCLUSIVE MODE`,
      );
    for (const table of [...definitions.map(([name]) => name), 'sessions']) {
      const row = await tx.get(`SELECT count(*)::integer AS count FROM pahamin.${table}`);
      if (row.count)
        throw new Error(
          `Tujuan belum kosong (${table}). Impor dihentikan; data tujuan tidak diubah.`,
        );
    }
    if (!apply) return { applied: false, dryRun: true, counts, skippedSessions };
    for (const [table, columns] of definitions) {
      for (const row of snapshot[table]) {
        await tx.run(
          `INSERT INTO pahamin.${table} (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`,
          ...columns.map((column) => row[column]),
        );
      }
      const actual = await tx.get(`SELECT count(*)::integer AS count FROM pahamin.${table}`);
      if (actual.count !== counts[table])
        throw new Error(`Jumlah baris ${table} tidak cocok; seluruh impor dibatalkan.`);
    }
    await tx.run('INSERT INTO pahamin.schema_migrations(version) VALUES ($1)', marker);
    return { applied: true, counts, skippedSessions };
  });
}
