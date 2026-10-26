# Arsitektur project

Dokumen ini menjelaskan implementasi repository, bukan klaim fitur milik platform lain.
Untuk scope produk baca [SPEC.md](SPEC.md); untuk bekerja sebagai agent baca
[../AGENTS.md](../AGENTS.md).

## Dua entrypoint, satu API

| Lingkungan | Entry                                              | Frontend                             | Database               |
| ---------- | -------------------------------------------------- | ------------------------------------ | ---------------------- |
| Dev Node   | `server/index.mjs`                                 | Vite 5173, proxy `/api` ke 3001      | `pg` membaca `.env`    |
| Build Node | `server/index.mjs`                                 | Express menyajikan `dist/` pada 3001 | `pg` membaca `.env`    |
| Cloudflare | `worker/index.mjs`                                 | Binding `ASSETS` untuk `dist/`       | Hyperdrive ke Supabase |
| Tes        | `createApp({ database, provider, tutorProvider })` | Kontrak HTTP, bukan render browser   | PGlite disposable      |

`server/app.mjs` membangun Express tanpa membuka port sendiri. `createApp()` dapat
melewati static serving atau pemeriksaan schema saat diperlukan adapter Worker.
Worker tetap memeriksa schema dalam konteks setiap request. Tidak ada API Supabase
langsung dari browser, ORM, Supabase Auth, atau database fallback runtime.

## Peta file

| Area          | File                                                     | Tanggung jawab                                               |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| Bootstrap     | `src/main.tsx`, `src/ErrorBoundary.tsx`                  | Mount React, CSS, pemulihan render error                     |
| Orkestrasi UI | `src/App.tsx`, `src/types.ts`                            | State, hash route, actions, dialog auth/quiz/materi          |
| HTTP client   | `src/api.ts`                                             | `/api`, cookie same-origin, validasi JSON/startup state      |
| Navigasi      | `src/Workspace.tsx`                                      | Navbar atas dan menu tambahan; tidak lagi sidebar            |
| Beranda       | `src/Dashboard.tsx`                                      | Ringkasan singkat, target WIB, pintasan, materi pilihan      |
| Materi        | `src/Learning.tsx`, `src/catalogue.ts`                   | Kurikulum, pencarian, reader, bookmark, koleksi/riwayat      |
| Latihan       | `src/TestCenter.tsx`, `src/Quiz.tsx`                     | Bank soal, tryout, latihan cepat, jawaban dan review         |
| AI/file       | `src/Studio.tsx`                                         | Unggah, pratinjau, penyuntingan hasil, simpan personal/admin |
| Personal      | `src/Personal.tsx`, `src/Account.tsx`                    | Rencana belajar, tutor, akses gratis, profil/login           |
| Kelas         | `src/Live.tsx`                                           | Kalender dan tautan sesi pribadi                             |
| Editorial     | `src/Admin.tsx`, `src/admin.css`                         | Materi/soal admin, revisi, status, impor/publikasi batch     |
| Komponen      | `src/ui.tsx`, `src/AcademyArt.tsx`, `src/Artwork.tsx`    | Modal, input, ikon dan SVG project                           |
| Tema          | `src/features.css`, `src/academy.css`, `src/pahamin.css` | Style fitur, fondasi lama, penyesuaian UI sederhana          |
| API inti      | `server/app.mjs`                                         | Middleware, sesi, materi/impor, latihan, grading, error      |
| API tambahan  | `server/features.mjs`                                    | Preferensi, bookmark soal, tryout, leaderboard, kelas, tutor |
| API admin     | `server/admin.mjs`, `server/admin-access.mjs`            | Editorial bersama dan perubahan role operator                |
| Database      | `server/database.mjs`, `server/migrations.mjs`           | Adapter async SQL, pool/TLS, transaksi, versi schema         |
| Validasi      | `server/validation.mjs`                                  | Subjects/curricula, Zod, CSV/JSON, penilaian                 |
| Gemini        | `server/gemini*.mjs`, `server/tutor.mjs`                 | File parts, REST, grammar, validasi, retry/error             |
| Seed          | `server/seed.mjs`                                        | Contoh orisinal; tidak dimasukkan sebagai data akun          |
| Migrasi       | `supabase/migrations/`                                   | SQL versi schema `pahamin`                                   |
| Operasional   | `scripts/`, `wrangler.jsonc`, `worker/index.mjs`         | Migrasi, import lama, role, Worker lokal/deploy              |
| Tes           | `tests/*.test.mjs`, `tests/helpers/database.mjs`         | HTTP, akses, transaksi, migrasi, provider terkontrol         |

