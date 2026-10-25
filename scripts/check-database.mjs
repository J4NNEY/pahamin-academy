import { connectDatabase, assertSchema, SCHEMA_VERSION } from '../server/database.mjs';

let db;
try {
  db = await connectDatabase();
  await assertSchema(db);
  const tables = await db.all(
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='pahamin'",
  );
  if (tables.length !== 14 || tables.some((table) => !table.rowsecurity))
    throw new Error('Skema atau RLS database belum lengkap.');
  console.log(
    JSON.stringify({
      connected: true,
      schema: 'pahamin',
      version: SCHEMA_VERSION,
      tables: tables.length,
      rls: true,
    }),
  );
} catch (error) {
  console.error(
    error.code ? 'Pemeriksaan database gagal. Periksa koneksi, izin dan migrasi.' : error.message,
  );
  process.exitCode = 1;
} finally {
  await db?.close();
}
