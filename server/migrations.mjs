import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from './database.mjs';

export const migrationFile = fileURLToPath(
  new URL('../supabase/migrations/202610260001_pahamin.sql', import.meta.url),
);

export async function applyMigrations(db) {
  return db.transaction(async (tx) => {
    await tx.get('SELECT pg_advisory_xact_lock(70126001)');
    const exists = await tx.get("SELECT to_regclass('pahamin.schema_migrations') AS name");
    if (exists.name) {
      const version = await tx.get(
        'SELECT version FROM pahamin.schema_migrations WHERE version=$1',
        SCHEMA_VERSION,
      );
      if (version) return { applied: false, version: SCHEMA_VERSION };
    }
    await tx.query(await fs.readFile(migrationFile, 'utf8'));
    return { applied: true, version: SCHEMA_VERSION };
  });
}
