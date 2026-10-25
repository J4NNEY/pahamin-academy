# Verifikasi implementasi terbaru

Pemeriksaan akhir 26 Oktober 2026, lingkungan Windows lokal. Observasi UI referensi dan pengujian alur utama dilakukan 25–26 Oktober 2026.

## Perubahan database ke Supabase — 26 Oktober 2026

- Runtime Express telah dipindahkan dari SQLite ke PostgreSQL Supabase melalui pool `pg`, query async berparameter, dan schema privat `pahamin`. Tidak ada fallback SQLite saat koneksi tidak tersedia.
- `npm test`: **31 pengujian lulus** pada PostgreSQL WASM/PGlite. Seluruh 24 pengujian sebelumnya berjalan kembali dengan database PostgreSQL; tambahan mencakup TLS, transaksi satu client, RLS/grants, rollback, migrasi ulang, pemindahan SQLite dan password lama, penolakan tujuan berisi/orphan, rollback penuh impor gagal, serta penyimpanan jawaban/submit bersamaan.
- `npm run build`: TypeScript dan build produksi berhasil setelah perubahan database.
- Skema produksi yang sama diterapkan pada database test. Ke-14 tabel mengaktifkan RLS; role `anon`, `authenticated`, dan `service_role` ditolak ketika mencoba membaca tabel akun secara langsung.
- `.env` hanya ditambahi kolom `SUPABASE_DB_URL` bila belum ada. Nilai Gemini yang lama tidak diubah atau dicetak.
- Pada tahap persiapan, `db:check` berhenti karena URI belum diisi. Setelah pengguna mengisi `.env`, koneksi cloud dan alur HTTP diverifikasi sebagaimana catatan di bawah.
- UI tidak diubah pada perpindahan database. Bukti browser di bawah berasal dari pemeriksaan sebelum perubahan database; bukan bukti browser yang terhubung ke Supabase cloud.

Langkah konfigurasi dan perintah migrasi: [SUPABASE.md](SUPABASE.md).

## Supabase cloud dan aplikasi berjalan — 26 Oktober 2026

- URI pengguna berhasil terhubung melalui session pooler. Kendala awal `SELF_SIGNED_CERT_IN_CHAIN` diatasi dengan CA publik Supabase, bukan dengan menonaktifkan verifikasi sertifikat atau hostname. Path `SUPABASE_DB_CA_FILE=./certs/prod-supabase.cer` ditambahkan ke `.env`; URI/password database dan key Gemini tidak dicetak atau diganti.
- `npm run db:migrate` berhasil menerapkan `202610260001_pahamin` ke project yang dikonfigurasi. `npm run db:check` mengonfirmasi `connected=true`, schema `pahamin`, 14 tabel, dan RLS aktif.
- `npm run dev` berhasil menyalakan frontend di `http://127.0.0.1:5173` dan API di `http://127.0.0.1:3001`. Keduanya mengembalikan HTTP 200.
- Smoke HTTP terhadap Supabase nyata memakai akun QA sementara: register → simpan preferensi → impor satu soal → logout → login ulang → baca kembali preferensi/soal → latihan → simpan jawaban → submit dengan hasil 100. Penyimpanan satu soal juga dibaca ulang langsung dari PostgreSQL untuk pemilik fixture tersebut.
- Akun QA dan seluruh data turunannya dihapus setelah pemeriksaan, melalui filter email/nama fixture yang tepat dan foreign key cascade. Tidak ada data pengguna lain yang diubah.
- Ini membuktikan alur server ke Supabase cloud melalui HTTP, bukan pemeriksaan browser interaktif terhadap cloud. Tidak ada panggilan Gemini baru, deployment publik, atau migrasi data SQLite lama pada pemeriksaan ini.
- CA dan provenance publik tercatat di `certs/README.md`. Sertifikat ini bukan secret.

## Pemeriksaan UI dan fitur sebelum perpindahan database

