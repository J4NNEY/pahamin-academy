# Pemetaan Pahamify ke Pahamin Academy

Catatan historis: sasaran kesamaan UI digantikan oleh desain Pahamin sendiri pada 26 Oktober 2026. Lihat [DESIGN.md](DESIGN.md). Aset referensi dipindah ke docs/reference-ui dan tidak digunakan runtime.

Sumber: sesi Chrome yang telah login, 25 Oktober 2026. Observasi UI dipisahkan dari hasil MCP REA. Tidak ada pendaftaran tryout berbayar, pembelian, pengubahan profil, atau akses melewati batas akun yang dilakukan.

## Bukti yang digunakan

- Browser login: Learning, modal kurikulum, Bank Soal dan detail pelajaran, Tryout dan detail subtes, halaman awal Pegasus dan modal Fokus Utama, kalender Live Class. Pembelian mengarah ke pengisian profil; checkout tidak teramati.
- REA `capture_browser_scenario`: `ev_d7d8bc8d6e24c0145b224fc0ab41df14d2c9777898e75a95dffc7736db132a95`, profil sementara tanpa sesi. Mengonfirmasi asset publik, font Nunito, dan pengalihan login. Capture event tidak lengkap, bukan bukti fitur setelah login.
- Bundle publik yang ditemukan pada DOM: `/assets/index-N6G9X2QP.js` (2.096.266 byte), `/assets/index-BZf6_uKo.css`. Disimpan hanya di artifacts untuk analisis, tidak dimasukkan ke aplikasi hasil.
- REA analisis bundle utuh mencapai batas 60 dan 180 detik, partial evidence `ev_2950a5d8511fea870092866ff277841a052c75c1c9d7f3b7c2409848fad8aa40` dan `ev_7bd2fdb1f7906a3bddb84dd416d81574db3501b1e274aa9d6837f616ce4f5d76`. Keduanya tidak menghasilkan temuan semantik yang bisa diklaim.
- Analisis difokuskan ke empat fungsi UI yang diekstrak dengan Babel AST tanpa mengeksekusi bundle. Rentang sumber dan hash dicatat di `artifacts/reference-client/focused/provenance.json`. MCP REA berhasil mem-parsing 4/4 file, mengunjungi 3.084 node AST dan mencatat 25 temuan: parent evidence `ev_8db81ba5cad6fff9446ecec8ec9e571a9bfa6028e94fa3d7c47bec27a802d7df`. Hasil ini adalah subset turunan analis, bukan pemulihan source lengkap. Relasi dinamis dan semantik yang melampaui batas retensi tetap tidak diketahui. Tidak ada route statis lengkap yang teridentifikasi dari subset ini.
- Port CDP yang tersedia berisi sesi login terpisah, sehingga REA tidak diklaim membaca sesi Chrome yang terautentikasi. Layar terautentikasi diperiksa lewat browser UI.

## Perubahan yang dituju

| Referensi teramati                                                         | Implementasi lokal                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Navbar putih, konten tengah sekitar 800 px, warna utama #3b73c5, Nunito    | Layout, skala, warna, dan navigasi mengikuti referensi; identitas tetap Pahamin Academy                         |
| Learning dengan level/EXP, pintasan Pegasus/Bank Soal/Tryout/Sikat Soal    | Progres dihitung dari materi dan jawaban aktual, latihan cepat berfungsi                                        |
| Modal UTBK/UM, SMA Merdeka/K13, SMP                                        | Pilihan kurikulum tersimpan, katalog hanya menampilkan konten yang sesuai                                       |
| Bank Soal per pelajaran, pencarian, riwayat, leaderboard                   | Pelajaran → topik → latihan, impor, bookmark soal, riwayat, peringkat lokal opt-in                              |
| Tryout berlangsung/akan datang, kategori, kode, detail subtes, Tryout Saya | Katalog lokal dengan jumlah soal aktual, daftar gratis, subtes bertimer, kode demo lokal, riwayat               |
| Pegasus: fokus, target jurusan, latihan adaptif, progres                   | Target belajar tersimpan; rekomendasi dan latihan memprioritaskan kelemahan dari hasil aktual                   |
| Tanya MIPI dengan foto soal                                                | Tutor Gemini dengan teks/file dan riwayat percakapan privat                                                     |
| Live Class: minggu, hari, kelas, kartu sesi dan rekaman                    | Kalender jadwal pribadi, pembuatan sesi dan tautan meeting/rekaman milik pengguna                               |
| Pembelian                                                                  | Informasi paket lokal dan status integrasi; transaksi uang tidak disimulasikan sebagai berhasil                 |
| Materi belajar                                                             | Pembaca, rangkuman, kuis, video milik pengguna bila tersedia; tidak menyalin perpustakaan video/soal berlisensi |

## Batas

Kesamaan UI dan alur yang teramati menjadi acuan. Tidak ada klaim backend, IRT, ranking nasional, katalog premium, kelas pengajar Pahamify, pembayaran, atau prediksi peluang jurusan identik. Semua angka aktivitas berasal dari data lokal; kondisi kosong ditampilkan apa adanya. Fitur impor dan AI dari kebutuhan awal tetap dipertahankan. API key .env pengguna tidak diubah atau dicetak.

Katalog Learning UTBK selesai dimuat pada pemeriksaan lanjutan dan menunjukkan 15 label pelajaran. Grid desktop disesuaikan menjadi sembilan kolom. Materi contoh Bahasa Indonesia, Bahasa Inggris dan Matematika tetap dapat ditemukan lewat kelompok Literasi/Penalaran yang sesuai. Bank Soal dan impor mendukung pelajaran tambahan, termasuk geografi, sejarah, ekonomi, sosiologi, dan subtes literasi/penalaran. Ikon publik yang diambil dari DOM disimpan di `public/assets/reference-ui` dengan inventaris sumber `SOURCES.json`; logo Pahamify, bundle aplikasi dan konten premium tidak digunakan dalam aplikasi hasil.
