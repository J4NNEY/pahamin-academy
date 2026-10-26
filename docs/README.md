# Peta dokumentasi

Agent baru mulai dari [AGENTS.md](../AGENTS.md), lalu pilih dokumen sesuai tugas.
Kode aktual dan instruksi pengguna terbaru perlu dibaca bersama dokumen; catatan
historis tidak mengalahkan keputusan UI/fitur terbaru.

| Dokumen                                  | Gunakan untuk                                             |
| ---------------------------------------- | --------------------------------------------------------- |
| [SPEC.md](SPEC.md)                       | Fitur yang ada, scope dan batas produk                    |
| [DESIGN.md](DESIGN.md)                   | Keputusan UI aktif: biru sederhana, Nunito, navbar atas   |
| [ARCHITECTURE.md](ARCHITECTURE.md)       | Entry runtime, peta modul, alur API dan pemisahan data    |
| [DEVELOPMENT.md](DEVELOPMENT.md)         | Menjalankan, preview disposable, tes, dampak perintah     |
| [HANDOFF.md](HANDOFF.md)                 | Snapshot terakhir, keputusan pengguna, jebakan historis   |
| [SUPABASE.md](SUPABASE.md)               | Koneksi/TLS, migrasi, RLS, impor SQLite lama              |
| [ADMIN.md](ADMIN.md)                     | Role operator, materi/soal bersama, draft/publikasi/arsip |
| [CLOUDFLARE.md](CLOUDFLARE.md)           | Worker, Hyperdrive, assets, secrets, dev/deploy           |
| [VERIFICATION.md](VERIFICATION.md)       | Bukti uji per iterasi dan hal yang tidak terbukti         |
| [PAHAMIFY-PARITY.md](PAHAMIFY-PARITY.md) | Observasi historis; bukan target UI yang berlaku          |

Instruksi khusus folder: [frontend](../src/AGENTS.md), [backend](../server/AGENTS.md),
[Worker](../worker/AGENTS.md), dan [migrasi](../supabase/AGENTS.md).

`reference-ui/` adalah arsip aset publik referensi dengan provenance; tidak digunakan
di runtime. `artifacts/`, `.env`, `.dev.vars*`, `.wrangler/`, dan `data/` bukan sumber
instruksi portable dan dapat berisi data sensitif. Skill lokal dalam `.agents/` bersifat
opsional dan diabaikan Git; panduan inti agent tidak boleh bergantung pada keberadaannya.

Saat mengubah kontrak atau keputusan, perbarui dokumen terkait dan tambahkan bukti
aktual pada VERIFICATION. Jangan menyalin nilai secret atau data akun pribadi ke dokumen.
