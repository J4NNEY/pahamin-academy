# Database Supabase

Backend Express sekarang menyimpan akun, sesi, materi, soal, progres, tryout, preferensi, kelas, dan percakapan tutor di PostgreSQL Supabase. Runtime tidak memakai SQLite dan tidak berpindah ke database lokal saat koneksi gagal.

## Konfigurasi

1. Buka project Supabase → **Connect → Session pooler**. Salin URI lengkap, lalu ganti `[YOUR-PASSWORD]` dengan password **database**. Karakter khusus di password harus di-percent-encode. Session pooler cocok untuk backend Node yang terus berjalan dan koneksi Windows/IPv4; direct connection juga didukung bila jaringan mendukungnya.
2. Isi `.env` di root project, hanya pada server:

   ```dotenv
   SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD_ENCODED@HOST_DARI_DASHBOARD:5432/postgres
   ```

   Gunakan host dan username dari dashboard, bukan menebak dari contoh. Project URL `https://...supabase.co`, anon/publishable key, dan service-role key bukan pengganti URI database. Jangan beri awalan `VITE_` atau menyimpan URI di kode frontend. `GEMINI_API_KEY` tetap digunakan seperti sebelumnya.

3. TLS wajib dan sertifikat server diverifikasi. Bila diperlukan, unduh CA certificate dari **Database settings → SSL configuration**, simpan misalnya `certs/prod-supabase.cer`, lalu isi:

   ```dotenv
   SUPABASE_DB_CA_FILE=./certs/prod-supabase.cer
   ```

   Jangan mengatasi error sertifikat dengan mematikan verifikasi TLS. `SUPABASE_DB_SSL=false` hanya diterima untuk PostgreSQL pada alamat loopback lokal.

4. Terapkan skema, lalu periksa koneksi:

   ```powershell
   npm run db:migrate
   npm run db:check
   ```

   Migrasi menggunakan akun database owner yang diberikan Supabase. Skrip hanya membuat schema `pahamin` dan objek aplikasi di dalamnya. Tabel di `public`, `auth`, atau `storage` tidak diubah. Migrasi dijalankan dalam transaksi dengan lock; pengulangan versi yang sudah tercatat tidak menulis ulang tabel. Aplikasi memeriksa versi saat startup, tanpa menjalankan DDL otomatis.

   Alternatif: jalankan isi `supabase/migrations/202610260001_pahamin.sql` sekali melalui SQL Editor dalam satu transaksi. Jangan menjalankan lagi SQL mentah setelah skemanya terbentuk; gunakan `db:migrate` untuk pemeriksaan pengulangan.

5. Untuk project baru tanpa data lama, jalankan `npm run dev` dan buka http://127.0.0.1:5173. Jika ingin membawa data lama, lakukan impor di bawah **sebelum mendaftarkan akun baru**.

## Memindahkan data SQLite lama

Hentikan server lama agar sumber tidak berubah selama pemindahan. Pertahankan `data/academy.sqlite` beserta file WAL/SHM jika ada sebagai salinan sumber. Skrip membuka SQLite dalam mode read-only dan membaca snapshot konsisten; tidak menghapus atau menulis file sumber.

```powershell
# Pratinjau jumlah baris, belum menulis data akun ke Supabase:
npm run db:import-sqlite

# Terapkan setelah skema siap dan seluruh tabel data tujuan masih kosong:
npm run db:import-sqlite -- --apply

# Lokasi sumber alternatif:
npm run db:import-sqlite -- --source "C:/path/academy.sqlite" --apply
```

Impor mempertahankan ID, hash password, materi, kunci soal, progres, hasil/jawaban tryout, bookmark, preferensi, pendaftaran, jadwal, dan urutan tutor. Pengguna dapat masuk dengan password lama. Sesi login lama tidak disalin: masuk ulang setelah pindah. Enam materi dan 16 soal contoh tetap berasal dari seed aplikasi.

Tujuan yang sudah berisi data akan ditolak tanpa overwrite. Seluruh impor memakai satu transaksi; foreign key atau ketidakcocokan jumlah baris membatalkan seluruh penulisan. Pengulangan sumber yang identik dikenali dari hash snapshot dan tidak menggandakan data. Impor sumber berbeda ke tujuan yang pernah diimpor ditolak. Skrip ini untuk pemindahan satu kali, bukan sinkronisasi dua arah atau penggabungan database aktif.

## Akses dan keamanan

- Schema `pahamin` hanya untuk backend. Jangan tambahkan schema ini ke daftar **Exposed schemas** pada Data API.
- Semua 14 tabel, termasuk metadata migrasi, mengaktifkan RLS. Tidak ada policy untuk client. Hak schema/tabel/sequence dicabut dari `PUBLIC`, `anon`, `authenticated`, dan `service_role` pada objek aplikasi.
- Koneksi database owner mengakses tabel melalui API Express; pemeriksaan pemilik tetap dilakukan server. RLS di sini memblokir akses langsung client, bukan menggantikan pemeriksaan pemilik pada server.
- Akun aplikasi berada di `pahamin.users`, dengan scrypt + salt dan sesi cookie HttpOnly/SameSite Strict. Ini memakai **Supabase Database**; login belum dipindahkan ke Supabase Auth. OAuth/reset password/email verification tidak ditambahkan dalam perubahan database ini.
- Kunci jawaban dan snapshot soal tetap privat di server. Frontend menerima soal tanpa kunci sampai sesi dinilai.
- Materi dan kuis AI, impor, serta pasangan pesan tutor disimpan dalam transaksi. Jawaban dan submit tryout memakai row lock agar pembaruan bersamaan tidak menghilangkan jawaban atau menggandakan penilaian. Perubahan preferensi digabung secara atomik di JSONB.
- Raw file upload tetap diproses dalam memori; tidak ada bucket Storage yang dibuat. Gemini tetap dipanggil oleh backend.

## Verifikasi

`npm test` menggunakan PostgreSQL WASM (PGlite) sebagai dev dependency, dengan SQL migrasi produksi yang sama. Pengujian mencakup alur HTTP, pembatasan pemilik, role Data API yang ditolak, rollback, migrasi ulang, pemindahan SQLite, login password lama, dan sumber yang tidak berubah. Tes transaksi pool memeriksa penggunaan satu client dan pelepasan koneksi. PGlite tidak digunakan sebagai fallback runtime.

Koneksi Supabase cloud, sertifikat, password, dan penerapan ke project nyata hanya terverifikasi setelah `db:migrate`/`db:check` berhasil terhadap konfigurasi pengguna. Jangan menyamakan kelulusan tes lokal dengan migrasi cloud yang sudah dijalankan.

Referensi resmi: [koneksi Supabase PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [keamanan Data API](https://supabase.com/docs/guides/api/securing-your-api), [transaksi node-postgres](https://node-postgres.com/features/transactions), [TLS node-postgres](https://node-postgres.com/features/ssl).
