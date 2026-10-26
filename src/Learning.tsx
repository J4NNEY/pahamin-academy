import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  PlayCircle,
  FileText,
  ClipboardList,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Modal, Empty, SearchField } from './ui';
import { AcademyIcon } from './AcademyArt';
import { PageHero } from './ui';
import type { State, Actions, Material } from './types';
import { learningCatalogue, subjectMatches } from './catalogue';
import { DashboardHeader, SuggestedMaterials } from './Dashboard';

export function CurriculumPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(value),
    [busy, setBusy] = useState(false);
  const groups = [
    { title: 'UTBK & Ujian Mandiri', values: ['UTBK', 'UM UGM', 'SIMAK UI'] },
    { title: 'SMA - Kurikulum Merdeka', values: ['Kelas 10', 'Kelas 11', 'Kelas 12'] },
    {
      title: 'SMA - K13 Revisi',
      values: [
        'Kelas 10-IPA',
        'Kelas 10-IPS',
        'Kelas 11-IPA',
        'Kelas 11-IPS',
        'Kelas 12-IPA',
        'Kelas 12-IPS',
      ],
    },
    { title: 'SMP - K13 Revisi', values: ['Kelas 7', 'Kelas 8', 'Kelas 9'] },
  ];
  return (
    <Modal title="Pilih Materi Belajar" onClose={onClose}>
      <div className="curriculum-dialog">
        {groups.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <div>
              {g.values.map((v) => (
                <button
                  className={selected === v ? 'selected' : ''}
                  key={v}
                  onClick={() => setSelected(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        ))}
        <button
          className="primary full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onChange(selected);
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Terapkan
        </button>
      </div>
    </Modal>
  );
}

export function Learning({
  state,
  actions,
  curriculum,
  setCurriculum,
  catalogueOnly = false,
}: {
  state: State;
  actions: Actions;
  curriculum: string;
  setCurriculum: (value: string) => Promise<void>;
  catalogueOnly?: boolean;
}) {
  const [picker, setPicker] = useState(false),
    [query, setQuery] = useState(''),
    [subject, setSubject] = useState<string | null>(null);
  const completed = new Set(state.completed.map((c) => c.id));
  const materials = state.materials.filter(
    (m) =>
      (m.curriculum || 'UTBK') === curriculum &&
      (!subject || subjectMatches(subject, m.subject)) &&
      `${m.title} ${m.subject} ${m.topic}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      {!catalogueOnly ? (
        <DashboardHeader state={state} actions={actions} curriculum={curriculum} />
      ) : (
        <PageHero title="Jelajahi materi" onBack={() => actions.navigate('home')} />
      )}
      <div className={`learning-body ${catalogueOnly ? 'catalogue-page' : 'dashboard-content'}`}>
        <div className="academy-width">
          <section className="white-panel learning-catalogue">
            <div className="catalogue-heading">
              <div>
                <h2>{subject ? `Materi ${subject}` : 'Materi Belajar'}</h2>
                {subject && (
                  <button className="text-button" onClick={() => setSubject(null)}>
                    Semua pelajaran
                  </button>
                )}
              </div>
              <button className="curriculum-button" onClick={() => setPicker(true)}>
                {curriculum}
                <ChevronDown size={18} />
              </button>
            </div>
            <SearchField value={query} onChange={setQuery} placeholder="Cari materi belajar…" />
            {!subject && !query ? (
              <>
                <div className="learning-subjects">
                  {(curriculum === 'UTBK'
                    ? learningCatalogue.map((s) => s.label)
                    : state.subjects
                  ).map((s) => {
                    const count = state.materials.filter(
                      (m) =>
                        subjectMatches(s, m.subject) && (m.curriculum || 'UTBK') === curriculum,
                    ).length;
                    return (
                      <button key={s} onClick={() => setSubject(s)}>
                        <AcademyIcon kind={s} />
                        <strong>{s}</strong>
                        <small>{count} materi</small>
                      </button>
                    );
                  })}
                </div>
                <button className="bookmark-row" onClick={() => actions.navigate('collection')}>
                  <AcademyIcon kind="learning" />
                  <strong>Bookmark</strong>
                  <span>{state.bookmarks.length}</span>
                  <ChevronRight size={17} />
                </button>
              </>
            ) : materials.length ? (
              <div className="lesson-list">
                {materials.map((m) => (
                  <button className="lesson-row" key={m.id} onClick={() => actions.openMaterial(m)}>
                    <span className="lesson-icon">
                      <FileText size={24} />
                    </span>
                    <div>
                      <span className="lesson-subject">
                        {m.subject} ·{' '}
                        {m.origin === 'academy'
                          ? 'Pahamin Academy'
                          : m.source.startsWith('Gemini')
                            ? 'Materi AI'
                            : 'Materi contoh'}
                      </span>
                      <h3>{m.title}</h3>
                      <p>
                        {m.topic} · {m.minutes} menit
                      </p>
                    </div>
                    {completed.has(m.id) ? (
                      <CheckCircle2 className="success-color" size={20} />
                    ) : (
                      <ChevronRight size={19} />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title="Materi belum tersedia"
                description={`Belum ada materi ${subject || 'yang cocok'} untuk ${curriculum}. Buat materi dari file di AI Studio atau pilih kurikulum lain.`}
                action={
                  <button className="primary" onClick={() => actions.navigate('ai')}>
                    <Sparkles size={16} />
                    Buat materi AI
                  </button>
                }
              />
            )}
          </section>
          {!catalogueOnly && (
            <SuggestedMaterials state={state} actions={actions} curriculum={curriculum} />
          )}
        </div>
      </div>
      {picker && (
        <CurriculumPicker
          value={curriculum}
          onChange={setCurriculum}
          onClose={() => {
            setPicker(false);
            setSubject(null);
          }}
        />
      )}
    </>
  );
}

export function MaterialReader({
  material,
  state,
  actions,
  onClose,
}: {
  material: Material;
  state: State;
  actions: Actions;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('summary');
  const done = state.completed.some((c) => c.id === material.id),
    saved = state.bookmarks.includes(material.id);
  let youtube = '';
  try {
    if (material.videoUrl) {
      const url = new URL(material.videoUrl);
      if (url.hostname === 'youtu.be') youtube = url.pathname.slice(1);
      else if (['www.youtube.com', 'youtube.com'].includes(url.hostname))
        youtube = url.searchParams.get('v') || url.pathname.split('/embed/')[1] || '';
      if (!/^[a-zA-Z0-9_-]{11}$/.test(youtube)) youtube = '';
    }
  } catch {}
  return (
    <Modal title={material.subject} onClose={onClose} wide>
      <article className="reader">
        <div className="reader-title">
          <h1>{material.title}</h1>
          <button
            className={`reader-bookmark ${saved ? 'saved' : ''}`}
            onClick={() => void actions.mutate(`/materials/${material.id}/bookmark`)}
            aria-label={saved ? 'Hapus bookmark materi' : 'Bookmark materi'}
          >
            <Bookmark size={23} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="reader-meta">
          <span>
            <Clock size={14} />
            {material.minutes} menit
          </span>
          <span>{material.source}</span>
          <span>{material.curriculum || 'UTBK'}</span>
        </div>
        <div className="content-tabs">
          <button className={tab === 'video' ? 'active' : ''} onClick={() => setTab('video')}>
            <PlayCircle size={16} />
            Video
          </button>
          <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
            <FileText size={16} />
            Rangkuman
          </button>
          <button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}>
            <ClipboardList size={16} />
            Kuis
          </button>
        </div>
        {tab === 'video' ? (
          material.videoUrl ? (
            <div className="video-player">
              {youtube ? (
                <iframe
                  title={`Video ${material.title}`}
                  src={`https://www.youtube-nocookie.com/embed/${youtube}`}
                  allowFullScreen
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video src={material.videoUrl} controls preload="metadata" />
              )}
            </div>
          ) : (
            <Empty
              title="Video belum ditambahkan"
              description="Materi ini tersedia sebagai rangkuman. Materi AI dapat dilengkapi tautan video milikmu saat meninjau draf."
              action={
                <button className="secondary" onClick={() => setTab('summary')}>
                  Baca rangkuman
                </button>
              }
            />
          )
        ) : tab === 'summary' ? (
          <>
            <p className="reader-intro">{material.summary}</p>
            {material.sections.map((s, i) => (
              <section key={i}>
                <h2>{s.heading}</h2>
                <ReactMarkdown>{s.content}</ReactMarkdown>
              </section>
            ))}
            <div className="key-points">
              <h3>Yang perlu kamu ingat</h3>
              <ul>
                {material.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="reader-quiz">
            <AcademyIcon kind="tryout" size="large" />
            <h2>Sudah paham? Yuk, uji!</h2>
            <p>
              Latihan soal dari topik dan pelajaran ini. Nilai serta pembahasan muncul setelah
              selesai.
            </p>
            <button
              className="primary"
              disabled={actions.busy}
              onClick={() =>
                void actions.start({
                  subject: material.subject,
                  topic: material.topic,
                  count: 5,
                  curriculum: material.curriculum || 'UTBK',
                })
              }
            >
              Mulai kuis <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="reader-actions">
          <button className="secondary" onClick={() => setTab('quiz')}>
            Uji pemahaman <ArrowRight size={16} />
          </button>
          <button
            className="primary"
            disabled={done}
            onClick={() => void actions.mutate(`/materials/${material.id}/complete`)}
          >
            <CheckCircle2 size={17} />
            {done ? 'Sudah dipahami' : 'Tandai sudah paham'}
          </button>
        </div>
      </article>
    </Modal>
  );
}