- `npm run build`: TypeScript dan bundle produksi Vite berhasil.
- `npm test`: 24 pengujian lulus. Meliputi akun/sesi, isolasi data, origin asing, CSV/JSON, validasi file/kunci/jumlah soal, pratinjau dan konfirmasi impor, duplikat, penyimpanan draf AI dan kuis, penilaian server, tenggat tryout, filter kurikulum/topik, latihan adaptif, preferensi target yang tidak mereset kolom lain, pendaftaran subtes, kode lokal, leaderboard opt-in, kepemilikan jadwal kelas, privasi tutor, serta respons provider yang tidak valid/429/503.
- Browser produksi: Learning, Live, Pegasus, Tryout, Bank Soal, Pembelian dan AI Studio dibuka melalui navbar dan menampilkan konten halaman yang sesuai.
- Setelah verifikasi, akun fixture `QA Parity` beserta data pengujiannya dihapus dengan pencocokan email/nama yang tepat; server pengujian dihentikan.
- Learning: kelompok Penalaran Matematika menemukan materi Matematika; pembaca dan tab Video/Rangkuman/Kuis terbuka. Video yang belum ditambahkan ditampilkan sebagai kondisi kosong.
- Pegasus: target kampus/jurusan dan 60 menit belajar per hari tersimpan dan tampil kembali.
- Bank Soal: pelajaran → topik → soal, bookmark, serta latihan dua soal terfilter berhasil. Dua jawaban benar menghasilkan 100/100 beserta pembahasan.
- Tryout: pendaftaran gratis lokal berhasil. Subtes Penalaran Umum memulai timer 3 menit; satu jawaban tetap tersimpan setelah reload dan timer melanjutkan sisa waktu. Hasil subtes dua jawaban benar menjadi 100/100.
- Live Class: jadwal QA dapat dibuat dan diedit. Perbaikan pengisian tanggal telah diverifikasi: kalender berpindah ke 26 Oktober pukul 16.00 WIB; filter rekaman menampilkan sesi yang memiliki tautan rekaman.
- Ikon dan katalog terbaru diperiksa pada hasil build produksi dengan MCP REA. Ketiga capture lengkap dan tidak merekam event page-error dalam jendela pengamatan:
  - Desktop 1440 × 1100: `ev_9df9b3a1e6ce61cb31efda5e33bed871a24f87f1fb8ddf291f12104f7334df6f`.
  - Ponsel 390 × 844: `ev_ca78fbc1130a8b20d611241c0620adc2b3e54d8b71f95b64548017d68a8811c7`.
  - Ponsel kecil 320 × 740: `ev_06ca3277218be89d79abb9f928c2cdb95785ad9a3fe2f8819273896292a8ddf8`.

Screenshot terbaru:

- `artifacts/screenshots/pahamin-learning-desktop.png`
- `artifacts/screenshots/pahamin-learning-mobile-390.png`
- `artifacts/screenshots/pahamin-learning-mobile-320.png`

## Pengujian Gemini nyata pada iterasi awal

- Key yang tersedia dibaca hanya oleh server dan tidak dicetak atau diubah.
- Pembacaan metadata model `gemini-3.8-flash` dari Google berhasil dengan HTTP 200 dan metode `generateContent` tersedia.
- Generasi dengan file contoh fungsi kuadrat benar-benar dicoba. Google mengembalikan HTTP 503 `UNAVAILABLE`: model sedang mengalami permintaan tinggi. Percobaan akhir juga menerima kondisi tersebut.
- Pesan aplikasi diperbaiki agar menyebut model sedang sibuk dan tidak menyarankan mengubah file untuk masalah layanan ini. Penanganan tersebut diuji pada adapter materi dan tutor.
- Pada iterasi awal ini, generasi konten nyata yang berhasil belum terverifikasi. Verifikasi setelah perbaikan AI dicatat di bawah. Aplikasi tidak mengganti kegagalan dengan materi palsu.

## Perbaikan AI Studio — 26 Oktober 2026

