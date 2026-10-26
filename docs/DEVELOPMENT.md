# Panduan pengembangan dan verifikasi

Mulai dengan [../AGENTS.md](../AGENTS.md), [SPEC.md](SPEC.md), dan [DESIGN.md](DESIGN.md).
Gunakan root repository sebagai working directory; jangan mengandalkan path Windows
milik pembuat project pada checkout lain.

## Persiapan

1. Periksa `git status --short` dan diff sebelum mengedit. Jangan menimpa pekerjaan lain.
2. Gunakan Node.js >=24 dan lockfile npm project. `npm ci` memasang dependency sesuai lock.
3. Salin `.env.example` hanya jika `.env` belum ada. Jangan mencetak `.env` atau menimpanya.
4. Baca efek samping perintah sebelum menjalankan server/migrasi. `.env` dapat menunjuk
   Supabase nyata; istilah dev/local hanya menjelaskan lokasi proses, bukan isolasi data.

| Variabel              | Tujuan                           | Batas                                                           |
| --------------------- | -------------------------------- | --------------------------------------------------------------- |
| `SUPABASE_DB_URL`     | URI PostgreSQL untuk Node/script | Server saja; bukan anon key/project URL                         |
| `SUPABASE_DB_CA_FILE` | CA TLS Node                      | Sertifikat publik; verifikasi tetap aktif                       |
| `SUPABASE_DB_SSL`     | Pengecualian TLS lokal           | `false` hanya untuk PostgreSQL loopback                         |
| `GEMINI_API_KEY`      | Provider Gemini                  | Rahasia backend; jangan `VITE_...`                              |
| `GEMINI_MODEL`        | Model provider                   | Pertahankan konfigurasi; contoh bukan jaminan akses             |
| `PORT`                | Port Node                        | Default 3001                                                    |
| `SECURE_COOKIES`      | Cookie HTTPS                     | `true` untuk produksi; helper HTTP Worker lokal memakai `false` |

Jangan menambah isi secret ke screenshot, fixture, command line, log provider, atau Git.
`certs/prod-supabase.cer` adalah CA publik, bukan private key. Provenance di
`certs/README.md`.

## Pilih cara menjalankan

### Node dengan konfigurasi pengguna

```powershell
npm run dev
```

Vite: `http://127.0.0.1:5173`, API: `http://127.0.0.1:3001`.
Untuk memeriksa build tanpa Vite: `npm run build`, lalu `npm start`; UI/API sama-sama 3001.
Schema harus siap. Jangan menjadikan `db:migrate` atau promosi admin bagian startup otomatis.

### Preview UI disposable tanpa Supabase

Build lebih dahulu. Jika hanya butuh menguji tampilan, buat file sementara
`artifacts/ui-preview.mjs` dengan isi berikut, lalu jalankan `node artifacts/ui-preview.mjs`:

```js
import { createApp } from '../server/app.mjs';
import { createTestDatabase } from '../tests/helpers/database.mjs';

const db = await createTestDatabase();
const { app } = await createApp({ database: db });
const server = app.listen(3001, '127.0.0.1', () => {
  console.log('Preview disposable: http://127.0.0.1:3001');
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
}
```

Jalankan tanpa `--env-file` jika tidak memerlukan provider nyata dan pastikan key provider
tidak diwarisi dari environment shell. PGlite di sini adalah
fixture eksplisit untuk preview, bukan fallback aplikasi. Semua akun/data pada instance
tersebut hilang saat dihentikan. Jika membutuhkan fixture admin, ubah role melalui DB
yang diinjeksi pada script QA itu; jangan memakai `admin:grant` yang membaca `.env` nyata.
Jangan mengandalkan script di `artifacts/` dari sesi sebelumnya: folder itu tidak di-version-control.

### Runtime Worker lokal

```powershell
npm run cf:check
npm run cf:dev
```

`cf:check` membangun frontend dan dry-run bundle Worker, bukan deploy.
`cf:dev` menggunakan helper Hyperdrive lokal di port 8787; tetap mengakses database `.env`.
Helper membuat config sementara serta `artifacts/.dev.vars` yang **berisi secret** dan harus
tetap ignored. Lihat [CLOUDFLARE.md](CLOUDFLARE.md) untuk detail tunnel/TLS.

## Pilih verifikasi sesuai perubahan

