# Deployment Cloudflare Workers

Frontend Vite dan API Express harus diterbitkan bersama melalui entrypoint `worker/index.mjs`. Mengunggah folder `dist` saja tidak menjalankan backend. Pada deployment awal, `/api/state` mengembalikan HTML SPA dengan status 200; frontend sebelumnya menerima respons tersebut sebagai state dan gagal render.

## Konfigurasi project ini

- `wrangler.jsonc` menggunakan Worker `pahamin-academy`, asset `dist`, dan binding `ASSETS`.
- `/api` dan `/api/*` menjalankan Worker lebih dahulu. Route API yang tidak ada menghasilkan JSON 404; halaman SPA tetap mendapat fallback HTML.
- Adapter resmi `cloudflare:node` menjalankan Express. Aplikasi Node lokal tetap dapat memakai `npm run dev` atau `npm start`.
- Database Worker memakai binding `HYPERDRIVE` ke Supabase. Konfigurasi `pahamin-supabase` telah dibuat pada akun Cloudflare pengguna, dengan caching SQL dimatikan dan TLS origin `verify-full` memakai CA Supabase Root 2021. ID di Wrangler bukan secret.
- Pool PostgreSQL dibuat per request dan ditutup setelah respons. Konteks database tidak dibagikan antarrequest. Cookie sesi HTTPS memakai `Secure` di Worker.
- Secret runtime `GEMINI_API_KEY` dan `GEMINI_MODEL` disimpan melalui Cloudflare Secrets setelah persetujuan pengguna. `.env` lokal tidak otomatis menjadi secret deployment. URI database dikelola oleh Hyperdrive, bukan frontend.

## Deploy ulang

```powershell
npm ci
npx wrangler login
npm run cf:check
npm run deploy
```

Untuk Git integration Cloudflare:

- Root directory: root repository ini.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Pastikan perubahan `worker/`, `server/`, `wrangler.jsonc`, `package.json`, dan lockfile ikut masuk repository. Jangan memakai deployment static assets saja.
- Build variables berbeda dari runtime secrets. Key Gemini harus ada di **Worker → Settings → Variables and Secrets**. Jangan memasukkannya sebagai `VITE_...`.

Pada akun Cloudflare lain, buat Hyperdrive ke database Supabase milik akun tersebut dan perbarui ID binding pada Wrangler. Gunakan verifikasi CA/hostname dan matikan query caching agar sesi serta progres segera terbaca kembali. Skema database diterapkan terpisah melalui `npm run db:migrate`, bukan dari request Worker.

## Tes lokal runtime Worker

```powershell
npm run cf:dev
```

Buka http://127.0.0.1:8787. Helper membaca `.env`, membuat konfigurasi sementara di `artifacts`, dan mengemulasikan Hyperdrive. Koneksi origin lokal memakai TLS `verify-full` dengan CA Supabase. Key Gemini disimpan hanya dalam `.dev.vars` lokal yang diabaikan Git. File ini tidak menjadi bagian dari bundle frontend.

`npm test` mencakup regresi untuk respons HTML dengan status 200, JSON tidak valid, dan state awal yang tidak lengkap. Error ditampilkan dengan tombol mencoba ulang; error boundary menyediakan fallback bila render gagal.

## Pemeriksaan setelah deploy

`/api/state` harus berstatus 200 dan `Content-Type: application/json`, berisi `materials`, `questions`, dan `preferences`. Jika terlihat HTML, route API masih tertangkap fallback asset. Jika JSON 503, periksa binding Hyperdrive, koneksi origin, CA dan versi migrasi database. Gunakan `npx wrangler tail` untuk log tanpa mencetak kredensial.

CPU untuk hashing scrypt dan pemrosesan DOCX tetap mengikuti batas plan Workers. Pengujian lokal tidak mensimulasikan seluruh kuota produksi; jangan melemahkan hashing password untuk mengejar batas kuota. Penanganan kuota/503 Gemini tetap mengikuti respons layanan Google.

Acuan resmi: [Node HTTP adapter](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), [routing Worker dan asset](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [Supabase melalui Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/), [TLS Hyperdrive](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/).
