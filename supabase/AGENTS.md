# Schema dan migrasi

Baca [../AGENTS.md](../AGENTS.md) dan [../docs/SUPABASE.md](../docs/SUPABASE.md).

- Objek aplikasi berada di schema `pahamin`. Jangan mengubah `public`, `auth`, `storage`,
  schema aplikasi lain, atau beralih ke Supabase Auth sebagai bagian migrasi rutin.
- Jangan mengedit/memutar ulang SQL historis yang sudah diterapkan. Tambahkan migrasi
  berurutan dan daftarkan dengan **versi literal masing-masing** di `server/migrations.mjs`.
  Naikkan `SCHEMA_VERSION` di `server/database.mjs`; jangan membuat entri migrasi admin lama
  ikut memakai versi baru hanya karena saat ini entri terakhir merujuk konstanta tersebut.
- Pertahankan transaksi, advisory lock, dan pencatatan versi. Startup hanya memeriksa
  versi, tidak menginisialisasi atau mereset schema otomatis.
- Tabel baru harus RLS aktif dan hak client dicabut, konsisten dengan migrasi sebelumnya.
  Jangan expose schema melalui Data API, menambah policy longgar, atau menonaktifkan TLS.
- Jika menambah tabel, periksa assertion di `scripts/check-database.mjs` dan
  `tests/database.test.mjs`, serta daftar lock/penolakan tujuan nonkosong pada
  `server/import-sqlite.mjs`. Importer historis tidak otomatis mencakup tabel baru.
- Uji database kosong, upgrade dari versi sebelumnya dengan data, replay aman, rollback,
  dan role client ditolak menggunakan PGlite. Tes lulus bukan bukti migrasi cloud diterapkan.
- `npm run db:migrate` menulis ke target `.env`. Baca target secara aman, pahami scope,
  dan pertahankan data pengguna; jangan menjalankannya hanya untuk mempelajari repository.