| Perubahan                   | Pemeriksaan                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Dokumentasi/instruksi agent | Cocokkan kode, periksa path/link/perintah dan diff; tidak perlu deploy                 |
| Type/komponen/CSS           | `npm run build`; browser pada view terkait, desktop dan 320px; menu/fokus/overflow     |
| API/auth/ownership/grade    | `npm test` atau file relevan; guest, owner, akun lain, input gagal                     |
| Admin                       | `tests/admin.test.mjs`; role, draf/publikasi, konflik revisi, rollback batch, snapshot |
| SQL/adapter/importer        | Tes PGlite, upgrade dan replay, rollback, TLS config, role client ditolak              |
| Parser/kontrak Gemini       | `tests/gemini.test.mjs` dan tes relevan; provider terkontrol sebelum layanan nyata     |
| Worker/routing              | `npm run cf:check`; periksa HTML homepage dan JSON API pada runtime yang diuji         |

Contoh tes terarah: `node --test tests/admin.test.mjs`.
Suite penuh: `npm test`. `npm run check` hanya TypeScript; belum ada script lint di package.json.
Tidak perlu membuat tes yang hanya mencerminkan warna/markup untuk perubahan kosmetik reversibel.
Setelah checks relevan lulus, ulangi hanya bila ada perubahan, kegagalan, atau kekhawatiran baru.

Jika sandbox Windows menghalangi child process Vite/test runner (`spawn EPERM`), gunakan
mekanisme approval tool yang tersedia. Jangan mengganti implementasi atau mematikan
pengecekan agar masalah lingkungan tampak sebagai hasil tes berhasil.

## Perintah yang menyentuh target nyata

Tabel ini menjelaskan dampak, bukan permintaan persetujuan baru. Ikuti scope dan otorisasi
pengguna di sesi yang sedang berjalan; jangan mengulang permintaan izin yang sudah jelas.

| Perintah                                          | Dampak                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run db:check`                                | Membaca target DB `.env`; bukan tes disposable                       |
| `npm run db:migrate`                              | Menerapkan SQL belum tercatat ke target `.env`                       |
| `npm run db:import-sqlite`                        | Pratinjau/read target dan sumber; memerlukan DB, tidak menyalin akun |
| `npm run db:import-sqlite -- --apply`             | Menulis impor ke target kosong; lihat SUPABASE.md                    |
| `npm run admin:grant -- email@contoh.com`         | Mengubah akun yang tepat menjadi admin pada target `.env`            |
| `npm run admin:grant -- email@contoh.com student` | Mencabut akses admin pada target yang sama                           |
| `npm run deploy`                                  | Build dan menerbitkan Worker/assets ke Cloudflare                    |
| Wrangler secret/Hyperdrive commands               | Mengubah konfigurasi/secret akun cloud yang dipilih                  |

Sebelum mutasi, pastikan target dan identitas fixture/akun sesuai tugas tanpa mencetak
credentials. Perubahan lokal yang perlu ditinjau harus siap lebih dahulu. Jangan melakukan
migrasi/deploy/promosi role hanya karena pernah dilakukan pada task sebelumnya.

Sesudah deploy yang memang diminta: periksa `/`, `/api/state`, dan endpoint/alur yang berubah.
`/api/state` harus JSON, API tidak dikenal JSON 404. Tes provider nyata terpisah dari deploy;
`configured=true` tidak menjamin key, kuota, atau PDF tertentu berhasil diproses.

## Menutup pekerjaan

- Simpan bukti UI/hasil QA nonrahasia di `artifacts/`; jangan masukkan raw file pengguna.
  Gunakan input sintetis sebelum mengirim file pribadi ke provider sesuai otorisasi tugas.
- Bersihkan hanya fixture yang dibuat sendiri, dengan ID/filter tepat. Hindari pembersihan
  global atau hard delete konten pengguna.
- Hentikan server dan proses yang kamu mulai, kecuali pengguna meminta tetap berjalan.
- Perbarui docs terkait kontrak/keputusan. Tambahkan bukti baru ke VERIFICATION dengan
  lingkungan, hasil, dan hal yang belum diuji; jangan mengklaim cloud dari PGlite.
- Periksa `git diff --check` serta status akhir. Jangan menjalankan recursive delete/move
  atas path hitungan di Windows sebelum memverifikasi target absolut di dalam workspace.
- Jangan commit/push atau membuat release di luar scope. Hasil akhir harus menjelaskan
  perubahan dan bukti saat ini secara ringkas, bukan hanya menyatakan akan melanjutkan.
