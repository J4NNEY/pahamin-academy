# Frontend

Baca [../AGENTS.md](../AGENTS.md) dan [../docs/DESIGN.md](../docs/DESIGN.md).

- Entry `main.tsx`; state, hash route, auth dialog, toast, dan aksi bersama di `App.tsx`.
  Gunakan `Page`, `State`, dan `Actions` dari `types.ts` saat menambah alur.
- `Workspace.tsx` adalah **navbar atas**, meskipun namanya berasal dari iterasi lama.
  `Dashboard.tsx` hanya ringkasan ringkas dan rekomendasi; jangan menambah hero dekoratif lagi.
- Semua HTTP lewat `api.ts`. Helper ini memasang `/api`, cookie same-origin, memeriksa JSON,
  dan menolak fallback HTML. Pertahankan error startup/`ErrorBoundary.tsx` yang bisa dipulihkan.
- Tidak ada koneksi Supabase atau key Gemini di browser. Role frontend hanya mengatur tampilan;
  akses tetap diperiksa backend. Kunci soal hanya ada pada draf admin/impor dan hasil penilaian.
- CSS global dimuat dalam urutan `features.css`, `academy.css`, `pahamin.css`.
  `admin.css` diimpor modul admin. Periksa cascade/media query sebelum menambah override.
  Hindari lapisan override baru untuk menghidupkan kembali desain yang sudah ditolak pengguna.
- Gunakan ikon Lucide dan SVG milik project. `docs/reference-ui/` bukan direktori asset runtime.
- Gunakan `Modal` di `ui.tsx` untuk menjaga fokus, Escape, dan penguncian scroll.
  Kontrol ikon harus punya accessible name; menu aktif punya `aria-current`.
- Pertahankan menu yang dapat dijangkau pada layar 320px. Navbar desktop dan ponsel
  masing-masing harus hanya menampilkan satu navigasi yang bisa difokuskan.
- Waktu target/progres harian memakai WIB. Angka progres berasal dari state aktual.
  Jangan membuat statistik, saldo, transaksi, atau status provider palsu untuk mengisi UI.
- Verifikasi: `npm run build` dan browser pada view yang diubah. Jangan menulis tes
  snapshot untuk perubahan kosmetik sederhana. Kontrak respons: `tests/api-response.test.mjs`.