- Konfigurasi pengguna kini memakai `gemini-3.6-flash`; key dan model tidak diubah. Metadata model, generasi teks minimal, dan structured output minimal berhasil dengan HTTP 200. Request materi lama bisa direproduksi sebagai HTTP 400 `INVALID_ARGUMENT` bahkan dengan input teks kecil. Menghapus `temperature` saja masih menghasilkan HTTP 400.
- Grammar output Gemini kini dipisahkan dari skema penyimpanan aplikasi. Metadata kurikulum/URL video, default, serta pengulangan enum besar tidak dikirim ke grammar provider. Field hasil materi/soal tetap divalidasi dengan skema Zod aplikasi sebelum menjadi draf atau disimpan. Tidak ada fallback konten tiruan.
- Parameter `temperature` dihapus dari materi dan tutor sesuai kompatibilitas model terbaru. Error HTTP 400, key, kuota, PDF terenkripsi, batas konteks, model, overload dan gangguan provider dibedakan dengan pesan terkontrol; payload error mentah/key tidak diteruskan ke pengguna.
- HTTP 503 mendapat satu retry setelah satu detik dengan deadline permintaan yang sama, maksimal 90 detik. HTTP 400 tidak diulang otomatis. UI menjelaskan satu retry ketika model sibuk, dan timeout tidak lagi otomatis menyalahkan ukuran file.
- Uji nyata PDF contoh orisinal 6.300.998 byte: panggilan pertama HTTP 503, retry HTTP 200; menghasilkan 3 bagian dan 5 soal Bahasa Indonesia, lolos validasi aplikasi, dalam sekitar 37 detik. Pengujian ini menggunakan PDF buatan sendiri, bukan dokumen pengguna.
- Setelah persetujuan eksplisit pengguna, PDF yang sama seperti screenshot (6.173.986 byte) diuji melalui multipart `/api/ai/generate` dengan akun QA Supabase sementara. Percobaan awal dan satu pengujian akhir masing-masing menerima HTTP 503 pada panggilan pertama serta retry (empat respons 503 total). API mengembalikan pesan model sibuk yang baru. Data kedua akun QA dihapus dan server sementara dihentikan. Generasi berhasil pada PDF asli belum terverifikasi karena layanan provider tetap menolak sementara.
- Inspeksi lokal menemukan PDF asli berupa 22 halaman dengan hanya 76 karakter teks yang dapat diekstrak, tanpa halaman berisi teks yang memadai. Jalur teks tidak digunakan karena akan membuang isi scan; dokumen tetap diproses secara multimodal. Parser percobaan dilepas dari dependency karena tidak dipakai runtime.
- `npm test`: 35 tes lulus, termasuk klasifikasi error tanpa kebocoran payload, retry terbatas dan abort, grammar provider, serta penolakan indeks kunci yang tidak tersedia. `npm run build` lulus setelah perubahan frontend.

Referensi teknis: [structured output dan batas kompleksitas grammar](https://ai.google.dev/gemini-api/docs/structured-output), [kompatibilitas parameter dan retry Gemini](https://ai.google.dev/gemini-api/docs/troubleshooting).

## Batas bukti dan layanan

- Upload file melalui otomasi ekstensi Chrome masih terbatas oleh izin file URLs. Multipart CSV/JSON, pratinjau, dan penyimpanan diuji melalui API; upload browser end-to-end tidak diklaim lulus.
- Hasil mengikuti UI dan alur yang teramati, tanpa klaim kesamaan backend, perhitungan IRT, ranking nasional, atau katalog konten premium Pahamify. Rincian sumber dan batas REA ada di [PAHAMIFY-PARITY.md](PAHAMIFY-PARITY.md).
- Pembayaran belum memakai gateway. Live Class memakai jadwal dan tautan pengguna, tanpa layanan streaming/pengajar terintegrasi. Enam materi dan 16 soal bawaan adalah contoh orisinal.
- Belum dilakukan deployment publik, tes beban, pengujian perangkat fisik, atau verifikasi layanan email/OAuth.
