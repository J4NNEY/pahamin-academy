import { connectDatabase } from '../server/database.mjs';
import { applyMigrations } from '../server/migrations.mjs';

let db;
try {
  db = await connectDatabase();
  const result = await applyMigrations(db);
  console.log(
    result.applied
      ? `Migrasi ${result.version} berhasil diterapkan.`
      : `Skema ${result.version} sudah terbaru.`,
  );
} catch (error) {
  console.error(
    error.code
      ? `Migrasi gagal (kode ${error.code}). Periksa koneksi, izin database owner dan skema pahamin.`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await db?.close();
}