Route UI ditentukan oleh union `Page` pada `src/types.ts` dan hash di `App.tsx`.
`home`/`materials` memakai komponen Learning; `pegasus` menampilkan Rencana Belajar;
`tutor` menampilkan Paham AI. Jangan mengganti hash lama hanya karena label berubah.

## State dan alur request

1. React membaca `GET /api/state` melalui `api.ts`.
2. Middleware membaca cookie `pa_session`, melakukan hash, lalu mencocokkan sesi yang
   belum kedaluwarsa. User/role diambil dari database pada setiap request.
3. State berisi katalog yang boleh dibaca, progres dan preferensi pemilik, sesi aktif,
   riwayat, jadwal, dan status keberadaan key AI. Tamu mendapat `user: null`.
4. Aksi UI memakai API server; aksi bersama umumnya menyegarkan state setelah sukses.
   Perubahan katalog dari tab/pengguna lain memerlukan refresh, belum ada realtime subscription.
5. HTML fallback, JSON rusak, dan startup state tidak lengkap ditolak oleh client.
   Error startup tetap menampilkan pemulihan, bukan dianggap state kosong yang valid.

Tidak ada client-side router framework; tidak perlu memigrasikan routing untuk menambah
satu view. State backend bukan sumber data tiruan untuk membuat layar tampak terisi.

## Tiga sumber materi dan soal

| Sumber            | Penyimpanan                              | Pembaca                      | Penyunting                        |
| ----------------- | ---------------------------------------- | ---------------------------- | --------------------------------- |
| Contoh            | `server/seed.mjs`                        | Tamu dan pengguna            | Perubahan source dalam scope task |
| Personal          | `pahamin.materials`, `pahamin.questions` | Pemilik akun                 | Alur simpan/impor pribadi         |
| Editorial bersama | `pahamin.catalogue`                      | Semua hanya jika `published` | API admin                         |

`readMaterials`/`readQuestions` menggabungkan seed, catalogue terbit, dan data personal
pemilik. Draf/arsip editorial hanya masuk endpoint admin, tidak ikut state siswa,
termasuk ketika pengguna tersebut admin. Payload soal publik menghilangkan kunci dan
pembahasan. Admin dapat membaca kunci pada endpoint editorial yang berizin.

Materi manual admin dapat dibuat tanpa kuis. Simpan hasil AI admin memasukkan materi
dan soal kuis sebagai entri draf terpisah dalam satu transaksi. Materi personal AI
juga memisahkan soal kuis dari payload materi saat penyimpanan. Kuis reader memilih
soal dengan pelajaran, kurikulum, dan topik materi tersebut.

## Batas API penting

| Keluarga endpoint                         | Akses/perilaku                                                       |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `/api/state`                              | State publik + personal sesuai sesi; tidak berisi secret/key jawaban |
| `/api/auth/register`, `/login`, `/logout` | Akun/sesi aplikasi; registrasi selalu siswa                          |
| `/api/profile`                            | PATCH nama/target pengguna aktif; bukan perubahan role               |
| `/api/import/preview`                     | Login; pratinjau CSV/JSON atau ekstraksi AI; belum menyimpan         |
| `/api/questions/import`, `/api/materials` | Login; simpan ke koleksi pribadi                                     |
| `/api/ai/generate`                        | Login; file menghasilkan draf tervalidasi; belum dipublikasikan      |
| `/api/practice`, `/api/attempts/:id/*`    | Login, owner filter, snapshot dan penilaian server                   |
| `/api/study/preferences`, bookmark        | Login; data akun sendiri                                             |
| `/api/tryouts/*`                          | Pendaftaran dan subtes contoh, hasil akun sendiri                    |
| `/api/live-sessions`                      | Jadwal/link pribadi, bukan streaming kelas eksternal                 |
| `/api/tutor`                              | Login; riwayat privat, provider dipanggil backend                    |
| `/api/leaderboard`                        | Login; partisipasi opt-in dan hasil latihan aktual                   |
| `/api/admin/*`                            | Login + role admin server, termasuk endpoint simpan/import/status    |

