# Pahamin Academy

Platform belajar lokal dengan UI biru/Nunito dan alur yang mengikuti referensi Pahamify: Learning, Live Class, Pegasus, Tryout, Bank Soal, Pembelian, AI Studio, dan Tanya Mipi.

## Menjalankan

Butuh Node.js 24 atau lebih baru.

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Isi SUPABASE_DB_URL di .env dan GEMINI_API_KEY jika ingin menggunakan AI.
npm run db:migrate
npm run db:check
# Opsional: pindahkan data SQLite lama sebelum membuat akun baru (lihat docs/SUPABASE.md).
npm run dev
```

Buka http://127.0.0.1:5173. API berjalan pada port 3001. Daftar akun melalui tombol **Masuk** di kanan atas. Materi contoh dapat dilihat tanpa akun; progres, impor, latihan dan AI membutuhkan akun. `.env` yang sudah ada dipertahankan.

```dotenv
GEMINI_API_KEY=key_dari_google_ai_studio
GEMINI_MODEL=gemini-3.8-flash
```

Ambil key dari [Google AI Studio](https://aistudio.google.com/apikey). Jangan beri awalan `VITE_` pada secret. Restart server setelah mengganti `.env`. Model bisa diganti sesuai akses proyek Gemini. Integrasi menggunakan [Gemini generateContent REST](https://ai.google.dev/api/generate-content) dan structured JSON output. API key tidak dikirim ke frontend. Pengaturan hanya menampilkan keberadaan key, bukan validitas atau kuota.

## Admin

Panel admin dapat menambah/edit materi dan soal, mengimpor soal, membuat draf dari file dengan Gemini,
dan menerbitkan konten untuk semua siswa. Setelah akun terdaftar, aktifkan melalui
`npm run admin:grant -- email@contoh.com`, lalu buka menu akun **Panel Admin** atau `/#/admin`.
Jalankan `npm run db:migrate` terlebih dahulu. Panduan lengkap: [ADMIN.md](docs/ADMIN.md).

## Impor soal

1. Masuk, pilih **Bank soal → Impor soal**.
2. Unduh template CSV/JSON dari dialog. CSV/JSON tidak memakai Gemini.
3. Unggah file, tinjau soal, edit opsi/pembahasan atau kunci, lalu simpan. Duplikat berdasarkan teks soal dilewati.
4. PDF/DOCX/TXT/MD memakai ekstraksi Gemini. Kunci yang disimpulkan AI harus diperiksa.

Kolom CSV: `subject,topic,difficulty,question,option_a,option_b,option_c,option_d,option_e,answer,explanation`. `option_e` opsional. Kunci CSV A–E atau 0–4; JSON selalu angka 0–4.

Subjek mengikuti daftar pilihan pelajaran di aplikasi, termasuk Matematika, Bahasa Indonesia/Inggris, Fisika, Kimia, Biologi, pelajaran sosial, serta subtes UTBK. Kesulitan: Mudah, Sedang, Sulit. Maksimal 200 soal per impor. File maksimal 10 MB. Pilih kurikulum di Bank Soal sebelum mengimpor; soal akan diberi kurikulum tersebut. Kolom `curriculum` pada JSON/CSV didukung, dan pilihan pada dialog impor berlaku untuk batch itu.

## Materi dari file

Pilih **AI Studio**, unggah PDF/DOCX/TXT/MD/PNG/JPG, pilih pelajaran dan arahan opsional. Saat tombol proses ditekan, isi file dikirim ke Google Gemini. Materi, rangkuman, poin penting, dan kuis masuk draf yang dapat diedit. Kurikulum serta tautan video HTTPS/YouTube milikmu juga dapat ditambahkan pada draf. Tombol simpan menambahkan materi dan soal kuis secara atomik ke akunmu. File asli tidak disimpan; hanya hasil yang disetujui tersimpan di Supabase. DOCX dibaca sebagai teks, sedangkan PDF/gambar dikirim secara multimodal.

## Alur belajar

