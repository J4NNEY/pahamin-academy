import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Target,
  Brain,
  ChartNoAxesCombined,
  Sparkles,
  Send,
  Paperclip,
  X,
  LoaderCircle,
  Settings,
  Copy,
  BookOpen,
  History,
  ShieldCheck,
  ShoppingBasket,
  Video,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PageHero } from './ui';
import { AcademyIcon, StudyBanner } from './AcademyArt';
import { Modal, Empty } from './ui';
import { api } from './api';
import type { State, Actions, StudyPreferences } from './types';

export function Pegasus({ state, actions }: { state: State; actions: Actions }) {
  const [step, setStep] = useState<'focus' | 'target' | null>(null),
    [form, setForm] = useState(state.preferences),
    [busy, setBusy] = useState(false);
  useEffect(() => setForm(state.preferences), [state.preferences]);
  const available = new Set(state.questions.map((q) => q.subject));
  const sorted = state.subjectStats
    .filter((s) => available.has(s.subject))
    .sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1));
  const points =
    state.completed.length * 20 + state.attempts.reduce((n, a) => n + a.result.correct * 10, 0);
  const dateKey = (d: string) =>
    new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const today = dateKey(new Date().toISOString());
  return (
    <>
      <PageHero
        title="Pegasus"
        onBack={() => actions.navigate('home')}
        actions={
          state.preferences.onboarded ? (
            <button className="hero-link" onClick={() => setStep('target')}>
              <Target size={15} />
              Ubah Target
            </button>
          ) : undefined
        }
      />
      <div className="academy-width page-content">
        {!state.preferences.onboarded ? (
          <section className="pegasus-welcome white-panel">
            <StudyBanner kind="pegasus" />
            <h1>Melangkah Pasti Gapai Cita-Cita</h1>
            <p>
              Semua yang kamu butuhkan untuk belajar efektif dan mencapai targetmu ada di Pegasus.
            </p>
            <h3>Kelebihan Latihan Soal di Pegasus:</h3>
            <div className="pegasus-benefits">
              {[
                { icon: BookOpen, text: 'Materi lengkap, tidak lagi bingung belajar dari mana' },
                { icon: Brain, text: 'Latihan yang memprioritaskan kebutuhan belajarmu' },
                { icon: ChartNoAxesCombined, text: 'Pantau progres belajar dari hasil latihanmu' },
                { icon: Sparkles, text: 'Mipi, teman diskusi belajarmu dengan Gemini' },
              ].map((b) => (
                <div key={b.text}>
                  <span>
                    <b.icon size={26} />
                  </span>
                  <strong>{b.text}</strong>
                </div>
              ))}
            </div>
            <p>Tentukan fokusmu, lalu siapkan langkah belajar yang pas buat kamu!</p>
            <button
              className="primary full"
              onClick={() => {
                if (actions.requireAccount()) setStep('focus');
              }}
            >
              Mulai Sekarang <ArrowRight size={17} />
            </button>
          </section>
        ) : (
          <>
            <section className="white-panel pegasus-target">
              <AcademyIcon kind="degree" size="large" />
              <div>
                <span className="local-label">TUJUAN BELAJARMU</span>
                <h2>{state.preferences.major || 'Terus tingkatkan kemampuanmu'}</h2>
                <p>
                  {state.preferences.university || 'Kampus belum ditentukan'} · Fokus{' '}
                  {state.preferences.focus}
                </p>
                <span>{state.preferences.dailyMinutes} menit belajar per hari</span>
              </div>
              <button className="text-button" onClick={() => setStep('target')}>
                Ubah <ChevronRight size={15} />
              </button>
            </section>
            <div className="pegasus-metrics">
              <div>
                <strong>{state.completed.length}</strong>
                <span>Materi dipahami</span>
              </div>
              <div>
                <strong>{state.attempts.length}</strong>
                <span>Latihan selesai</span>
              </div>
              <div>
                <strong>{points}</strong>
                <span>EXP terkumpul</span>
              </div>
            </div>
            <section className="white-panel learning-plan">
              <div className="catalogue-heading">
                <div>
                  <h2>Strategi Belajar Hari Ini</h2>
                  <p>Mulai dari pelajaran yang paling perlu diperkuat.</p>
                </div>
                <span className="free-label">Personal</span>
              </div>
              {sorted.slice(0, 3).map((s, i) => {
                const practiced = state.attempts.some(
                  (a) =>
                    dateKey(a.result.finishedAt) === today &&
                    a.result.review.some((q) => q.subject === s.subject),
                );
                return (
                  <div className="plan-row" key={s.subject}>
                    <span className={practiced ? 'plan-done' : ''}>
                      {practiced ? <Check size={17} /> : i + 1}
                    </span>
                    <div>
                      <h3>{s.subject}</h3>
                      <p>
                        {s.accuracy === null
                          ? 'Belum ada hasil latihan. Kenali kemampuan awalmu.'
                          : `Akurasi latihan ${s.accuracy}% dari ${s.total} soal. ${s.accuracy < 70 ? 'Yuk, perkuat konsepnya!' : 'Pertahankan pemahamanmu.'}`}
                      </p>
                    </div>
                    <button
                      className="secondary"
                      disabled={actions.busy}
                      onClick={() =>
                        void actions.start({ subject: s.subject, count: 5, adaptive: true })
                      }
                    >
                      {practiced ? 'Latihan lagi' : 'Mulai'}
                    </button>
                  </div>
                );
              })}
            </section>
            <section className="white-panel mastery-panel">
              <h2>Peta Kemampuanmu</h2>
              <p className="muted small">
                Persentase jawaban benar dari riwayat latihan lokal. Bukan prediksi skor UTBK atau
                peluang masuk kampus.
              </p>
              {state.subjectStats
                .filter((s) => available.has(s.subject) || s.total > 0)
                .map((s) => (
                  <div className="mastery-row" key={s.subject}>
                    <span>{s.subject}</span>
                    <div>
                      <i style={{ width: `${s.accuracy ?? 0}%` }} />
                    </div>
                    <strong>{s.accuracy === null ? '—' : `${s.accuracy}%`}</strong>
                  </div>
                ))}
            </section>
            <button className="mipi-callout" onClick={() => actions.navigate('tutor')}>
              <span className="mipi-avatar">
                m<span>•</span>
              </span>
              <div>
                <h3>Butuh bantuan Mipi?</h3>
                <p>Tanyakan konsep atau kirim foto soal yang bikin bingung.</p>
              </div>
              <ArrowRight size={21} />
            </button>
          </>
        )}
      </div>
      {step && (
        <Modal
          title={step === 'focus' ? 'Fokus Utama' : 'Target Jurusan & Belajar'}
          onClose={() => setStep(null)}
        >
          <div className="target-form">
            {step === 'focus' ? (
              <>
                <p>Pilih mode yang sesuai dengan fokus utamamu sekarang:</p>
                {(['UTBK', 'Ujian Sekolah'] as const).map((f) => (
                  <button
                    className={`focus-option ${form.focus === f ? 'selected' : ''}`}
                    key={f}
                    onClick={() => setForm({ ...form, focus: f })}
                  >
                    <AcademyIcon kind={f === 'UTBK' ? 'degree' : 'learning'} />
                    <div>
                      <h3>{f}</h3>
                      <p>
                        {f === 'UTBK'
                          ? 'Persiapan latihan untuk target kampus dan jurusan'
                          : 'Perkuat pemahaman materi sekolah'}
                      </p>
                    </div>
                    {form.focus === f && <CheckCircle2 size={20} />}
                  </button>
                ))}
                <div className="review-notice">
                  <p>Mode bisa diubah kapan saja sesuai kebutuhan belajar.</p>
                </div>
                <button className="primary full" onClick={() => setStep('target')}>
                  Lanjutkan <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    if (
                      await actions.mutate(
                        '/study/preferences',
                        { ...form, onboarded: true },
                        'PATCH',
                      )
                    )
                      setStep(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Kampus tujuan <small>(opsional)</small>
                  <input
                    placeholder="Contoh: Universitas Indonesia"
                    value={form.university}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                  />
                </label>
                <label>
                  Program studi <small>(opsional)</small>
                  <input
                    placeholder="Contoh: Teknik Informatika"
                    value={form.major}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, major: e.target.value })}
                  />
                </label>
                <label>
                  Waktu belajar per hari
                  <select
                    value={form.dailyMinutes}
                    onChange={(e) => setForm({ ...form, dailyMinutes: Number(e.target.value) })}
                  >
                    {[15, 30, 45, 60, 90, 120].map((n) => (
                      <option key={n} value={n}>
                        {n} menit
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fokus
                  <select
                    value={form.focus}
                    onChange={(e) =>
                      setForm({ ...form, focus: e.target.value as StudyPreferences['focus'] })
                    }
                  >
                    <option>UTBK</option>
                    <option>Ujian Sekolah</option>
                  </select>
                </label>
                <button className="primary full" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Target size={16} />}Simpan
                  Target
                </button>
                <p className="generation-note">
                  Kamu boleh menentukan kampus dan jurusan belakangan.
                </p>
              </form>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export function Tutor({ state, actions }: { state: State; actions: Actions }) {
  const [message, setMessage] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    [state.tutorMessages.length, busy],
  );
  const send = async () => {
    if (!actions.requireAccount()) return;
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    const form = new FormData();
    form.append('message', message);
    if (file) form.append('file', file);
    try {
      await api('/tutor', { method: 'POST', body: form, signal: controller.current.signal });
      setMessage('');
      setFile(null);
      if (input.current) input.current.value = '';
      await actions.refresh();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHero
        title="Tanya Mipi"
        onBack={() => actions.navigate('pegasus')}
        actions={
          <span className="hero-badge">
            <Sparkles size={13} />
            Gemini
          </span>
        }
      />
      <div className="academy-width page-content tutor-page">
        <section className="white-panel tutor-panel">
          <header>
            <span className="mipi-avatar">
              m<span>•</span>
            </span>
            <div>
              <h2>Mipi, teman belajarmu</h2>
              <p>Teks atau foto soal, kita bahas bareng.</p>
            </div>
            <span className={`connection-label ${state.ai.configured ? 'connected' : ''}`}>
              {state.ai.configured ? 'API key terpasang' : 'Belum terhubung'}
            </span>
          </header>
          <div className="chat-history">
            {!state.tutorMessages.length && (
              <div className="chat-welcome">
                <Sparkles size={36} />
                <h2>Halo! Mau pahami apa hari ini?</h2>
                <p>
                  Tanyakan materi atau lampirkan foto soal. Mipi membantu menjelaskan langkahnya.
                </p>
                <div>
                  {[
                    'Jelaskan fungsi kuadrat dengan contoh sederhana',
                    'Bagaimana cara menemukan ide pokok paragraf?',
                    'Bantu aku memahami Hukum Newton',
                  ].map((t) => (
                    <button key={t} onClick={() => setMessage(t)}>
                      {t}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state.tutorMessages.map((m) => (
              <article className={`chat-message ${m.role}`} key={m.id}>
                <span>{m.role === 'assistant' ? 'Mipi' : 'Kamu'}</span>
                <div>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.role === 'assistant' && (
                  <button
                    className="text-button"
                    aria-label="Salin jawaban"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(m.content)
                        .then(() => actions.notify('Jawaban disalin.'))
                        .catch(() => actions.notify('Browser tidak mengizinkan penyalinan.'))
                    }
                  >
                    <Copy size={13} />
                    Salin
                  </button>
                )}
              </article>
            ))}
            {busy && (
              <div className="chat-thinking">
                <LoaderCircle className="spin" size={17} />
                Mipi sedang menyusun penjelasan…
              </div>
            )}
            <div ref={bottom} />
          </div>
          {!state.ai.configured && (
            <div className="setup-notice">
              <Settings size={18} />
              <p>
                Hubungkan Gemini dari pengaturan untuk mulai bertanya.
                <button className="text-button" onClick={() => actions.navigate('settings')}>
                  Buka pengaturan <ArrowRight size={14} />
                </button>
              </p>
            </div>
          )}
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {file && (
              <div className="chat-file">
                <Paperclip size={14} />
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label="Hapus lampiran"
                  onClick={() => {
                    setFile(null);
                    if (input.current) input.current.value = '';
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <textarea
              aria-label="Pertanyaan untuk Mipi"
              placeholder="Tulis pertanyaanmu di sini…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              minLength={3}
              maxLength={6000}
              required
              disabled={busy}
            />
            <div>
              <input
                ref={input}
                type="file"
                aria-label="Lampiran soal"
                accept=".png,.jpg,.jpeg,.pdf,.txt,.md,.docx"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 10 * 1024 * 1024) {
                    setError('Lampiran maksimal 10 MB.');
                    e.target.value = '';
                    return;
                  }
                  setFile(f || null);
                  setError('');
                }}
              />
              <button
                type="button"
                className="attachment-button"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <Paperclip size={18} />
                Foto / file soal
              </button>
              <button
                className="primary"
                disabled={busy || !state.ai.configured || message.trim().length < 3}
              >
                {busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}Kirim
              </button>
            </div>
          </form>
          <p className="chat-note">
            Saat dikirim, teks dan lampiran diproses Gemini. Jawaban AI perlu ditinjau kembali.
          </p>
        </section>
      </div>
    </>
  );
}

export function Purchase({ actions }: { actions: Actions }) {
  const [tab, setTab] = useState('packages');
  return (
    <>
      <PageHero title="Pembelian" onBack={() => actions.navigate('home')} />
      <div className="academy-width page-content">
        <div className="content-tabs">
          <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>
            Pilihan Paket
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            Riwayat Pembelian
          </button>
        </div>
        {tab === 'history' ? (
          <Empty
            title="Belum ada transaksi"
            description="Pembayaran belum diaktifkan pada server ini. Kamu bisa menggunakan fitur belajar lokal secara gratis."
          />
        ) : (
          <>
            <section className="package-intro">
              <h1>Belajar sesuai kebutuhanmu.</h1>
              <p>Satu ruang untuk materi, soal, dan target belajarmu.</p>
            </section>
            <div className="package-grid">
              <section className="white-panel package-card">
                <span className="free-label">AKTIF</span>
                <AcademyIcon kind="learning" size="large" />
                <h2>Pahamin Personal</h2>
                <strong>Gratis</strong>
                <ul>
                  {[
                    'Materi contoh & koleksi personal',
                    'Bank soal dan impor CSV/JSON',
                    'Tryout, pembahasan & progres',
                    'Pegasus dan jadwal kelas pribadi',
                  ].map((t) => (
                    <li key={t}>
                      <CheckCircle2 size={16} />
                      {t}
                    </li>
                  ))}
                </ul>
                <button className="primary full" onClick={() => actions.navigate('home')}>
                  Mulai belajar <ArrowRight size={16} />
                </button>
              </section>
              <section className="white-panel package-card ai-package">
                <AcademyIcon kind="ai" size="large" />
                <h2>AI dengan Gemini</h2>
                <strong>API key sendiri</strong>
                <ul>
                  {[
                    'Materi & kuis dari file',
                    'Ekstraksi soal dari PDF/DOCX',
                    'Tutor teks & foto soal',
                    'Pemakaian mengikuti kuota Google',
                  ].map((t) => (
                    <li key={t}>
                      <Sparkles size={16} />
                      {t}
                    </li>
                  ))}
                </ul>
                <button className="secondary full" onClick={() => actions.navigate('settings')}>
                  Hubungkan Gemini <ArrowRight size={16} />
                </button>
              </section>
            </div>
            <div className="payment-status">
              <ShieldCheck size={20} />
              <div>
                <h3>Pembayaran belum dikonfigurasi</h3>
                <p>
                  Belum ada produk berbayar atau transaksi uang pada aplikasi ini. Paket Pahamify
                  tidak dijual oleh Pahamin Academy.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
