import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Diamond,
  Coins,
  Search,
  X,
  Upload,
  Sparkles,
  BookOpen,
  PlayCircle,
  FileText,
  ClipboardList,
  Check,
  History,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Modal, Empty, SearchField } from './ui';
import { AcademyIcon } from './AcademyArt';
import { PageHero } from './ui';
import type { State, Actions, Material } from './types';
import { learningCatalogue, subjectMatches } from './catalogue';

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
    [subject, setSubject] = useState<string | null>(null),
    [slide, setSlide] = useState(0);
  const completed = new Set(state.completed.map((c) => c.id));
  const points =
      state.completed.length * 20 + state.attempts.reduce((n, a) => n + a.result.correct * 10, 0),
    level = Math.floor(points / 100) + 1;
  const materials = state.materials.filter(
    (m) =>
      (m.curriculum || 'UTBK') === curriculum &&
      (!subject || subjectMatches(subject, m.subject)) &&
      `${m.title} ${m.subject} ${m.topic}`.toLowerCase().includes(query.toLowerCase()),
  );
  const features = [
    { label: 'Pegasus', kind: 'pegasus', page: 'pegasus' },
    { label: 'Bank Soal', kind: 'questions', page: 'questions' },
    { label: 'Tryout', kind: 'tryout', page: 'tryout' },
    { label: 'Sikat Soal', kind: 'quick', page: 'quick' },
  ] as const;
  return (
    <>
      {!catalogueOnly ? (
        <section className="learner-hero">
          <div className="academy-width">
            <div className="learner-top">
              <span className="learner-avatar">
                {state.user?.name.charAt(0).toUpperCase() || 'P'}
              </span>
              <span className="free-badge">Free</span>
              <span className="learner-name">{state.user?.name || 'Teman belajar'}</span>
              <div className="learner-wallet">
                <span title="Tidak ada mata uang berbayar">
                  <Diamond size={22} fill="#f2a5d9" />0
                </span>
                <span title="Poin belajar dari aktivitas aktual">
                  <Coins size={22} fill="#ffdc65" />
                  {points}
                </span>
              </div>
            </div>
            <div className="experience-track">
              <i style={{ width: `${points % 100}%` }} />
            </div>
            <div className="experience-meta">
              <strong>Level {level}</strong>
              <span>{points % 100}/100 exp</span>
            </div>
            <button className="learner-announcement" onClick={() => actions.navigate('ai')}>
              <strong>Belajar dari file kamu sendiri</strong>
              <span>
                Buka AI Studio <ArrowRight size={15} />
              </span>
            </button>
          </div>
        </section>
      ) : (
        <PageHero title="Materi Belajar" onBack={() => actions.navigate('home')} />
      )}
      <div className="learning-body">
        <div className="academy-width">
          {!catalogueOnly && (
            <section className="white-panel feature-shortcuts">
              <h2>Fitur Belajar</h2>
              <div>
                {features.map((f) => (
                  <button key={f.kind} onClick={() => actions.navigate(f.page)}>
                    <AcademyIcon kind={f.kind} />
                    <strong>{f.label}</strong>
                    {f.kind === 'pegasus' && <small>Baru</small>}
                  </button>
                ))}
              </div>
            </section>
          )}
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
                        {m.source.startsWith('Gemini') ? 'Materi AI' : 'Materi contoh'}
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
            <>
              <div className="home-promos">
                <section>
                  <h2>Tryout</h2>
                  <button
                    className="home-promo-card tryout-promo"
                    onClick={() => actions.navigate('tryout')}
                  >
                    <AcademyIcon kind="tryout" size="large" />
                    <div>
                      <h3>Tryout Pahamin</h3>
                      <p>Uji dan asah kemampuanmu sebelum UTBK, Ujian Mandiri dan TKA!</p>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                </section>
                <section>
                  <h2>Cari Jawaban Soal atau PR?</h2>
                  <button
                    className="home-promo-card tutor-promo"
                    onClick={() => actions.navigate('tutor')}
                  >
                    <AcademyIcon kind="tutor" size="large" />
                    <div>
                      <h3>Tanya Mipi</h3>
                      <p>Diskusikan soal atau unggah foto. Pahami langkahnya bersama Gemini.</p>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                </section>
              </div>
              <section className="explore-section">
                <div className="catalogue-heading">
                  <h2>Materi Belajar {slide === 0 ? 'UTBK' : 'TKA SMA'}</h2>
                  <div className="carousel-controls">
                    <button
                      aria-label="Banner sebelumnya"
                      onClick={() => setSlide(slide === 0 ? 1 : 0)}
                    >
                      ‹
                    </button>
                    <button
                      aria-label="Banner berikutnya"
                      onClick={() => setSlide(slide === 0 ? 1 : 0)}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <button
                  className={`explore-banner slide-${slide}`}
                  onClick={() => actions.navigate('materials')}
                >
                  <div>
                    <small>LANGKAH KECIL, HASIL MAKSIMAL</small>
                    <h3>
                      {slide === 0 ? 'Siapkan UTBK dari sekarang!' : 'Makin siap menghadapi TKA.'}
                    </h3>
                    <p>Pelajari konsep, latih soal, dan pantau perkembanganmu.</p>
                    <span>
                      Mulai belajar <ArrowRight size={15} />
                    </span>
                  </div>
                  <AcademyIcon kind={slide === 0 ? 'degree' : 'learning'} size="large" />
                </button>
              </section>
              <section className="explore-section">
                <h2>Explore Pahamin</h2>
                <div className="explore-tiles">
                  <button onClick={() => actions.navigate('pegasus')}>
                    <AcademyIcon kind="pegasus" />
                    <strong>Rencanakan targetmu</strong>
                    <p>Pegasus bantu memilih fokus latihan.</p>
                  </button>
                  <button onClick={() => actions.navigate('ai')}>
                    <AcademyIcon kind="ai" />
                    <strong>File jadi materi belajar</strong>
                    <p>Rangkuman dan kuis dari catatanmu.</p>
                  </button>
                  <button onClick={() => actions.navigate('live')}>
                    <AcademyIcon kind="live" />
                    <strong>Jadwal Live Class</strong>
                    <p>Kelola sesi dan rekaman kelasmu.</p>
                  </button>
                </div>
              </section>
              <section className="explore-section">
                <h2>Tips & Motivasi</h2>
                <div className="study-tip">
                  <span>💡</span>
                  <div>
                    <h3>Paham konsepnya, bukan cuma hafal jawabannya.</h3>
                    <p>
                      Coba jelaskan kembali materi dengan kata-katamu sendiri. Lalu kerjakan soal
                      untuk menguji pemahaman.
                    </p>
                  </div>
                  <button className="text-button" onClick={() => actions.navigate('quick')}>
                    Sikat soal <ArrowRight size={15} />
                  </button>
                </div>
              </section>
            </>
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
