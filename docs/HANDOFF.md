# Serah terima agent

Snapshot dokumentasi: **26 Oktober 2026, Asia/Jakarta**. Baca instruksi pengguna
terbaru dan status Git sebelum melanjutkan. Dokumen ini bukan daftar tindakan cloud
yang harus diulang dan bukan jaminan layanan masih dalam keadaan yang sama.

## Keputusan pengguna yang berlaku

1. Supabase dipakai untuk database; auth aplikasi tetap email/password dan sesi sendiri.
2. Admin dapat menambah/edit materi dan soal, impor, membuat draf AI, serta menerbitkan
   konten untuk seluruh siswa. Data pribadi siswa tetap terpisah.
3. Warna biru dipertahankan. Desain sidebar navy/dashboard dekoratif ditolak sebagai
   berlebihan. UI sekarang ringan, Nunito, **navbar di atas seperti versi awal**.
4. Jangan mengembalikan sasaran UI identik Pahamify. Label baru Rencana Belajar dan
   Paham AI tetap dipakai; hash `#/pegasus` tetap kompatibel.
5. Server QA dihentikan setelah pekerjaan selesai kecuali diminta tetap berjalan.

Detail permanen ada di [DESIGN.md](DESIGN.md), [SPEC.md](SPEC.md), dan [ADMIN.md](ADMIN.md).

## Baseline yang ditemukan saat menulis panduan

| Area                         | Bukti di repository/catatan terakhir                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Git                          | HEAD awal pekerjaan dokumentasi `d1f8cd8` (`Update: Perubahan pada design ui`); working tree awal bersih |
| Schema source                | `SCHEMA_VERSION = 202610260002_admin`; dua file migrasi; 15 tabel                                        |
| Tes terakhir tercatat        | 47 tes lulus pada iterasi admin/desain; iterasi navbar terakhir tidak mengulang suite backend            |
| UI terakhir tercatat         | Build lulus; browser desktop dan 320px, menu/Escape, AI Studio, login fixture, akses admin               |
| Worker terakhir tercatat     | `9bf0d3bd-e006-4443-8a81-3d54fa7b7819`                                                                   |
| URL publik                   | `https://pahamin-academy.muhammadzanni28.workers.dev`                                                    |
| API publik terakhir tercatat | Homepage/state HTTP 200; 6 materi dan 16 soal contoh                                                     |

Sumber bukti: bagian terbaru [VERIFICATION.md](VERIFICATION.md). Versi Worker, jumlah
data, hasil tes, role akun, dan status provider dapat berubah. Tabel ini tidak berasal
dari pemeriksaan cloud baru pada pekerjaan dokumentasi. Verifikasi kembali bila tugas
memerlukan keadaan saat ini. Commit baseline juga bukan instruksi untuk reset checkout.

`artifacts/` memuat screenshot/hasil QA di mesin yang membuatnya, tetapi ignored dan
tidak dijamin ada di clone lain. Jangan mengubah data atau deploy hanya untuk membuat
ulang bukti historis yang tidak diperlukan tugas.

## Masalah historis yang jangan diulang

- **Blank page Cloudflare:** static assets terbit tanpa Express; `/api/state` mendapat
  HTML SPA 200. Sekarang Worker mengutamakan API, client memvalidasi JSON dan punya
  error boundary. Jangan menghapus guard atau menganggap HTTP 200 saja cukup.
- **TLS Supabase:** Node memerlukan CA publik agar issuer dapat diverifikasi. Jangan
  memakai `rejectUnauthorized: false`. Worker memakai Hyperdrive dengan TLS origin
  terverifikasi, bukan koneksi origin tanpa TLS.
- **Gemini schema:** schema aplikasi penuh pernah ditolak provider 400. Grammar ringan
  terpisah sudah digunakan; hasil tetap divalidasi penuh di aplikasi.
- **PDF/Gemini:** PDF sintetis besar pernah berhasil, tetapi PDF scan nyata yang diuji
  masih mendapat 503 setelah retry. Ini belum membuktikan masalah semua PDF selesai.
  Jangan mengarang hasil berhasil, mengganti model diam-diam, atau menyalahkan ukuran
  file tanpa bukti. Lihat riwayat AI pada VERIFICATION.
- **Aset referensi:** berada di `docs/reference-ui/` untuk arsip, bukan `public/`.
- **Nama source lama:** `Workspace.tsx` sekarang navbar atas dan fungsi `Pegasus` masih
  nama internal Rencana Belajar; keduanya bukan alasan merombak fitur/route.

## Yang belum diimplementasikan

Pembayaran/produk berbayar, Supabase Auth/OAuth, verifikasi dan reset password email,
pengajar/streaming eksternal, ranking nasional/IRT/prediksi masuk kampus, penyimpanan
raw upload, realtime subscription katalog, dan riwayat lengkap versi editorial.
Ini adalah batas produk, **bukan backlog yang otomatis boleh dikerjakan**.

Tidak ada pekerjaan implementasi tertunda yang diwajibkan oleh permintaan dokumentasi
ini. Agent selanjutnya mengikuti tugas baru pengguna. Jangan menebak fitur berikutnya.

## Bentuk handoff berikutnya

Catat secara ringkas: permintaan pengguna, file/kontrak yang berubah, pemeriksaan yang
benar-benar dijalankan beserta lingkungan, perubahan cloud bila ada, batas yang belum
teruji, dan proses lokal yang masih hidup. Perbarui snapshot hanya dengan bukti baru;
hasil lama yang pernah gagal tetap menjadi catatan historis.