export function Collection({ state, actions }: { state: State; actions: Actions }) {
  const [tab, setTab] = useState('materials');
  const materials = state.materials.filter((m) => state.bookmarks.includes(m.id)),
    questions = state.questions.filter((q) => state.questionBookmarks.includes(q.id || ''));
  return (
    <>
      <PageHero title="Bookmark" onBack={() => actions.navigate('home')} />
      <div className="academy-width page-content">
        <div className="content-tabs">
          <button
            className={tab === 'materials' ? 'active' : ''}
            onClick={() => setTab('materials')}
          >
            Materi ({materials.length})
          </button>
          <button
            className={tab === 'questions' ? 'active' : ''}
            onClick={() => setTab('questions')}
          >
            Soal ({questions.length})
          </button>
          <button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>
            Materi AI
          </button>
        </div>
        {tab === 'questions' ? (
          questions.length ? (
            <div className="white-panel question-list">
              {questions.map((q) => (
                <div className="saved-question" key={q.id}>
                  <div>
                    <small>
                      {q.subject} · {q.topic}
                    </small>
                    <h3>{q.question}</h3>
                  </div>
                  <button
                    className="secondary"
                    onClick={() =>
                      void actions.start({
                        subject: q.subject,
                        topic: q.topic,
                        count: 5,
                        curriculum: q.curriculum || 'UTBK',
                      })
                    }
                  >
                    Latihan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Belum ada soal tersimpan"
              description="Simpan soal dari Bank Soal untuk dipelajari kembali."
              action={
                <button className="primary" onClick={() => actions.navigate('questions')}>
                  Buka Bank Soal
                </button>
              }
            />
          )
        ) : (
          <div className="white-panel lesson-list">
            {(tab === 'ai'
              ? state.materials.filter((m) => m.source.startsWith('Gemini'))
              : materials
            ).map((m) => (
              <button key={m.id} className="lesson-row" onClick={() => actions.openMaterial(m)}>
                <AcademyIcon kind={m.subject} />
                <div>
                  <small>{m.subject}</small>
                  <h3>{m.title}</h3>
                  <p>{m.source}</p>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
            {!(
              tab === 'ai'
                ? state.materials.filter((m) => m.source.startsWith('Gemini'))
                : materials
            ).length && (
              <Empty
                title={
                  tab === 'ai' ? 'Materi AI-mu akan muncul di sini' : 'Belum ada bookmark materi'
                }
                description="Simpan materi favorit atau buat dari file lewat AI Studio."
                action={
                  <button
                    className="primary"
                    onClick={() => actions.navigate(tab === 'ai' ? 'ai' : 'materials')}
                  >
                    Mulai sekarang <ArrowRight size={16} />
                  </button>
                }
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function StudyHistory({ state, actions }: { state: State; actions: Actions }) {
  const [tab, setTab] = useState('all');
  const attempts = state.attempts.filter((a) => tab === 'all' || a.mode === tab);
  return (
    <>
      <PageHero title="Riwayat Belajar" onBack={() => actions.navigate('home')} />
      <div className="academy-width page-content">
        <div className="content-tabs">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'practice', label: 'Bank Soal' },
            { id: 'tryout', label: 'Tryout' },
          ].map((t) => (
            <button
              className={tab === t.id ? 'active' : ''}
              key={t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="white-panel history-list">
          {attempts.map((a) => (
            <button className="history-row" key={a.id} onClick={() => actions.showResult(a.result)}>
              <AcademyIcon kind={a.mode === 'tryout' ? 'tryout' : 'questions'} />
              <div>
                <strong>{a.mode === 'tryout' ? 'Tryout' : 'Latihan Bank Soal'}</strong>
                <p>
                  {a.result.total} soal · {new Date(a.result.finishedAt).toLocaleString('id-ID')}
                </p>
              </div>
              <span className="history-score">
                {a.result.score}
                <small>/100</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
          {!attempts.length && (
            <Empty
              title="Belum ada latihan selesai"
              description="Kerjakan latihan atau tryout. Hasil dan pembahasannya akan tersimpan di sini."
              action={
                <button className="primary" onClick={() => actions.navigate('questions')}>
                  Mulai latihan
                </button>
              }
            />
          )}
        </div>
        {tab === 'all' && state.completed.length > 0 && (
          <section className="white-panel completed-materials">
            <h2>Materi yang sudah dipahami</h2>
            {state.completed.map((c) => {
              const m = state.materials.find((m) => m.id === c.id);
              return (
                m && (
                  <button className="lesson-row" key={c.id} onClick={() => actions.openMaterial(m)}>
                    <CheckCircle2 className="success-color" />
                    <div>
                      <h3>{m.title}</h3>
                      <p>{new Date(c.date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                )
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}