Lihat file route untuk method/body lengkap. `GET /api/admin/content` mengembalikan
entri editorial dengan revisi. POST membuat, PUT memperbarui materi/soal dengan revisi,
PATCH status memindahkan draf/terbit/arsip. `POST /api/admin/content/status` memperbarui
batch secara atomik. Impor admin melewati duplikat dalam kurikulum/pelajaran yang sama.

## Integritas latihan dan editorial

- Sesi latihan menyimpan snapshot soal lengkap di server. Edit/arsip konten asal
  tidak mengubah jawaban benar pada sesi yang sudah dimulai.
- Jawaban diperiksa indeks dan opsinya, disimpan dengan row lock. Submit menilai
  dari snapshot/jawaban tersimpan dan dapat mengembalikan hasil yang sudah ada.
- Tenggat tryout diperiksa server. Nilai yang dikirim client tidak dipercaya.
- Update editorial membutuhkan nomor revisi; versi lama ditolak 409. Konflik satu
  item membatalkan seluruh batch. Arsip dapat dipulihkan; tidak ada hard delete UI.

## Data dan akses

Schema saat panduan ini dibuat: `202610260002_admin`, 15 tabel. Verifikasi nilai
sebenarnya di `SCHEMA_VERSION` dan SQL ketika mengubah database.

| Tabel/kelompok                                | Isi                                                          |
| --------------------------------------------- | ------------------------------------------------------------ |
| `schema_migrations`                           | Versi yang sudah diterapkan                                  |
| `users`, `sessions`                           | Akun/role/password hash dan session token hash/expiry        |
| `materials`, `questions`                      | Konten personal dengan `user_id` dan payload JSONB           |
| `catalogue`                                   | Kind, status, payload, revision, pembuat/pengubah, timestamp |
| `progress`, `bookmarks`, `question_bookmarks` | Penyelesaian dan bookmark per pengguna                       |
| `attempts`                                    | Mode, waktu, snapshot soal, jawaban dan hasil                |
| `study_preferences`                           | Preferensi JSONB per akun                                    |
| `event_enrollments`, `event_attempts`         | Pendaftaran tryout dan kaitan subtes                         |
| `live_sessions`                               | Jadwal/link milik pengguna                                   |
| `tutor_messages`                              | Pesan privat berurutan                                       |

RLS aktif dan hak client dicabut. Server memakai koneksi database owner, sehingga
owner/role filter di API tetap wajib. Raw uploads tidak disimpan ke Supabase Storage.
SQLite hanya sumber importer satu kali, bukan runtime. Detail ada di [SUPABASE.md](SUPABASE.md).

## Gemini

Backend memanggil REST `generateContent` memakai key server. `GEMINI_MODEL` dapat
berbeda antara `.env` lokal dan Worker Secrets. Default kode/contoh bukan bukti model
tersebut tersedia bagi akun pengguna; jangan mengganti model tanpa pemeriksaan relevan.

File maksimal 10 MB; teks maksimal 150.000 karakter; impor maksimal 200 soal.
PDF/gambar dikirim multimodal, DOCX diekstrak menjadi teks. Grammar keluaran provider
yang ringan disimpan terpisah dari schema aplikasi; hasil tetap diperiksa Zod penuh.
Timeout 90 detik; overload 503 diulang satu kali setelah 1 detik dengan deadline sama.
Jangan menyimpulkan error 503 berarti ukuran file melampaui batas.

Hasil pratinjau perlu ditinjau sebelum simpan. Tes provider memakai fetch/provider
terkontrol; tidak ada fallback materi/jawaban tiruan pada aplikasi. Riwayat verifikasi
layanan nyata ada di [VERIFICATION.md](VERIFICATION.md).

## Perbedaan Worker

Non-API diteruskan ke `ASSETS`; API melewati Express. Handler Express boleh diinisialisasi
sekali, tetapi SQL hidup di pool/request context terpisah. Hyperdrive mengelola TLS origin,
bukan browser. `cf-connecting-ip` hanya dipercaya pada jalur Worker yang dikonfigurasi.
Rate limiter `Map` bersifat lokal pada proses/isolate; ini bukan quota global terdistribusi.
Detail konfigurasi dan blank-page regression ada di [CLOUDFLARE.md](CLOUDFLARE.md).
