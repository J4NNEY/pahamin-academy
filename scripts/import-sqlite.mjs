import path from 'node:path';
import { connectDatabase } from '../server/database.mjs';
import { importSqlite } from '../server/import-sqlite.mjs';

const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const source = sourceIndex >= 0 ? args[sourceIndex + 1] : 'data/academy.sqlite';
let db;
try {
  if (!source || source.startsWith('--')) throw new Error('Isi path file setelah --source.');
  db = await connectDatabase();
  console.log(
    JSON.stringify(
      await importSqlite(db, path.resolve(source), { apply: args.includes('--apply') }),
      null,
      2,
    ),
  );
  if (!args.includes('--apply'))
    console.log('Pratinjau saja. Tambahkan --apply untuk memindahkan data ke tujuan kosong.');
} catch (error) {
  console.error(
    error.code
      ? `Impor dibatalkan (kode ${error.code}); perubahan tujuan di-rollback dan SQLite asli tetap utuh.`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await db?.close();
}
