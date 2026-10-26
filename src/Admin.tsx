import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Plus,
  Upload,
  Search,
  Pencil,
  Archive,
  RotateCcw,
  ShieldCheck,
  LoaderCircle,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from './api';
import type { Actions, Material, Question, State } from './types';
import { Empty, Modal, PageHero } from './ui';
import { AIStudio, ImportDialog } from './Studio';
import './admin.css';

type ContentStatus = 'draft' | 'published' | 'archived';
type Entry = {
  id: string;
  kind: 'material' | 'question';
  status: ContentStatus;
  revision: number;
  payload: Material | Question;
  updatedAt: string;
};
type MaterialDraft = Pick<
  Material,
  'title' | 'subject' | 'topic' | 'summary' | 'sections' | 'keyPoints' | 'videoUrl' | 'curriculum'
>;
const statusLabels = { draft: 'Draf', published: 'Terbit', archived: 'Arsip' };
const newMaterial = (curriculum: string): MaterialDraft => ({
  title: '',
  subject: 'Matematika',
  topic: '',
  curriculum,
  summary: '',
  sections: [{ heading: '', content: '' }],
  keyPoints: [''],
  videoUrl: '',
});
const newQuestion = (curriculum: string): Question => ({
  subject: 'Matematika',
  curriculum,
  topic: '',
  difficulty: 'Mudah',
  question: '',
  options: ['', '', '', ''],
  answer: 0,
  explanation: '',
});

