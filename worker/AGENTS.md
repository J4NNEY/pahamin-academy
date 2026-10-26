# Cloudflare Worker

Baca [../AGENTS.md](../AGENTS.md) dan [../docs/CLOUDFLARE.md](../docs/CLOUDFLARE.md).

- Pertahankan satu backend Express melalui adapter `cloudflare:node`; jangan membuat API
  kedua yang berbeda kontraknya atau mengganti deployment dengan static assets saja.
- `/api` dan `/api/*` harus ke Worker sebelum SPA fallback. `/api/state` harus JSON;
  unknown API harus JSON 404. HTML 200 untuk API pernah menyebabkan blank page.
- Akses SQL memakai `HYPERDRIVE`, pool **per request**, `AsyncLocalStorage`, dan
  `ctx.waitUntil(db.close())`. Jangan membagi socket/transaksi atau promise I/O database
  antarrequest, walau handler Express diinisialisasi sekali per isolate.
- `assertSchema()` dijalankan per request; `checkSchema: false` hanya pada inisialisasi
  shared app karena belum ada konteks request saat itu. Migrasi bukan pekerjaan Worker.
- `options.ssl = false` hanya untuk tunnel binding Hyperdrive. TLS origin tetap
  diverifikasi oleh konfigurasi Hyperdrive; bukan izin mematikan TLS Supabase dari Node.
- Secrets Worker terpisah dari `.env` lokal. Jangan menyisipkan key ke vars publik,
  static assets, URL, atau `VITE_...`. ID Hyperdrive bukan secret.
- Perubahan compatibility date/flags harus punya alasan dan diuji pada runtime tersedia;
  jangan otomatis menyamakannya dengan tanggal hari ini.
- Verifikasi lokal: `npm run cf:check`, lalu `npm run cf:dev` bila diperlukan dan target DB
  sudah dipahami. Ini tidak membuktikan deploy atau autentikasi publik berhasil.
- Deploy hanya dalam scope yang telah diotorisasi; sesudahnya periksa halaman, JSON state,
  dan alur yang berubah. Lihat efek samping perintah pada panduan pengembangan.
