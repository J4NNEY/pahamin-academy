import { connectDatabase } from '../server/database.mjs';
import { setAdminAccess } from '../server/admin-access.mjs';

let db;
try {
  const [email, role = 'admin', ...extra] = process.argv.slice(2);
  if (!email || extra.length || !['admin', 'student'].includes(role))
    throw new Error('Gunakan: npm run admin:grant -- email@contoh.com [admin|student]');
  db = await connectDatabase();
  const user = await setAdminAccess(db, email, role);
  console.log(`Akses ${user.role} berhasil dipasang untuk ${user.email}. Muat ulang aplikasi.`);
} catch (error) {
  console.error(error.code ? 'Perubahan akses gagal. Periksa koneksi dan migrasi.' : error.message);
  process.exitCode = 1;
} finally {
  await db?.close();
}
