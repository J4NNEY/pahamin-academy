# Pahamin Academy

Implementasi lokal platform belajar berbahasa Indonesia yang mengikuti UI dan alur Pahamify yang dapat diamati. Identitas produk, akun, materi, soal dan backend tetap Pahamin Academy. Ikon UI publik yang teramati disimpan lokal dengan sumber di `public/assets/reference-ui/SOURCES.json`.

## Bukti referensi

Pada iterasi awal 25 Oktober 2026, REA dengan profil sementara hanya mencapai login. Setelah tersedia sesi Chrome yang sudah masuk, UI Learning, kurikulum, Bank Soal, Tryout/subtes, Pegasus dan Live Class diperiksa langsung. UI memakai Nunito, warna utama #3b73c5, navigasi atas dan lebar konten sekitar 800 px. Analisis MCP REA serta batas buktinya dicatat di [PAHAMIFY-PARITY.md](PAHAMIFY-PARITY.md).

REA pada bundle publik utuh mencapai deadline; analisis subset empat fungsi UI yang tercatat rentangnya berhasil. Tidak ada klaim backend atau source lengkap Pahamify berhasil dipulihkan.

## Fitur

- Dashboard responsif, kategori subjek, pencarian, target harian, progres aktual.
- Akun email/password dengan sesi cookie HttpOnly, PostgreSQL Supabase melalui backend Express, data terpisah per pengguna. Skema dan proses pemindahan SQLite ada di [SUPABASE.md](SUPABASE.md).
- Materi contoh orisinal, bookmark, penyelesaian materi, koleksi dan riwayat.
- Bank soal, latihan langsung dan try out dengan timer, penilaian server, pembahasan, riwayat skor.
- Impor CSV/JSON tanpa AI; PDF/DOCX/TXT/MD dengan ekstraksi Gemini. Semua hasil masuk pratinjau sebelum disimpan.
- AI Studio menerima PDF, DOCX, TXT, MD, PNG, JPEG; menghasilkan ringkasan, bagian materi, poin penting, dan kuis. Hasil draf ditinjau sebelum disimpan.
- API key Gemini hanya dibaca server dari .env; status konfigurasi terlihat di UI.
- Navbar dan Learning mengikuti referensi, termasuk level/EXP dari progres aktual, pintasan, kurikulum UTBK/UM/SMA/SMP, katalog pelajaran, dan bookmark.
- Bank Soal pelajaran → topik → soal, filter kurikulum/kesulitan, bookmark soal dan leaderboard lokal opt-in.
- Tryout per kategori dengan pendaftaran gratis lokal, kode demo, subtes, Tryout Saya, dan pemulihan sesi dari server.
- Pegasus menyimpan fokus, kampus/jurusan, dan waktu belajar. Latihan adaptif memprioritaskan soal yang terakhir salah lalu soal yang belum pernah dikerjakan.
- Tutor Tanya Mipi menerima teks atau file/foto, menggunakan Gemini dan menyimpan riwayat percakapan privat.
- Live Class mempunyai kalender minggu/hari, jadwal pribadi, tautan meeting, dan rekaman yang dapat ditambahkan pengguna.
- Materi mempunyai tab Video/Rangkuman/Kuis. Video HTTPS atau YouTube milik pengguna dapat ditambahkan pada draf materi AI.

## Batas

Aplikasi lokal dengan backend nyata, belum dideploy publik. Tidak menyertakan perpustakaan video/soal premium Pahamify, layanan pengajar/streaming, gateway pembayaran, ranking nasional, IRT, prediksi kelulusan jurusan, OAuth, verifikasi email atau reset password email. Halaman Pembelian menampilkan akses gratis lokal dan konfigurasi Gemini tanpa memalsukan transaksi berhasil. Soal dan materi bawaan ditandai contoh. Panggilan Gemini nyata memerlukan key dan jaringan; kegagalan tidak diganti hasil palsu. File diolah dalam memori, maksimal 10 MB, tanpa penyimpanan file mentah. Teks maksimal 150.000 karakter; impor maksimal 200 soal per batch. Ikon publik referensi disajikan sebagai gambar, bukan bundle JavaScript Pahamify.