- **Learning:** pilih kurikulum, pelajaran, lalu materi. Bookmark dan tandai dipahami untuk menyimpan progres serta EXP aktual.
- **Bank Soal:** pelajaran → topik → latihan. Riwayat dan bookmark soal tersedia. Leaderboard hanya menampilkan pengguna server lokal yang memilih ikut, berdasarkan hasil tujuh hari terakhir.
- **Tryout:** pilih kategori, daftar gratis, lalu kerjakan subtes. `Tryout Saya` memuat paket terdaftar, sesi belum selesai, dan hasil. Timer mengikuti waktu server, termasuk setelah reload. Kode demo lokal: `PAHAMIN-UTBK`.
- **Pegasus:** tentukan fokus dan target kampus/jurusan. Rekomendasi mengikuti akurasi aktual; latihan adaptif mendahulukan soal yang terakhir salah lalu soal yang belum pernah dikerjakan. Ini bukan prediksi skor UTBK atau peluang masuk jurusan.
- **Tanya Mipi:** buka dari Learning/Pegasus untuk bertanya lewat teks atau melampirkan file/foto. Riwayat privat tersimpan per akun. Tidak ada respons AI tiruan pada aplikasi.
- **Live Class:** tambah jadwal pribadi dalam WIB, pilih minggu/hari/kelas, lalu buka tautan meeting atau rekaman yang kamu tambahkan. Pengajar/streaming eksternal belum terintegrasi.
- **Pembelian:** akses gratis lokal dan informasi konfigurasi Gemini. Gateway pembayaran serta produk berbayar belum aktif.

## Penyimpanan dan verifikasi

Data disimpan di PostgreSQL Supabase pada schema privat `pahamin`, melalui backend Express. Isi `SUPABASE_DB_URL` di `.env`, jalankan `npm run db:migrate` lalu `npm run db:check` sebelum memulai server. Panduan koneksi, TLS, akses tabel, dan pemindahan data SQLite lama tersedia di [docs/SUPABASE.md](docs/SUPABASE.md). Password tetap menggunakan scrypt + salt acak; cookie sesi HttpOnly/SameSite Strict. Data personal dibatasi berdasarkan pemilik. Tryout menyimpan snapshot soal, memeriksa tenggat di server, dan menghitung skor dari jawaban yang tersimpan. Runtime tidak memakai SQLite sebagai fallback.

```powershell
npm test
npm run build
npm start
```

Setelah build, server Node menyajikan UI dan API di http://127.0.0.1:3001. Default bind hanya loopback untuk penggunaan lokal. Untuk Cloudflare Workers, gunakan `npm run deploy`, yang menerbitkan frontend dan API bersama; detail binding database dan secret ada di [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md). `npm run cf:check` memeriksa bundle tanpa publikasi, dan `npm run cf:dev` menguji runtime Worker lokal. HTTPS, backup, pemulihan/verifikasi akun, dan kuota tetap perlu disesuaikan untuk operasional publik.

## Referensi dan batas verifikasi

Sesi Chrome yang sudah masuk digunakan untuk memeriksa UI referensi. MCP REA menangkap frontend publik dan menganalisis subset empat fungsi UI setelah analisis bundle utuh mencapai deadline. Hasil ini mengikuti tampilan serta alur yang teramati, tanpa klaim backend atau layanan berbayar identik. Materi dan soal contoh dibuat sendiri. Ikon publik referensi memiliki inventaris sumber di [SOURCES.json](public/assets/reference-ui/SOURCES.json). Detail pemetaan ada di [docs/PAHAMIFY-PARITY.md](docs/PAHAMIFY-PARITY.md) dan lingkup di [docs/SPEC.md](docs/SPEC.md).

Tanpa API key, fitur AI menampilkan status belum terhubung. Pengujian otomatis integrasi Gemini memakai respons tiruan hanya di test, bukan fallback aplikasi. Status pengujian layanan nyata dan batas verifikasi terbaru dicatat di [docs/VERIFICATION.md](docs/VERIFICATION.md).
