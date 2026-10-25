import { useState, useEffect, useRef } from 'react';
import {
  Timer,
  ArrowRight,
  ArrowLeft,
  Check,
  ClipboardList,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LoaderCircle,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import { api } from './api';
import type { Session, Result } from './types';
import { Modal, PageHeading } from './ui';
export function TryoutPage({
  subjects,
  questionCount,
  busy,
  onStart,
  onResume,
  hasActive,
}: {
  subjects: string[];
  questionCount: number;
  busy: boolean;
  onStart: (s: string, c: number) => void;
  onResume: () => void;
  hasActive: boolean;
}) {
  const [subject, setSubject] = useState('Semua'),
    [count, setCount] = useState(10);
  return (
    <>
      <PageHeading
        eyebrow="BERANI COBA, MAKIN PERCAYA DIRI"
        title="Latihan hari ini. Siap esok hari."
        description="Simulasi ujian dengan waktu terukur dan pembahasan setelah selesai."
      />
      {hasActive && (
        <div className="resume-banner">
          <Timer size={19} />
          <span>Ada sesi yang belum kamu selesaikan.</span>
          <button className="text-button" onClick={onResume}>
            Lanjutkan sesi <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="tryout-layout">
        <div className="tryout-feature">
          <span className="tryout-label">
            <Flag size={15} />
            ARENA LATIHAN
          </span>
          <div className="tryout-art">
            <ClipboardList size={94} strokeWidth={1} />
            <span>✦</span>
            <i>✓</i>
          </div>
          <h2>
            Uji kemampuanmu,
            <br />
            kenali potensimu.
          </h2>
          <p>
            Bukan sekadar nilai. Temukan bagian yang sudah kamu kuasai dan yang perlu dipelajari
            lagi.
          </p>
          <div className="tryout-facts">
            <span>
              <Timer size={19} />
              90 detik / soal
            </span>
            <span>
              <CheckCircle2 size={19} />
              Pembahasan lengkap
            </span>
          </div>
          <small>
            Soal diacak dari {questionCount} soal yang tersedia. Ini latihan mandiri, bukan prediksi
            skor UTBK.
          </small>
        </div>
        <section className="panel tryout-config">
          <h2>Siapkan sesimu</h2>
          <p className="muted">Pilih fokus belajar, ambil napas, lalu mulai.</p>
          <label>
            Mata pelajaran
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {['Semua', ...subjects].map((s) => (
                <option key={s} value={s}>
                  {s === 'Semua' ? 'Campuran semua pelajaran' : s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jumlah soal
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} soal
                </option>
              ))}
            </select>
          </label>
          <div className="review-notice">
            <Timer size={20} />
            <p>
              Jumlah soal mengikuti ketersediaan bank soal. Waktu dihitung sejak sesi dibuat,
              termasuk saat halaman ditutup. Jawaban tersimpan setiap kali dipilih.
            </p>
          </div>
          <button className="primary full" disabled={busy} onClick={() => onStart(subject, count)}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}Mulai try
            out
          </button>
          <p className="generation-note">Cari tempat yang nyaman dan minim distraksi.</p>
        </section>
      </div>
    </>
  );
}
export function QuizDialog({
  session,
  onClose,
  onComplete,
}: {
  session: Session;
  onClose: () => void;
  onComplete: (r: Result) => Promise<void>;
}) {
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<number, number>>(session.answers || {}),
    [remaining, setRemaining] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const autoSubmitted = useRef(false);
  const submitting = useRef(false),
    complete = useRef(onComplete);
  complete.current = onComplete;
  const end = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await api<Result>(`/attempts/${session.id}/submit`, { method: 'POST' });
      await complete.current(r);
    } catch (e) {
      setError((e as Error).message);
      submitting.current = false;
      setBusy(false);
    }
  };
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => {
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((session.started + session.duration * 1000 - Date.now()) / 1000),
      );
      setRemaining(left);
      if (session.duration && left === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        void endRef.current();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session.id, session.started, session.duration]);
  const q = session.questions[index];
  return (
    <Modal
      title={session.mode === 'tryout' ? 'Try out · ruang fokus' : 'Latihan · satu langkah lagi'}
      onClose={onClose}
      wide
    >
      <div className="quiz">
        <div className="quiz-status">
          <span>
            Soal <strong>{index + 1}</strong> / {session.questions.length}
          </span>
          <span>{Object.keys(answers).length} terjawab</span>
          {session.duration > 0 && (
            <span className={`quiz-timer ${remaining < 60 ? 'urgent' : ''}`}>
              <Timer size={17} />
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="quiz-progress">
          <i
            style={{ width: `${(Object.keys(answers).length / session.questions.length) * 100}%` }}
          />
        </div>
        <div className="quiz-body">
          <div className="quiz-question">
            <div className="row-tags">
              <span className="subject-tag">{q.subject}</span>
              <span className="difficulty">{q.difficulty}</span>
            </div>
            <h2>{q.question}</h2>
            <div className="quiz-options">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  disabled={busy}
                  className={answers[index] === i ? 'selected' : ''}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await api(`/attempts/${session.id}/answers`, {
                        method: 'PATCH',
                        body: JSON.stringify({ index, answer: i }),
                      });
                      setAnswers((a) => ({ ...a, [index]: i }));
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {o}
                  {answers[index] === i && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
          <aside className="quiz-navigator">
            <h4>Navigasi soal</h4>
            <div>
              {session.questions.map((_, i) => (
                <button
                  aria-label={`Buka soal ${i + 1}${answers[i] !== undefined ? ', terjawab' : ''}`}
                  key={i}
                  className={`${i === index ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`}
                  onClick={() => setIndex(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p>
              <span className="legend-dot" />
              Terjawab
            </p>
            <p className="small muted">
              Kunci dan pembahasan muncul setelah kamu menyelesaikan sesi.
            </p>
          </aside>
        </div>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        {confirm && (
          <div className="confirm-finish">
            <strong>Siap menyelesaikan sesi?</strong>
            <p>
              {session.questions.length - Object.keys(answers).length} soal belum terjawab. Nilai
              dihitung dari seluruh soal.
            </p>
            <button className="secondary" onClick={() => setConfirm(false)} disabled={busy}>
              Lanjut mengerjakan
            </button>
            <button className="primary" onClick={() => void end()} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Ya, lihat
              hasil
            </button>
          </div>
        )}
        <div className="dialog-actions">
          <button
            className="secondary"
            disabled={index === 0 || busy}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft size={16} />
            Sebelumnya
          </button>
          {index < session.questions.length - 1 && !(session.duration && remaining === 0) ? (
            <button className="primary" disabled={busy} onClick={() => setIndex(index + 1)}>
              Selanjutnya <ArrowRight size={16} />
            </button>
          ) : (
            <button className="primary" disabled={busy} onClick={() => setConfirm(true)}>
              <CheckCircle2 size={16} />
              Selesaikan sesi
            </button>
          )}
        </div>
        <p className="generation-note">
          Menutup dialog tidak mengakhiri sesi. Lanjutkan dari halaman Try out.
        </p>
      </div>
    </Modal>
  );
}
export function ResultDialog({ result, onClose }: { result: Result; onClose: () => void }) {
  return (
    <Modal title="Setiap latihan adalah kemajuan." onClose={onClose} wide>
      <div className="result-content">
        <div className="result-overview">
          <span className="result-trophy">
            <Trophy size={30} />
          </span>
          <div>
            <span className="eyebrow">SESI SELESAI</span>
            <h2>
              {result.score >= 80
                ? 'Keren, makin paham!'
                : result.score >= 50
                  ? 'Langkah yang bagus!'
                  : 'Awal yang baik untuk belajar.'}
            </h2>
            <p>Pelajari pembahasannya dan coba lagi saat kamu siap.</p>
          </div>
          <div className="result-score">
            {result.score}
            <small>/ 100</small>
          </div>
        </div>
        <div className="result-stats">
          <span>
            <CheckCircle2 size={18} />
            <strong>{result.correct}</strong>benar
          </span>
          <span>
            <XCircle size={18} />
            <strong>{result.total - result.correct - result.unanswered}</strong>salah
          </span>
          <span>
            <RotateCcw size={18} />
            <strong>{result.unanswered}</strong>dilewati
          </span>
        </div>
        <h3>Pahami pembahasannya</h3>
        <div className="review-list">
          {result.review.map((q, i) => (
            <details key={i} open={i === 0}>
              <summary>
                <span className={q.correct ? 'correct-icon' : 'incorrect-icon'}>
                  {q.correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
                </span>
                <span>
                  {i + 1}. {q.question}
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="review-body">
                {q.options.map((o, k) => (
                  <div
                    className={`review-option ${k === q.answer ? 'correct' : ''} ${k === q.selected && k !== q.answer ? 'incorrect' : ''}`}
                    key={k}
                  >
                    <b>{String.fromCharCode(65 + k)}</b>
                    {o}
                    {k === q.answer && <span>Kunci benar</span>}
                    {k === q.selected && <small>Jawabanmu</small>}
                  </div>
                ))}
                {q.selected === null && <p className="muted small">Soal ini tidak dijawab.</p>}
                <div className="explanation">
                  <strong>Pembahasan</strong>
                  <p>{q.explanation}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className="dialog-actions">
          <span className="small muted">Nilai tersimpan di riwayat belajar.</span>
          <button className="primary" onClick={onClose}>
            Lanjut belajar <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
