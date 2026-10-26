# Identitas visual Pahamin

Arahan terbaru pengguna pada 26 Oktober 2026: versi sidebar terasa terlalu berlebihan.
Kembalikan nuansa UI sebelumnya yang ringan, dan tempatkan navbar di atas seperti awal.
Arahan ini menggantikan desain workspace navy/sidebar pada iterasi sebelumnya.

- Warna utama biru #3b73c5, latar #f2f7fb, kartu putih, font Nunito.
- Navbar atas berisi Belajar, Live, Rencana, Tryout, Bank Soal, dan AI Studio.
  Pada ponsel, logo/akun berada di baris pertama, enam menu tetap terlihat di baris kedua.
- Menu lainnya menampung materi, koleksi, riwayat, latihan cepat, tutor, akses belajar,
  pengaturan, dan panel admin untuk akun admin. Modal memakai kontrol fokus yang sudah ada.
- Konten berpusat dengan lebar maksimal 900px. Halaman belajar dimulai dari sapaan singkat,
  target harian untuk pengguna yang sudah masuk, pintasan fitur, lalu katalog materi.
- Banner navy, sidebar, ilustrasi dekoratif, lingkaran progres, kartu statistik besar,
  slogan promosi, dan kartu iklan AI dihapus dari halaman belajar.
- Materi yang belum diselesaikan disajikan sebagai daftar ringkas setelah katalog.
  AI Studio cukup mendapat satu tautan dengan penjelasan singkat.
- Target harian dihitung dari data penyelesaian pada tanggal WIB, bukan angka buatan.
  Sesi latihan yang belum selesai tetap dapat dilanjutkan dari halaman belajar.
- Ikon Lucide dan identitas nama Rencana Belajar/Paham AI tetap digunakan. Aset lama
  tetap di arsip docs/reference-ui dan tidak dipakai pada UI atau deployment.
- Data, role admin, route internal, bookmark, dan kontrak API tetap kompatibel.

Workspace.tsx mengelola navbar/menu. Dashboard.tsx hanya menampilkan ringkasan dan
materi pilihan. Learning.tsx mempertahankan pencarian, kurikulum, dan pembaca materi.
Styling tambahan disimpan di src/pahamin.css setelah stylesheet fitur.

Tidak menambah animasi atau efek visual baru. Menu/modal mempunyai overscroll containment;
navbar tetap dalam alur baca yang sesuai dengan layout desktop maupun ponsel.
