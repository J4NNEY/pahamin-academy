import { useState, useRef, useEffect, type DragEvent } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  X,
  ArrowRight,
  Check,
  LoaderCircle,
  Download,
  ChevronDown,
  Trash2,
  BookOpen,
  Settings,
  ShieldCheck,
  Layers3,
  ArrowUpRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, download } from './api';
import type { State, Material, Question } from './types';
import { PageHeading, Modal } from './ui';

const template = {
  subject: 'Matematika',
  topic: 'Penjumlahan',
  difficulty: 'Mudah',
  question: 'Hasil dari 12 + 8 adalah …',
  options: ['18', '19', '20', '21'],
  answer: 2,
  explanation: '12 ditambah 8 sama dengan 20.',
};
function FileDrop({
  file,
  onChange,
  accept,
  busy = false,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  accept: string;
  busy?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    [drag, setDrag] = useState(false),
    [error, setError] = useState('');
  function choose(f: File | undefined) {
    setError('');
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('File terlalu besar. Maksimal 10 MB.');
      return;
    }
    const extension = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!accept.split(',').includes(extension)) {
      setError('Format file belum didukung. Pilih format yang tercantum.');
      return;
    }
    onChange(f);
  }
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!busy) choose(e.dataTransfer.files[0]);
  };
  return (
    <div>
      <div
        className={`file-drop ${drag ? 'drag' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={drop}
      >
        <input
          ref={input}
          type="file"
          aria-label="Pilih file"
          accept={accept}
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0])}
          hidden
        />
        {file ? (
          <>
            <span className="upload-icon">
              <FileText size={28} />
            </span>
            <strong>{file.name}</strong>
            <p>{(file.size / 1024).toFixed(1)} KB · siap diproses</p>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                onChange(null);
                if (input.current) input.current.value = '';
              }}
            >
              <X size={14} />
              Ganti file
            </button>
          </>
        ) : (
          <>
            <span className="upload-icon">
              <Upload size={28} />
            </span>
            <h3>Taruh file-mu di sini</h3>
            <p>atau pilih dari perangkatmu</p>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              Pilih file <ArrowUpRight size={15} />
            </button>
            <small>
              {accept.replaceAll('.', '').replaceAll(',', ', ').toUpperCase()} · maks. 10 MB
            </small>
          </>
        )}
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function QuestionPreview({
  questions,
  onChange,
}: {
  questions: Question[];
  onChange: (q: Question[]) => void;
}) {
  return (
    <div className="preview-questions">
      {questions.map((q, i) => (
        <details key={i} open={i === 0}>
          <summary>
            <span className="question-index">{i + 1}</span>
            <span>{q.question}</span>
            <ChevronDown size={17} />
          </summary>
          <div className="question-edit">
            <label>
              Soal
              <textarea
                value={q.question}
                onChange={(e) =>
                  onChange(
                    questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)),
                  )
                }
              />
            </label>
            <div className="preview-options">
              {q.options.map((o, k) => (
                <label key={k} className={k === q.answer ? 'correct-option' : ''}>
                  <input
                    type="radio"
                    name={`answer-${i}`}
                    checked={q.answer === k}
                    onChange={() =>
                      onChange(questions.map((x, j) => (j === i ? { ...x, answer: k } : x)))
                    }
                  />
                  <b>{String.fromCharCode(65 + k)}</b>
                  <input
                    aria-label={`Pilihan ${String.fromCharCode(65 + k)} soal ${i + 1}`}
                    value={o}
                    onChange={(e) =>
                      onChange(
                        questions.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                options: x.options.map((v, l) => (l === k ? e.target.value : v)),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  {k === q.answer && <Check size={16} />}
                </label>
              ))}
            </div>
            <label>
              Pembahasan
              <textarea
                value={q.explanation || ''}
                onChange={(e) =>
                  onChange(
                    questions.map((x, j) => (j === i ? { ...x, explanation: e.target.value } : x)),
                  )
                }
              />
            </label>
            <div className="preview-question-footer">
              <span>
                {q.subject} · {q.difficulty}
              </span>
              <button
                className="text-button danger"
                type="button"
                onClick={() => onChange(questions.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
                Hapus soal
              </button>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
export function ImportDialog({
  subjects,
  curriculum = 'UTBK',
  aiConfigured,
  onClose,
  onSaved,
}: {
  subjects: string[];
  curriculum?: string;
  aiConfigured: boolean;
  onClose: () => void;
  onSaved: (count: number, skipped: number) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [subject, setSubject] = useState(subjects[0]),
    [preview, setPreview] = useState<{ questions: Question[]; source: string; ai: boolean } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const needsAI = file && !['csv', 'json'].includes(file.name.split('.').pop()!.toLowerCase());
  return (
    <Modal
      title={preview ? 'Tinjau soal sebelum disimpan' : 'Bawa soalmu ke Pahamin'}
      onClose={onClose}
      wide
    >
      <div className="import-content">
        <div className="import-steps">
          <span className={preview ? 'done' : 'current'}>
            1 <small>Unggah file</small>
          </span>
          <i />
          <span className={preview ? 'current' : ''}>
            2 <small>Tinjau soal</small>
          </span>
          <i />
          <span>
            3 <small>Siap latihan</small>
          </span>
        </div>
        {preview ? (
          <>
            <div className="review-notice">
              <ShieldCheck size={20} />
              <p>
                {preview.ai
                  ? 'Soal diekstrak dengan Gemini. Periksa teks, pilihan, dan kunci yang disimpulkan AI sebelum menyimpan.'
                  : 'Format soal sudah valid. Periksa isi dan pilih jawaban yang benar sebelum menyimpan.'}
              </p>
            </div>
            <div className="section-heading">
              <h3>{preview.questions.length} soal siap ditinjau</h3>
              <span className="muted small">{preview.source}</span>
            </div>
            <QuestionPreview
              questions={preview.questions}
              onChange={(questions) => setPreview({ ...preview, questions })}
            />
            <div className="dialog-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setError('');
                }}
              >
                Ganti file
              </button>
              <button
                className="primary"
                disabled={busy || !preview.questions.length}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const r = await api<{ count: number; skipped: number }>('/questions/import', {
                      method: 'POST',
                      body: JSON.stringify(preview),
                    });
                    await onSaved(r.count, r.skipped);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}Simpan{' '}
                {preview.questions.length} soal
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Unggah kumpulan soal, tinjau hasilnya, lalu simpan ke bank soal personalmu.
            </p>
            <div className="import-layout">
              <FileDrop
                file={file}
                onChange={setFile}
                accept=".csv,.json,.pdf,.docx,.txt,.md"
                busy={busy}
              />
              <div className="import-guide">
                <h3>Mulai dari template</h3>
                <p>CSV dan JSON bisa diimpor langsung tanpa AI. Maksimal 200 soal per file.</p>
                <button
                  className="secondary full"
                  onClick={() =>
                    download(
                      'template-soal.csv',
                      'subject,topic,difficulty,question,option_a,option_b,option_c,option_d,answer,explanation\nMatematika,Penjumlahan,Mudah,Hasil dari 12 + 8 adalah ...,18,19,20,21,C,12 ditambah 8 sama dengan 20.\n',
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  <Download size={16} />
                  Template CSV
                </button>
                <button
                  className="secondary full"
                  onClick={() =>
                    download('template-soal.json', JSON.stringify([template], null, 2))
                  }
                >
                  <Download size={16} />
                  Template JSON
                </button>
                <p className="small">
                  CSV: kunci A–E atau indeks 0–4. JSON: <code>answer</code> memakai indeks mulai 0.
                  Pelajaran harus sesuai daftar.
                </p>
                <label>
                  Pelajaran untuk ekstraksi AI
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <p className="small muted">
                  PDF, DOCX, TXT, dan MD diproses Gemini. File dikirim ke Google hanya saat kamu
                  memulai ekstraksi.
                </p>
              </div>
            </div>
            {needsAI && !aiConfigured && (
              <p className="error-box">
                Gemini belum terhubung. Konfigurasikan GEMINI_API_KEY di .env, atau gunakan CSV /
                JSON.
              </p>
            )}
            <div className="dialog-actions">
              <span className="small muted">
                <ShieldCheck size={14} />
                File mentah tidak disimpan
              </span>
              <button
                className="primary"
                disabled={!file || busy || !!(needsAI && !aiConfigured)}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  controller.current = new AbortController();
                  const data = new FormData();
                  data.append('file', file!);
                  data.append('subject', subject);
                  data.append('curriculum', curriculum);
                  try {
                    setPreview(
                      await api('/import/preview', {
                        method: 'POST',
                        body: data,
                        signal: controller.current.signal,
                      }),
                    );
                  } catch (e) {
                    if ((e as Error).name !== 'AbortError') setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{' '}
                {busy ? 'Membaca soal…' : 'Pratinjau soal'}
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function AIStudio({
  state,
  requireAccount,
  onSaved,
  onSettings,
  toast,
}: {
  state: State;
  requireAccount: () => boolean;
  onSaved: (id: string) => Promise<void>;
  onSettings: () => void;
  toast: (s: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [subject, setSubject] = useState('Matematika'),
    [instruction, setInstruction] = useState(''),
    [draft, setDraft] = useState<Material | null>(null),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <>
      <PageHeading
        eyebrow="DARI FILE, JADI PAHAM"
        title="Catatanmu punya potensi besar."
        description="Ubah file jadi materi terstruktur, rangkuman, dan latihan dengan Gemini."
        action={
          <span className={`ai-badge ${state.ai.configured ? 'connected' : ''}`}>
            <span className="status-dot" />
            {state.ai.configured ? 'API key Gemini terpasang' : 'Gemini belum terhubung'}
          </span>
        }
      />
      <div className="studio-intro">
        <div className="studio-orbit">
          <Sparkles size={34} />
          <i />
          <i />
        </div>
        <div>
          <span className="eyebrow">KENALAN DENGAN TEMAN BELAJAR BARUMU</span>
          <h2>
            Kamu bawa bahannya.
            <br />
            AI bantu menyusunnya.
          </h2>
          <p>
            Dari catatan kelas sampai modul panjang, ubah jadi langkah belajar yang lebih ringan.
          </p>
        </div>
        <div className="studio-benefits">
          <span>
            <BookOpen size={17} />
            Materi terstruktur
          </span>
          <span>
            <Layers3 size={17} />
            Poin-poin penting
          </span>
          <span>
            <Check size={17} />
            Kuis pemahaman
          </span>
        </div>
      </div>
      {draft ? (
        <section className="panel draft-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DRAF MATERI · TINJAU SEBELUM SIMPAN</span>
              <h2>Ilmu baru, siap dirapikan.</h2>
            </div>
            <button
              className="secondary"
              disabled={saving}
              onClick={() =>
                download(
                  `${draft.title.replace(/[^a-zA-Z0-9 -]/g, '')}.json`,
                  JSON.stringify(draft, null, 2),
                )
              }
            >
              <Download size={16} />
              Unduh draf
            </button>
          </div>
          <div className="review-notice">
            <ShieldCheck size={20} />
            <p>
              Periksa kesesuaian hasil dengan file sumber. Kamu bisa mengedit isi materi dan kunci
              kuis sebelum menyimpan.
            </p>
          </div>
          <label>
            Kurikulum
            <select
              value={draft.curriculum || 'UTBK'}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  curriculum: e.target.value,
                  quiz: draft.quiz?.map((q) => ({ ...q, curriculum: e.target.value })),
                })
              }
            >
              {state.curricula.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Tautan video milikmu (opsional)
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=… atau URL video HTTPS"
              value={draft.videoUrl || ''}
              onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
            />
          </label>
          <label>
            Judul materi
            <input
              value={draft.title}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Ringkasan
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </label>
          {draft.sections.map((s, i) => (
            <details className="draft-section" key={i} open={i === 0}>
              <summary>
                {i + 1}. {s.heading}
                <ChevronDown size={17} />
              </summary>
              <label>
                Judul bagian
                <input
                  value={s.heading}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((v, j) =>
                        j === i ? { ...v, heading: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Isi materi (Markdown)
                <textarea
                  className="content-editor"
                  value={s.content}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((v, j) =>
                        j === i ? { ...v, content: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <div className="markdown-preview">
                <ReactMarkdown>{s.content}</ReactMarkdown>
              </div>
            </details>
          ))}
          <label>
            Poin penting (satu per baris)
            <textarea
              value={draft.keyPoints.join('\n')}
              onChange={(e) => setDraft({ ...draft, keyPoints: e.target.value.split('\n') })}
            />
          </label>
          <h3 className="spaced">Kuis pemahaman</h3>
          <QuestionPreview
            questions={draft.quiz || []}
            onChange={(quiz) => setDraft({ ...draft, quiz })}
          />
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setError('');
              }}
            >
              Buat materi lain
            </button>
            <button
              className="primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  const result = await api<{ id: string }>('/materials', {
                    method: 'POST',
                    body: JSON.stringify({ material: draft, source: file?.name || 'Dokumen' }),
                  });
                  await onSaved(result.id);
                  setDraft(null);
                  toast('Materi dan kuis berhasil disimpan ke koleksimu.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Simpan
              materi & kuis
            </button>
          </div>
        </section>
      ) : (
        <div className="studio-grid">
          <section className="panel upload-panel">
            <div className="section-heading">
              <h2>
                <span className="step-number">01</span>Unggah bahan belajarmu
              </h2>
            </div>
            <FileDrop
              file={file}
              onChange={setFile}
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
              busy={busy}
            />
            <div className="file-privacy">
              <ShieldCheck size={16} />
              <p>
                Saat diproses, file dikirim ke Gemini. File mentah tidak disimpan di server Pahamin.
              </p>
            </div>
          </section>
          <section className="panel generation-panel">
            <h2>
              <span className="step-number">02</span>Sesuaikan hasilnya
            </h2>
            <label>
              Mata pelajaran
              <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy}>
                {state.subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Ada arahan khusus? <span className="optional">opsional</span>
              <textarea
                placeholder="Contoh: jelaskan untuk kelas 12, pakai analogi sehari-hari dan contoh hitungan…"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                maxLength={1000}
                disabled={busy}
              />
            </label>
            <div className="generation-output">
              <span>YANG AKAN KAMU DAPATKAN</span>
              <p>
                <Check size={15} />
                Ringkasan & materi terstruktur
              </p>
              <p>
                <Check size={15} />
                Poin penting untuk diingat
              </p>
              <p>
                <Check size={15} />
                Kuis beserta kunci & pembahasan
              </p>
            </div>
            {!state.ai.configured && (
              <div className="setup-notice">
                <Settings size={18} />
                <p>
                  Hubungkan API key Gemini dulu untuk mulai membuat materi.
                  <button className="text-button" onClick={onSettings}>
                    Lihat pengaturan <ArrowRight size={14} />
                  </button>
                </p>
              </div>
            )}
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary full"
              disabled={busy || !file || !state.ai.configured}
              onClick={async () => {
                if (!requireAccount()) return;
                setBusy(true);
                setError('');
                controller.current = new AbortController();
                const data = new FormData();
                data.append('file', file!);
                data.append('subject', subject);
                data.append('curriculum', state.preferences.curriculum);
                data.append('instruction', instruction);
                try {
                  const r = await api<{ material: Material }>('/ai/generate', {
                    method: 'POST',
                    body: data,
                    signal: controller.current.signal,
                  });
                  setDraft(r.material);
                } catch (e) {
                  if ((e as Error).name !== 'AbortError') setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{' '}
              {busy ? 'Gemini sedang menyusun materi…' : 'Jadikan materi belajar'}
            </button>
            <p className="generation-note">
              {busy
                ? 'Biasanya 15–90 detik. Jika Gemini sibuk, satu percobaan ulang dilakukan otomatis.'
                : 'Hasil selalu ditinjau dulu sebelum masuk koleksi.'}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
