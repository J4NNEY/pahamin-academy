# Panduan agent Pahamin Academy

Panduan ini berlaku untuk seluruh repository. Instruksi pada `src/AGENTS.md`,
`server/AGENTS.md`, `worker/AGENTS.md`, dan `supabase/AGENTS.md` menambahkan aturan
untuk folder masing-masing. Instruksi pengguna terbaru menentukan scope pekerjaan.

## Mulai dari sini

1. Pastikan root project dan baca `git status --short` serta diff yang relevan.
   Pertahankan pekerjaan pengguna; jangan reset, checkout, atau menghapus perubahan lain.
2. Baca [docs/SPEC.md](docs/SPEC.md) untuk fitur dan batas produk, lalu
   [docs/DESIGN.md](docs/DESIGN.md) sebelum perubahan UI.
3. Baca [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) untuk mencari modul yang tepat,
   [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) untuk menjalankan/verifikasi, dan
   [docs/HANDOFF.md](docs/HANDOFF.md) untuk konteks terakhir.
4. Baca bagian terbaru [docs/VERIFICATION.md](docs/VERIFICATION.md) jika pekerjaan
   bergantung pada hasil uji sebelumnya. Catatan deployment/test lama bukan bukti keadaan saat ini.

## Produk dan keputusan yang harus dipertahankan

- Platform belajar bahasa Indonesia: materi, bank soal, tryout, rencana belajar,
  kelas pribadi, AI Studio, tutor, dan panel admin.
- UI **sederhana**, biru `#3b73c5`, font Nunito, navbar **di atas**.
  Pengguna menolak sidebar navy, hero besar, dekorasi berlebihan, dan teks promosi generik.
  Jangan mengembalikan desain tersebut sebagai perbaikan visual rutin.
- Label UI: **Rencana Belajar**, **Paham AI**, **Latihan cepat**.
  Route internal `#/pegasus` tetap dipakai untuk kompatibilitas.
- Pahamify adalah referensi historis alur awal. Jangan mengejar kesamaan UI lagi,
  mengambil konten premium, atau memakai aset arsip `docs/reference-ui/` dalam runtime.
- Jangan menambahkan pembayaran, OAuth, Supabase Auth, streaming, atau fitur lain
  di luar scope yang diminta hanya karena tercantum sebagai batas produk.

## Stack dan jalur runtime

- Node.js >=24, npm, ESM. Frontend React + TypeScript + Vite; backend Express `.mjs`.
- PostgreSQL Supabase melalui `pg`, schema privat `pahamin`. Auth aplikasi sendiri:
  scrypt, cookie sesi HttpOnly; **bukan Supabase Auth**.
- Cloudflare Worker menjalankan Express dan static assets bersama, dengan Hyperdrive.
  Deploy folder `dist` saja pernah membuat halaman kosong karena `/api/state` menjadi HTML.
- `npm test` memakai PGlite disposable. `npm run dev`, `npm start`, dan `npm run cf:dev`
  memakai database dari konfigurasi; perintah tersebut **bukan** jaminan database sandbox.

## Perintah kerja

| Tujuan                 | Perintah           | Catatan                                        |
| ---------------------- | ------------------ | ---------------------------------------------- |
| Pemeriksaan TypeScript | `npm run check`    | Tanpa server                                   |
| Build frontend         | `npm run build`    | Menulis `dist/`                                |
| Tes backend/kontrak    | `npm test`         | PGlite lokal; tanpa key Gemini nyata           |
| Dev Node + Vite        | `npm run dev`      | API 3001, web 5173, memakai `.env`             |
| Preview build Node     | `npm start`        | Setelah build, UI + API pada 3001              |
| Validasi bundle Worker | `npm run cf:check` | Build + dry run; tidak deploy                  |
| Worker dev             | `npm run cf:dev`   | Port 8787; tetap memakai DB yang dikonfigurasi |

Perintah cloud/database yang mengubah keadaan dijelaskan di
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Jangan menjalankannya sekadar untuk membaca project.
Jika scope/otorisasi sesi sudah mencakup tindakan yang diperlukan, lanjutkan tanpa meminta izin berulang.

## Batas keamanan dan integritas

- Jangan mencetak atau memasukkan `.env`, URI/password DB, key Gemini, cookie,
  token sesi, atau isi `artifacts/.dev.vars` ke chat, log, Git, screenshot, atau bundle.
  Gunakan `.env.example` untuk dokumentasi nama variabel; jangan menimpa `.env` pengguna.
- Jangan memberi awalan `VITE_` pada secret. Jangan mengekspos schema `pahamin`
  lewat Supabase Data API atau melonggarkan TLS/RLS agar tes lewat.
- Semua query memakai parameter. Periksa owner pada API privat dan role di server
  pada API admin. Jangan mengandalkan tombol yang disembunyikan frontend.
- Jangan mengirim kunci/pembahasan soal melalui state siswa sebelum penilaian.
  Pertahankan snapshot soal, deadline server, transaksi, lock, dan konflik revisi.
- Bedakan konten seed, konten pribadi, dan konten admin bersama. Hanya konten admin
  berstatus `published` yang masuk katalog bersama.
- Kegagalan Gemini harus terlihat sebagai error terkontrol, bukan hasil tiruan.
  Jangan mengubah model diam-diam atau menganggap `configured=true` membuktikan provider sehat.
- Gunakan data sintetis untuk QA. Untuk cloud QA, targetkan dan bersihkan hanya fixture
  yang dibuat untuk pengujian itu; jangan menghapus akun/data pengguna lain.

## Verifikasi dan serah terima

- Jalankan pemeriksaan sesuai perubahan. UI: build dan browser pada desktop/ponsel;
  backend: tes relevan; Worker: bundle check; SQL: migrasi dan tes PGlite.
  Perubahan dokumentasi saja cukup diperiksa tautan, path, dan kesesuaian dengan kode.
- Jangan menambah tes untuk perubahan kosmetik yang reversibel atau mengulang seluruh
  pemeriksaan yang sudah lulus tanpa perubahan/kekhawatiran baru.
- Bedakan bukti lokal, browser, Supabase nyata, deploy, dan provider Gemini nyata.
  Jangan menulis klaim keberhasilan yang tidak dijalankan pada pekerjaan saat ini.
- Hentikan server/proses QA yang kamu mulai setelah selesai, kecuali pengguna ingin tetap berjalan.
- Perbarui dokumen yang relevan bila kontrak/keputusan berubah. Catat bukti baru dengan
  konteks di `docs/VERIFICATION.md`; jangan mengganti kegagalan historis dengan klaim sukses baru.
- Jawaban akhir ringkas dalam bahasa Indonesia: perubahan, pemeriksaan, dan batas material.
  Jangan commit/push otomatis kecuali diminta. Tidak ada kewajiban memakai subagent.
