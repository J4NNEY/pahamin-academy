import { z } from 'zod';
import { assertSchema } from './database.mjs';

export async function setAdminAccess(db, email, role = 'admin') {
  const input = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .transform((s) => s.toLowerCase()),
      role: z.enum(['admin', 'student']),
    })
    .parse({ email, role });
  await assertSchema(db);
  const user = await db.get(
    'UPDATE pahamin.users SET role=$1 WHERE email=$2 RETURNING id,email,role',
    input.role,
    input.email,
  );
  if (!user) throw new Error('Akun belum terdaftar. Daftar melalui aplikasi terlebih dahulu.');
  return user;
}
