# CA database Supabase

`prod-supabase.cer` adalah CA publik Supabase Root 2021 CA, diunduh untuk koneksi PostgreSQL dengan verifikasi sertifikat dan hostname tetap aktif.

- Sumber: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- Dipasang pada 26 Oktober 2026.
- SHA-256 fingerprint sertifikat: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
- Masa berlaku berakhir 26 April 2031 pukul 10:56:53 UTC. Perbarui bila Supabase mengganti CA.
- Pemakaian: `SUPABASE_DB_CA_FILE=./certs/prod-supabase.cer` di `.env` server.

File ini hanya sertifikat publik; tidak berisi private key, URI database, password, atau API key. Acuan konfigurasi: [dokumentasi SSL resmi Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement).
