import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from './database.mjs';

export const migrationFile = fileURLToPath(
  new URL('../supabase/migrations/202610260001_pahamin.sql', import.meta.url),
);
const migrations = [
  ['202610260001_pahamin', migrationFile],
  [
    SCHEMA_VERSION,
    fileURLToPath(new URL('../supabase/migrations/202610260002_admin.sql', import.meta.url)),
  ],
];

export async function applyMigrations(db) {
  return db.transaction(async (tx) => {
    await tx.get('SELECT pg_advisory_xact_lock(70126001)');
    const exists = await tx.get("SELECT to_regclass('pahamin.schema_migrations') AS name");
    let applied = false;
    for (const [version, file] of migrations) {
      const done =
        exists.name || applied
          ? await tx.get('SELECT version FROM pahamin.schema_migrations WHERE version=$1', version)
          : undefined;
      if (done) continue;
      await tx.query(await fs.readFile(file, 'utf8'));
      applied = true;
    }
    return { applied, version: SCHEMA_VERSION };
  });
}
