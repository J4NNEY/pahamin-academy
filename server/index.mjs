import { createApp } from './app.mjs';
let instance;
try {
  instance = await createApp();
} catch (error) {
  console.error(
    error.code
      ? 'Database belum siap. Periksa koneksi dan jalankan npm run db:migrate.'
      : error.message,
  );
  process.exit(1);
}
const { app, db } = instance;
const server = app.listen(Number(process.env.PORT) || 3001, '127.0.0.1', () =>
  console.log(`Pahamin API: http://127.0.0.1:${Number(process.env.PORT) || 3001}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
