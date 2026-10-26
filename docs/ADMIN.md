# Panel admin

Panel tersedia di `/#/admin` dan menu akun **Panel Admin** untuk akun dengan role `admin`.
Login menggunakan akun email/password Pahamin yang sama, bukan akun Supabase Auth.

## Mengaktifkan admin

1. Jalankan `npm run db:migrate` memakai koneksi owner di `.env`.
2. Daftarkan akun melalui aplikasi jika belum ada.
3. Jalankan `npm run admin:grant -- email@contoh.com` di terminal project.
4. Muat ulang aplikasi. Menu Panel Admin muncul setelah role dibaca ulang dari server.

Untuk mencabut akses: `npm run admin:grant -- email@contoh.com student`.
Perubahan berlaku pada permintaan berikutnya, termasuk sesi yang sudah login. Tidak ada
password admin bawaan, promosi otomatis saat registrasi, atau endpoint promosi role publik.

## Materi dan soal

- **Tambah materi**: pelajaran, kurikulum, topik, judul, ringkasan, hingga 12 bagian Markdown,
  poin penting, dan video HTTPS opsional. Pratinjau teks tersedia di editor.
- **Tambah soal**: pelajaran, kurikulum, topik, kesulitan, 4–5 pilihan, kunci, dan pembahasan.
- **Dari file (AI)**: gunakan alur Gemini yang sudah ada. Materi dan kuis hasil tinjauan
  disimpan atomik sebagai draf admin. Soal kuis muncul terpisah pada tab Soal.
- **Impor soal**: CSV/JSON tanpa AI atau PDF/DOCX/TXT/MD dengan Gemini. Periksa pratinjau,
  lalu simpan maksimal 200 soal sebagai draf. Duplikat dalam kurikulum dan pelajaran sama
  dilewati pada impor. File mentah tidak disimpan.
- **Terbitkan**: konten tersedia untuk tamu dan seluruh siswa di katalog/Bank Soal.
  Filter kurikulum dan pelajaran siswa tetap berlaku. Pilihan batch maksimal 200 konten.
- **Tarik ke draf**: konten hilang dari katalog siswa sampai diterbitkan lagi.
- **Arsipkan**: konten tidak tampil bagi siswa; dapat dipulihkan sebagai draf melalui filter Arsip.

Tambahkan soal dengan pelajaran, kurikulum, dan topik materi yang sesuai agar tombol kuis
materi menggunakan soal yang relevan. Materi manual dapat dibuat tanpa soal terlebih dahulu.
Siswa perlu memuat ulang halaman untuk memperoleh perubahan katalog terbaru.

## Data dan akses

Migrasi `202610260002_admin.sql` menambahkan `users.role` (default `student`) dan tabel
`pahamin.catalogue`. Semua konten editorial dipisahkan dari koleksi pribadi siswa dan
materi contoh bawaan; panel tidak mengedit materi contoh atau membaca perpustakaan pribadi
pengguna lain. Akun lama tetap siswa, password/progres tidak diubah.

Seluruh `/api/admin/*` memerlukan sesi aktif dan role admin yang dibaca dari database pada
setiap permintaan. RLS dan pencabutan hak Data API tetap berlaku; akses konten melalui server.
Jawaban/pembahasan soal tidak dikirim ke katalog siswa sebelum penilaian. Sesi latihan
menyimpan snapshot, sehingga pengeditan/pengarsipan soal tidak mengubah nilai sesi yang sudah dimulai.

Editor memakai nomor revisi; penyimpanan versi lama ditolak dengan 409. Publikasi batch
dibatalkan seluruhnya jika satu revisi sudah berubah. `created_by`, `updated_by`, dan waktu
perubahan dicatat, tetapi belum ada riwayat lengkap setiap versi atau alur persetujuan multi-admin.

Tidak ada panggilan Gemini nyata pada pengujian fitur admin; pengujian memakai hasil draf
terkontrol. Ketersediaan model, kuota, dan pemrosesan PDF tetap bergantung pada Gemini.
