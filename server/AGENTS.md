# Backend Express dan provider AI

Baca [../AGENTS.md](../AGENTS.md) dan [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

- `createApp()` di `app.mjs` menerima database/provider untuk tes dan Worker.
  Jangan menambah `listen()`, koneksi DB otomatis, DDL, atau side effect pada import modul.
  Startup Node ada di `index.mjs`; Worker punya adapter sendiri.
- API menggunakan schema Zod dari `validation.mjs`, JSON error terkontrol, dan SQL async
  berparameter `$1`. Antarmuka DB: `get(sql, ...values)`, `all`, `run`, `query(sql, values)`,
  serta `transaction(work)`. Gunakan `tx` untuk semua operasi dalam transaksi.
- Auth/ownership di server wajib. `requireUser` mendahului `requireAdmin`; role dibaca
  dari database setiap request. Registrasi/profil tidak dapat mempromosikan role.
- Publikasi konten di `admin.mjs` memakai tabel catalogue, status, dan revisi. Validasi
  seluruh batch sebelum menulis; konflik satu item membatalkan seluruh batch.
- Pertahankan pemisahan seed/personal/catalogue pada `readMaterials` dan `readQuestions`.
  Proyeksi soal publik menghapus `answer`/`explanation`; grading memakai snapshot tersimpan.
- Gunakan row lock/transaksi untuk jawaban, submit, impor, dan perubahan yang harus atomik.
  RLS tidak menggantikan owner filter saat server memakai koneksi database owner.
- `gemini-schema.mjs` adalah grammar provider yang disederhanakan, bukan pengganti validasi
  penuh Zod sesudah respons. Jangan mengirim schema aplikasi besar langsung ke Gemini lagi.
- `gemini-request.mjs` hanya mengulang 503 sekali setelah 1 detik dengan deadline awal
  yang sama. Jangan retry 400, menonaktifkan timeout, atau mengganti model tanpa dasar.
- Upload diproses di memori; PDF/gambar multimodal, DOCX menjadi teks. Jangan menambahkan
  ekstraksi teks PDF sebagai fallback yang membuang isi scan, atau menyimpan file mentah.
- Rahasiakan key, URI, session hash, dan body provider. Gunakan pemetaan error aman di
  `gemini-errors.mjs`; `ai.configured` hanya keberadaan key.
- Verifikasi: `npm test` atau file tes yang relevan. Pakai `createTestDatabase()` dan provider
  terkontrol; bukan `.env`/Supabase nyata sebagai test fixture default.