export function Admin({ state, actions }: { state: State; actions: Actions }) {
  const allowed = state.user?.role === 'admin';
  const [entries, setEntries] = useState<Entry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [kind, setKind] = useState<'material' | 'question'>('material'),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('all');
  const [subject, setSubject] = useState('all'),
    [curriculum, setCurriculum] = useState('all');
  const [editor, setEditor] = useState<{ kind: Entry['kind']; entry?: Entry } | null>(null),
    [importOpen, setImportOpen] = useState(false);
  const [archive, setArchive] = useState<Entry | null>(null),
    [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]);
  useEffect(() => setSelected([]), [kind, search, status, subject, curriculum]);
  async function reload() {
    setLoading(true);
    setError('');
    try {
      setEntries((await api<{ entries: Entry[] }>('/admin/content')).entries);
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!allowed) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let active = true;
    void api<{ entries: Entry[] }>('/admin/content')
      .then((r) => {
        if (active) setEntries(r.entries);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed]);
  async function changeStatus(item: Entry, next: ContentStatus) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/content/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next, revision: item.revision }),
      });
      setArchive(null);
      await reload();
      await actions.refresh();
      actions.notify(
        next === 'published'
          ? 'Konten diterbitkan untuk semua siswa.'
          : next === 'archived'
            ? 'Konten dipindahkan ke arsip.'
            : 'Konten disimpan sebagai draf.',
      );
    } catch (e) {
      setArchive(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeSelected(next: ContentStatus) {
    setBusy(true);
    setError('');
    try {
      await api('/admin/content/status', {
        method: 'POST',
        body: JSON.stringify({
          status: next,
          items: entries
            .filter((e) => selected.includes(e.id))
            .map((e) => ({ id: e.id, revision: e.revision })),
        }),
      });
      await reload();
      await actions.refresh();
      actions.notify('Status konten terpilih berhasil diperbarui.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = entries.filter(
    (e) =>
      e.kind === kind &&
      (status === 'all' ? e.status !== 'archived' : e.status === status) &&
      (subject === 'all' || e.payload.subject === subject) &&
      (curriculum === 'all' || e.payload.curriculum === curriculum) &&
      `${'title' in e.payload ? e.payload.title : e.payload.question} ${e.payload.topic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHero
        title="Panel Admin"
        onBack={() => actions.navigate('home')}
        actions={
          <span className="hero-badge">
            <ShieldCheck size={16} /> Pengelola konten
          </span>
        }
      />
      <div className="academy-width page-content admin-page">
        {!allowed ? (
          <Empty
            title="Akses khusus admin"
            description={
              state.user
                ? 'Akun ini belum memiliki akses admin. Hubungi pengelola aplikasi.'
                : 'Masuk dengan akun admin untuk mengelola materi dan soal.'
            }
            action={
              <button
                className="primary"
                onClick={() => (state.user ? actions.navigate('home') : actions.requireAccount())}
              >
                {state.user ? 'Kembali belajar' : 'Masuk'}
              </button>
            }
          />
        ) : (
          <>
            <div className="admin-heading">
              <div>
                <span className="eyebrow">RUANG KELOLA KONTEN</span>
                <h1>Siapkan ilmu untuk siswa.</h1>
                <p>Susun, tinjau, lalu terbitkan materi dan soal ke seluruh kelas.</p>
              </div>
              <ShieldCheck size={42} />
            </div>
            <div className="admin-stats">
              {(
                [
                  { type: 'material', label: 'Materi', icon: BookOpen },
                  { type: 'question', label: 'Soal', icon: ClipboardList },
                ] as const
              ).map((s) => (
                <button
                  key={s.type}
                  onClick={() => {
                    setKind(s.type);
                    setStatus('all');
                  }}
                >
                  <s.icon size={22} />
                  <strong>
                    {entries.filter((e) => e.kind === s.type && e.status !== 'archived').length}
                  </strong>
                  <span>{s.label}</span>
                </button>
              ))}
              <button onClick={() => setStatus('published')}>
                <Eye size={22} />
                <strong>
                  {entries.filter((e) => e.kind === kind && e.status === 'published').length}
                </strong>
                <span>{kind === 'material' ? 'Materi' : 'Soal'} terbit</span>
              </button>
              <button onClick={() => setStatus('draft')}>
                <Pencil size={22} />
                <strong>
                  {entries.filter((e) => e.kind === kind && e.status === 'draft').length}
                </strong>
                <span>Menunggu terbit</span>
              </button>
            </div>
            <section className="panel admin-library">
              <div className="admin-library-heading">
                <div className="admin-tabs" role="group" aria-label="Jenis konten">
                  <button
                    className={kind === 'material' ? 'active' : ''}
                    onClick={() => setKind('material')}
                  >
                    <BookOpen size={17} /> Materi
                  </button>
                  <button
                    className={kind === 'question' ? 'active' : ''}
                    onClick={() => setKind('question')}
                  >
                    <ClipboardList size={17} /> Soal
                  </button>
                </div>
                <div className="admin-buttons">
                  {kind === 'question' ? (
                    <button className="secondary" onClick={() => setImportOpen(true)}>
                      <Upload size={16} /> Impor soal
                    </button>
                  ) : (
                    <button className="secondary" onClick={() => setAiOpen(true)}>
                      <Sparkles size={16} /> Dari file (AI)
                    </button>
                  )}
                  <button className="primary" onClick={() => setEditor({ kind })}>
                    <Plus size={17} /> Tambah {kind === 'material' ? 'materi' : 'soal'}
                  </button>
                </div>
              </div>
              <div className="admin-filters">
                <label className="admin-search">
                  <Search size={17} />
                  <input
                    aria-label="Cari konten"
                    placeholder="Cari judul, soal, atau topik…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Semua aktif</option>
                  {Object.entries(statusLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter pelajaran"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="all">Semua pelajaran</option>
                  {state.subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter kurikulum"
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                >
                  <option value="all">Semua kurikulum</option>
                  {state.curricula.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <p className="admin-library-note">
                Konten terbit tersedia di halaman Belajar dan Bank Soal. Materi contoh bawaan dan
                koleksi pribadi dikelola terpisah.
              </p>
              {!!filtered.length && (
                <div className="admin-bulk">
                  <label>
                    <input
                      type="checkbox"
                      aria-label="Pilih semua konten yang ditampilkan (maksimal 200)"
                      checked={filtered.slice(0, 200).every((e) => selected.includes(e.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? filtered.slice(0, 200).map((e) => e.id) : [])
                      }
                      disabled={busy}
                    />{' '}
                    {selected.length ? `${selected.length} dipilih` : 'Pilih konten'}
                  </label>
                  {!!selected.length && (
                    <>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void changeSelected('published')}
                      >
                        Terbitkan pilihan
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void changeSelected('draft')}
                      >
                        Jadikan draf
                      </button>
                    </>
                  )}
                </div>
              )}
              {error && (
                <div className="error-box" role="alert">
                  {error}{' '}
                  <button className="text-button" onClick={() => void reload()}>
                    Muat ulang daftar
                  </button>
                </div>
              )}
              {loading ? (
                <p className="admin-loading" role="status">
                  <LoaderCircle className="spin" size={20} /> Memuat konten…
                </p>
              ) : !error && !filtered.length ? (
                <Empty
                  title={
                    search || status !== 'all' || subject !== 'all' || curriculum !== 'all'
                      ? 'Belum ada konten yang cocok'
                      : `Belum ada ${kind === 'material' ? 'materi' : 'soal'} admin`
                  }
                  description="Tambahkan konten baru atau sesuaikan filter untuk melihat daftar."
                />
              ) : (
                <div className="admin-content-list">
                  {filtered.map((item) => (
                    <article className="admin-content-row" key={item.id}>
                      <input
                        className="admin-row-checkbox"
                        type="checkbox"
                        aria-label={`Pilih ${'title' in item.payload ? item.payload.title : item.payload.question}`}
                        checked={selected.includes(item.id)}
                        disabled={busy || (!selected.includes(item.id) && selected.length >= 200)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, item.id]
                              : selected.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <span className={`admin-content-icon ${item.kind}`}>
                        {item.kind === 'material' ? (
                          <BookOpen size={22} />
                        ) : (
                          <ClipboardList size={22} />
                        )}
                      </span>
                      <div className="admin-content-copy">
                        <span className={`admin-status ${item.status}`}>
                          {statusLabels[item.status]}
                        </span>
                        <h3>
                          {'title' in item.payload ? item.payload.title : item.payload.question}
                        </h3>
                        <p>
                          {item.payload.subject} · {item.payload.topic} · {item.payload.curriculum}
                        </p>
                        <small>
                          Diperbarui{' '}
                          {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </small>
                      </div>
                      <div className="admin-row-actions">
                        {item.status === 'archived' ? (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => void changeStatus(item, 'draft')}
                          >
                            <RotateCcw size={15} /> Pulihkan draf
                          </button>
                        ) : (
                          <>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => setEditor({ kind: item.kind, entry: item })}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                void changeStatus(
                                  item,
                                  item.status === 'published' ? 'draft' : 'published',
                                )
                              }
                            >
                              {item.status === 'published' ? 'Tarik ke draf' : 'Terbitkan'}
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Arsipkan ${'title' in item.payload ? item.payload.title : item.payload.question}`}
                              disabled={busy}
                              onClick={() => setArchive(item)}
                            >
                              <Archive size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="admin-list-footer">
                <span>{filtered.length} konten ditampilkan</span>
                <button className="text-button" disabled={loading} onClick={() => void reload()}>
                  <RotateCcw size={14} /> Muat ulang
                </button>
              </div>
            </section>
          </>
        )}
      </div>
      {allowed && editor && (
        <ContentEditor
          state={state}
          kind={editor.kind}
          entry={editor.entry}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await reload();
            await actions.refresh();
            actions.notify('Konten berhasil disimpan.');
          }}
        />
      )}
      {allowed && importOpen && (
        <ImportDialog
          admin
          subjects={state.subjects}
          curriculum={curriculum === 'all' ? state.preferences.curriculum : curriculum}
          aiConfigured={state.ai.configured}
          onClose={() => setImportOpen(false)}
          onSaved={async (count, skipped) => {
            setImportOpen(false);
            await reload();
            actions.notify(
              `${count} soal disimpan sebagai draf${skipped ? `, ${skipped} duplikat dilewati` : ''}.`,
            );
          }}
        />
      )}
      {allowed && aiOpen && (
        <Modal title="Buat draf dari file" wide onClose={() => setAiOpen(false)}>
          <div className="admin-ai">
            <AIStudio
              admin
              state={state}
              requireAccount={actions.requireAccount}
              onSettings={() => {
                setAiOpen(false);
                actions.navigate('settings');
              }}
              toast={actions.notify}
              onSaved={async () => {
                setAiOpen(false);
                await reload();
              }}
            />
          </div>
        </Modal>
      )}
      {allowed && archive && (
        <Modal
          title="Arsipkan konten?"
          onClose={() => {
            if (!busy) setArchive(null);
          }}
        >
          <div className="admin-confirm">
            <p>
              <strong>
                {'title' in archive.payload ? archive.payload.title : archive.payload.question}
              </strong>
            </p>
            <p>
              Konten akan hilang dari katalog siswa. Riwayat latihan yang sudah dimulai tetap
              tersimpan. Kamu bisa memulihkannya sebagai draf.
            </p>
            <div className="dialog-actions">
              <button className="secondary" disabled={busy} onClick={() => setArchive(null)}>
                Batal
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void changeStatus(archive, 'archived')}
              >
                {busy ? 'Mengarsipkan…' : 'Arsipkan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ContentEditor({
  state,
  kind,
  entry,
  onClose,
  onSaved,
}: {
  state: State;
  kind: Entry['kind'];
  entry?: Entry;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [material, setMaterial] = useState<MaterialDraft>(() =>
    entry && kind === 'material'
      ? (entry.payload as Material)
      : newMaterial(state.preferences.curriculum),
  );
  const [question, setQuestion] = useState<Question>(() =>
    entry && kind === 'question'
      ? (entry.payload as Question)
      : newQuestion(state.preferences.curriculum),
  );
  const [status, setStatus] = useState(entry?.status === 'published' ? 'published' : 'draft'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false);
  const content = kind === 'material' ? material : question;
  const change = (key: 'subject' | 'topic' | 'curriculum', value: string) =>
    kind === 'material'
      ? setMaterial({ ...material, [key]: value })
      : setQuestion({ ...question, [key]: value });
  return (
    <Modal
      wide
      title={`${entry ? 'Edit' : 'Tambah'} ${kind === 'material' ? 'materi' : 'soal'}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="admin-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api(
              `/admin/${kind === 'material' ? 'materials' : 'questions'}${entry ? '/' + entry.id : ''}`,
              {
                method: entry ? 'PUT' : 'POST',
                body: JSON.stringify({
                  content,
                  status,
                  ...(entry ? { revision: entry.revision } : {}),
                }),
              },
            );
            await onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="admin-form-grid">
            <label>
              Mata pelajaran
              <select value={content.subject} onChange={(e) => change('subject', e.target.value)}>
                {state.subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Kurikulum
              <select
                value={content.curriculum || 'UTBK'}
                onChange={(e) => change('curriculum', e.target.value)}
              >
                {state.curricula.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Topik
            <input
              required
              minLength={2}
              maxLength={120}
              value={content.topic}
              placeholder="Contoh: Persamaan linear"
              onChange={(e) => change('topic', e.target.value)}
            />
          </label>
          {kind === 'material' ? (
            <>
              <label>
                Judul materi
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={material.title}
                  onChange={(e) => setMaterial({ ...material, title: e.target.value })}
                />
              </label>
              <label>
                Ringkasan
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={3}
                  value={material.summary}
                  onChange={(e) => setMaterial({ ...material, summary: e.target.value })}
                />
              </label>
              <label>
                Tautan video (opsional)
                <input
                  type="url"
                  maxLength={1500}
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={material.videoUrl || ''}
                  onChange={(e) => setMaterial({ ...material, videoUrl: e.target.value })}
                />
              </label>
              <div className="admin-section-heading">
                <h3>Bagian materi</h3>
                <button type="button" className="text-button" onClick={() => setPreview(!preview)}>
                  <Eye size={16} /> {preview ? 'Tutup pratinjau' : 'Pratinjau teks'}
                </button>
              </div>
              {material.sections.map((section, i) => (
                <section className="admin-section-editor" key={i}>
                  <div className="admin-section-heading">
                    <strong>Bagian {i + 1}</strong>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Hapus bagian ${i + 1}`}
                      disabled={material.sections.length === 1}
                      onClick={() =>
                        setMaterial({
                          ...material,
                          sections: material.sections.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <label>
                    Judul bagian
                    <input
                      required
                      minLength={2}
                      maxLength={200}
                      value={section.heading}
                      onChange={(e) =>
                        setMaterial({
                          ...material,
                          sections: material.sections.map((s, j) =>
                            j === i ? { ...s, heading: e.target.value } : s,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Isi materi (Markdown)
                    <textarea
                      required
                      minLength={10}
                      maxLength={12000}
                      rows={7}
                      value={section.content}
                      onChange={(e) =>
                        setMaterial({
                          ...material,
                          sections: material.sections.map((s, j) =>
                            j === i ? { ...s, content: e.target.value } : s,
                          ),
                        })
                      }
                    />
                  </label>
                  {preview && (
                    <div className="markdown-preview">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  )}
                </section>
              ))}
              <button
                type="button"
                className="secondary"
                disabled={material.sections.length >= 12}
                onClick={() =>
                  setMaterial({
                    ...material,
                    sections: [...material.sections, { heading: '', content: '' }],
                  })
                }
              >
                <Plus size={16} /> Tambah bagian
              </button>
              <label>
                Poin penting (satu per baris, maksimal 12)
                <textarea
                  required
                  rows={4}
                  value={material.keyPoints.join('\n')}
                  onChange={(e) =>
                    setMaterial({ ...material, keyPoints: e.target.value.split('\n') })
                  }
                />
              </label>
              <p className="small muted">
                Tambahkan soal latihan dengan pelajaran, kurikulum, dan topik yang sama melalui tab
                Soal.
              </p>
            </>
          ) : (
            <>
              <label>
                Tingkat kesulitan
                <select
                  value={question.difficulty}
                  onChange={(e) => setQuestion({ ...question, difficulty: e.target.value })}
                >
                  {['Mudah', 'Sedang', 'Sulit'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Pertanyaan
                <textarea
                  required
                  minLength={5}
                  maxLength={6000}
                  rows={4}
                  value={question.question}
                  onChange={(e) => setQuestion({ ...question, question: e.target.value })}
                />
              </label>
              <h3>Pilihan & kunci jawaban</h3>
              <p className="small muted">Pilih lingkaran pada jawaban yang benar.</p>
              <div className="admin-options">
                {question.options.map((option, i) => (
                  <div className={question.answer === i ? 'selected' : ''} key={i}>
                    <input
                      type="radio"
                      name="answer"
                      aria-label={`Kunci jawaban ${String.fromCharCode(65 + i)}`}
                      checked={question.answer === i}
                      onChange={() => setQuestion({ ...question, answer: i })}
                    />
                    <b>{String.fromCharCode(65 + i)}</b>
                    <input
                      required
                      maxLength={2000}
                      aria-label={`Pilihan ${String.fromCharCode(65 + i)}`}
                      value={option}
                      onChange={(e) =>
                        setQuestion({
                          ...question,
                          options: question.options.map((o, j) => (j === i ? e.target.value : o)),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setQuestion({
                    ...question,
                    options:
                      question.options.length === 4
                        ? [...question.options, '']
                        : question.options.slice(0, 4),
                    answer: question.answer === 4 ? 0 : question.answer,
                  })
                }
              >
                {question.options.length === 4 ? '+ Tambah pilihan E' : 'Hapus pilihan E'}
              </button>
              <label>
                Pembahasan
                <textarea
                  required
                  minLength={5}
                  maxLength={6000}
                  rows={4}
                  value={question.explanation || ''}
                  onChange={(e) => setQuestion({ ...question, explanation: e.target.value })}
                />
              </label>
            </>
          )}
          <label>
            Status konten
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draf — hanya admin</option>
              <option value="published">Terbit — semua siswa</option>
            </select>
          </label>
          {status === 'published' && (
            <p className="admin-publish-note">
              <Eye size={17} /> Setelah disimpan, perubahan langsung terlihat oleh semua siswa.
            </p>
          )}
        </fieldset>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={16} />}
            {busy ? 'Menyimpan…' : status === 'published' ? 'Simpan & terbitkan' : 'Simpan draf'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
