import { useState } from 'react';
import {
  Search,
  ChevronRight,
  Bookmark,
  Upload,
  Trophy,
  Clock,
  ClipboardList,
  ArrowRight,
  CalendarDays,
  History,
  CheckCircle2,
  Diamond,
  Target,
  LoaderCircle,
} from 'lucide-react';
import { api } from './api';
import { Modal, Empty, SearchField } from './ui';
import { PageHero } from './ui';
import { AcademyIcon, StudyBanner } from './AcademyArt';
import { CurriculumPicker } from './Learning';
import type { State, Actions } from './types';

type Leaderboard = {
  scope: string;
  rows: {
    rank: number;
    name: string;
    points: number;
    correct: number;
    total: number;
    isYou: boolean;
  }[];
  yourRank: number | null;
  optedIn: boolean;
};
export function BankSoal({
  state,
  actions,
  curriculum,
  setCurriculum,
}: {
  state: State;
  actions: Actions;
  curriculum: string;
  setCurriculum: (s: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState<string | null>(null),
    [topic, setTopic] = useState<string | null>(null),
    [tab, setTab] = useState('bank'),
    [query, setQuery] = useState(''),
    [difficulty, setDifficulty] = useState('Semua'),
    [picker, setPicker] = useState(false),
    [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const pool = state.questions.filter((q) => (q.curriculum || 'UTBK') === curriculum);
  const filtered = pool.filter(
    (q) =>
      (!subject || q.subject === subject) &&
      (!topic || q.topic === topic) &&
      (difficulty === 'Semua' || q.difficulty === difficulty) &&
      `${q.question} ${q.topic} ${q.subject}`.toLowerCase().includes(query.toLowerCase()),
  );
  const topics = [...new Set(filtered.map((q) => q.topic))];
  const coreSubjects = [
    'Fisika',
    'Kimia',
    'Biologi',
    'Matematika',
    'Matematika IPA',
    'Sejarah Wajib',
    'Bahasa Inggris',
    'Bahasa Indonesia',
  ];
  const displaySubjects = [...new Set([...coreSubjects, ...state.subjects])].filter(
    (s) => coreSubjects.includes(s) || pool.some((q) => q.subject === s),
  );
  const loadLeaderboard = async () => {
    if (!actions.requireAccount()) return;
    try {
      setLeaderboard(await api<Leaderboard>('/leaderboard'));
    } catch (e) {
      actions.notify((e as Error).message);
    }
  };
  return (
    <>
      <PageHero
        title={subject ? `${subject} - ${curriculum}` : 'Bank Soal'}
        onBack={() => {
          if (topic) setTopic(null);
          else if (subject) setSubject(null);
          else actions.navigate('home');
        }}
        actions={
          <button className="hero-link" onClick={actions.openImport}>
            <Upload size={15} />
            Impor soal
          </button>
        }
      >
        {!subject && (
          <div className="bank-weekly">
            <div>
              <h2>Ayo Mulai Bank Soal Minggu ini!</h2>
              <p>
                Kerjakan soal, pahami pembahasannya,
                <br />
                dan pantau perkembangan belajarmu.
              </p>
            </div>
            <div>
              <span className="podium-icon">
                <Trophy size={35} />
              </span>
              <button className="primary" onClick={() => void loadLeaderboard()}>
                Lihat Leaderboard
              </button>
            </div>
          </div>
        )}
      </PageHero>
      <div className="testcenter-body">
        <div className="academy-width">
          <div className="content-tabs">
            <button className={tab === 'bank' ? 'active' : ''} onClick={() => setTab('bank')}>
              Bank Soal
            </button>
            <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
              Riwayat
            </button>
            <button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
              Bookmark
            </button>
          </div>
          {tab === 'history' ? (
            <AttemptRows state={state} actions={actions} mode="practice" />
          ) : (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Cari judul, topik, atau soal…"
              />
              <div className="catalogue-heading bank-filter">
                <h2>{topic || (subject ? `Topik ${subject}` : 'Bank Soal Pelajaran')}</h2>
                <div>
                  <button className="curriculum-button" onClick={() => setPicker(true)}>
                    {curriculum}
                    <ChevronRight size={15} />
                  </button>
                  {subject && (
                    <select
                      aria-label="Kesulitan soal"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      {['Semua', 'Mudah', 'Sedang', 'Sulit'].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {!subject && !query && tab === 'bank' ? (
                <div className="subject-grid">
                  {displaySubjects.map((s) => (
                    <button
                      className={`subject-card subject-${state.subjects.indexOf(s)}`}
                      key={s}
                      onClick={() => setSubject(s)}
                    >
                      <AcademyIcon kind={s} size="large" />
                      <strong>{s}</strong>
                      <span>
                        {pool.filter((q) => q.subject === s).length} soal <ChevronRight size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : subject && !topic && !query && tab === 'bank' ? (
                <div className="topic-list">
                  {topics.map((t, i) => (
                    <button className="topic-card" key={t} onClick={() => setTopic(t)}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{t}</h3>
                        <p>
                          {filtered.filter((q) => q.topic === t).length} soal · kunci & pembahasan
                        </p>
                      </div>
                      <ChevronRight size={19} />
                    </button>
                  ))}
                  {!topics.length && (
                    <Empty
                      title="Belum ada topik"
                      description={`Impor soal ${subject} untuk ${curriculum}, atau pilih kurikulum lain.`}
                      action={
                        <button className="primary" onClick={actions.openImport}>
                          Impor soal
                        </button>
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="bank-questions">
                  {(tab === 'saved'
                    ? pool.filter((q) => state.questionBookmarks.includes(q.id || ''))
                    : filtered
                  ).map((q, i) => (
                    <article key={q.id} className="bank-question">
                      <div className="bank-question-meta">
                        <span>
                          {q.subject} · {q.topic}
                        </span>
                        <small>{q.difficulty}</small>
                        <button
                          aria-label={
                            state.questionBookmarks.includes(q.id || '')
                              ? 'Hapus bookmark soal'
                              : 'Bookmark soal'
                          }
                          onClick={() => void actions.mutate(`/questions/${q.id}/bookmark`)}
                        >
                          <Bookmark
                            size={18}
                            fill={
                              state.questionBookmarks.includes(q.id || '') ? 'currentColor' : 'none'
                            }
                          />
                        </button>
                      </div>
                      <h3>
                        {i + 1}. {q.question}
                      </h3>
                      <div className="question-choice-preview">
                        {q.options.map((o, k) => (
                          <p key={k}>
                            <b>{String.fromCharCode(65 + k)}.</b>
                            {o}
                          </p>
                        ))}
                      </div>
                      <div className="bank-question-footer">
                        <small>{q.source}</small>
                        <button
                          className="secondary"
                          disabled={actions.busy}
                          onClick={() =>
                            void actions.start({
                              subject: q.subject,
                              topic: q.topic,
                              curriculum,
                              count: 5,
                            })
                          }
                        >
                          Kerjakan topik ini <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!(
                    tab === 'saved'
                      ? pool.filter((q) => state.questionBookmarks.includes(q.id || ''))
                      : filtered
                  ).length && (
                    <Empty
                      title="Soal belum ditemukan"
                      description="Ubah pencarian, pilih kurikulum lain, atau tambahkan soalmu sendiri."
                      action={
                        <button className="primary" onClick={actions.openImport}>
                          Impor soal
                        </button>
                      }
                    />
                  )}
                </div>
              )}
              {subject && filtered.length > 0 && tab === 'bank' && (
                <div className="start-practice-bar">
                  <span>
                    {filtered.length} soal tersedia{topic ? ` untuk ${topic}` : ''}
                  </span>
                  <button
                    className="primary"
                    disabled={actions.busy}
                    onClick={() =>
                      void actions.start({
                        subject,
                        topic: topic || undefined,
                        curriculum,
                        count: Math.min(30, filtered.length),
                        difficulty: difficulty === 'Semua' ? undefined : difficulty,
                      })
                    }
                  >
                    Mulai Latihan <ArrowRight size={16} />
                  </button>
                </div>
              )}
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
            setTopic(null);
          }}
        />
      )}
      {leaderboard && (
        <Modal title="Leaderboard Bank Soal" onClose={() => setLeaderboard(null)}>
          <div className="leaderboard-content">
            <div className="leaderboard-title">
              <Trophy size={38} />
              <h2>Minggu ini, makin paham!</h2>
              <p>{leaderboard.scope}</p>
            </div>
            {!leaderboard.optedIn && (
              <div className="review-notice">
                <p>
                  Ikut peringkat lokal untuk menampilkan nama dan poin belajarmu kepada pengguna
                  server ini.
                  <button
                    className="text-button"
                    onClick={async () => {
                      if (
                        await actions.mutate(
                          '/study/preferences',
                          { leaderboardOptIn: true },
                          'PATCH',
                        )
                      )
                        await loadLeaderboard();
                    }}
                  >
                    Ikut leaderboard <ArrowRight size={14} />
                  </button>
                </p>
              </div>
            )}
            {leaderboard.rows.map((r) => (
              <div className={`leaderboard-row ${r.isYou ? 'is-you' : ''}`} key={r.rank}>
                <span>{r.rank}</span>
                <div>
                  <strong>
                    {r.name}
                    {r.isYou ? ' (Kamu)' : ''}
                  </strong>
                  <small>
                    {r.correct} benar / {r.total} soal
                  </small>
                </div>
                <b>{r.points} poin</b>
              </div>
            ))}
            {!leaderboard.rows.length && (
              <Empty
                title="Belum ada peserta minggu ini"
                description="Poin muncul setelah peserta yang ikut leaderboard menyelesaikan latihan."
              />
            )}
            {leaderboard.optedIn && (
              <button
                className="text-button spaced"
                onClick={async () => {
                  if (
                    await actions.mutate('/study/preferences', { leaderboardOptIn: false }, 'PATCH')
                  )
                    await loadLeaderboard();
                }}
              >
                Berhenti membagikan peringkat
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function AttemptRows({
  state,
  actions,
  mode,
}: {
  state: State;
  actions: Actions;
  mode: 'practice' | 'tryout';
}) {
  const attempts = state.attempts.filter((a) => a.mode === mode);
  return (
    <div className="white-panel history-list">
      {attempts.map((a) => (
        <button className="history-row" key={a.id} onClick={() => actions.showResult(a.result)}>
          <AcademyIcon kind={mode === 'practice' ? 'questions' : 'tryout'} />
          <div>
            <strong>{mode === 'practice' ? 'Latihan Bank Soal' : 'Tryout'}</strong>
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
          title="Belum ada riwayat"
          description="Selesaikan sesi pertamamu. Hasilnya akan muncul di sini."
        />
      )}
    </div>
  );
}

export function TryoutCenter({
  state,
  actions,
  hasActive,
}: {
  state: State;
  actions: Actions;
  hasActive: boolean;
}) {
  const [tab, setTab] = useState('ongoing'),
    [detailId, setDetailId] = useState<string | null>(null),
    [category, setCategory] = useState<string | null>(null),
    [code, setCode] = useState(''),
    [joining, setJoining] = useState(false);
  const event = state.tryouts.find((e) => e.id === detailId);
  const enroll = async (id: string) => {
    if (await actions.mutate(`/tryouts/${id}/enroll`))
      actions.notify('Berhasil daftar tryout gratis. Pilih subtes untuk mulai.');
  };
  return (
    <>
      {event ? (
        <>
          <PageHero
            title="Detail Tryout"
            onBack={() => setDetailId(null)}
            actions={<span className="hero-badge">Gratis · lokal</span>}
          />
          <div className="academy-width page-content">
            <section className="white-panel tryout-detail">
              <span className="local-label">PAKET LATIHAN LOKAL</span>
              <h2>{event.title}</h2>
              <p>{event.description}</p>
              <div className="tryout-totals">
                <span>
                  <Clock size={17} />
                  {Math.ceil(event.duration / 60)} menit tersedia
                </span>
                <span>
                  <ClipboardList size={17} />
                  {event.total} soal tersedia
                </span>
              </div>
              <div className="tryout-access">
                {event.enrolled ? (
                  <>
                    <CheckCircle2 size={18} />
                    Sudah terdaftar. Yuk, mulai subtesmu!
                  </>
                ) : (
                  <>Daftar gratis untuk mengerjakan paket latihan ini.</>
                )}
              </div>
              <h3>Mata Pelajaran {event.id === 'tka-sma' ? 'Wajib & Pilihan' : ''}</h3>
              <div className="subtest-list">
                {event.subtests.map((s) => {
                  const done = state.eventAttempts
                    .filter((a) => a.event_id === event.id && a.subject === s.subject)
                    .map((a) => state.attempts.find((x) => x.id === a.attempt_id))
                    .filter(Boolean);
                  return (
                    <div className="subtest-row" key={s.subject}>
                      <AcademyIcon kind={s.subject} />
                      <div>
                        <strong>{s.subject}</strong>
                        <small>
                          <Clock size={12} />
                          {Math.ceil((Math.min(30, s.count) * 90) / 60)} menit · {s.count} soal
                          tersedia
                          {done.length ? ` · terakhir ${done.at(-1)?.result.score}/100` : ''}
                        </small>
                      </div>
                      {event.enrolled ? (
                        <button
                          className="secondary"
                          disabled={!s.count || actions.busy}
                          onClick={() =>
                            void actions.start({
                              mode: 'tryout',
                              eventId: event.id,
                              subject: s.subject,
                              count: Math.min(30, s.count),
                            })
                          }
                        >
                          {done.length ? 'Ulangi' : 'Kerjakan'}
                        </button>
                      ) : (
                        <span className="muted small">{s.count ? 'Siap' : 'Belum ada soal'}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="target-department">
                <Target size={25} />
                <div>
                  <h3>Target Jurusan</h3>
                  <p>
                    {state.preferences.major
                      ? `${state.preferences.major} · ${state.preferences.university || 'Kampus belum dipilih'}`
                      : 'Target jurusan bisa kamu atur di Pegasus.'}
                  </p>
                  <button className="text-button" onClick={() => actions.navigate('pegasus')}>
                    Atur target belajar <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              {!event.enrolled && (
                <button
                  className="primary full"
                  disabled={!event.total}
                  onClick={() => void enroll(event.id)}
                >
                  Daftar Sekarang — Gratis
                </button>
              )}
              {!event.total && (
                <div className="setup-notice">
                  <p>
                    Belum ada soal untuk kategori ini. Impor soal dengan kurikulum yang sesuai agar
                    paket bisa dikerjakan.
                  </p>
                  <button className="text-button" onClick={actions.openImport}>
                    Impor soal
                  </button>
                </div>
              )}
              <p className="small muted spaced">
                Setiap subtes memakai maksimal 30 soal per sesi. Nilai adalah persentase jawaban
                benar, bukan skor IRT atau prediksi UTBK.
              </p>
            </section>
          </div>
        </>
      ) : (
        <>
          <PageHero
            title="Tryout"
            onBack={() => actions.navigate('home')}
            art={<StudyBanner />}
            actions={
              <button className="hero-link" onClick={() => setTab('mine')}>
                <History size={16} />
                Tryout Saya
              </button>
            }
          />
          <div className="academy-width testcenter-content">
            <div className="pill-tabs">
              <button
                className={tab === 'ongoing' ? 'active' : ''}
                onClick={() => setTab('ongoing')}
              >
                Berlangsung
              </button>
              <button
                className={tab === 'upcoming' ? 'active' : ''}
                onClick={() => setTab('upcoming')}
              >
                Akan Datang
              </button>
              <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
                Tryout Saya
              </button>
            </div>
            {hasActive && (
              <div className="resume-banner">
                <Clock size={17} />
                <span>Ada sesi yang belum selesai.</span>
                <button className="text-button" onClick={() => void actions.resume()}>
                  Lanjutkan <ArrowRight size={15} />
                </button>
              </div>
            )}
            {tab === 'upcoming' ? (
              <Empty
                title="Belum ada tryout terjadwal"
                description="Tryout lokal yang tersedia dapat dikerjakan kapan saja pada tab Berlangsung."
              />
            ) : tab === 'mine' ? (
              <>
                {state.activeAttempts.length > 0 && (
                  <section className="white-panel">
                    <h2>Sesi Belum Selesai</h2>
                    <div className="history-list">
                      {state.activeAttempts.map((a) => (
                        <button
                          className="history-row"
                          key={a.id}
                          onClick={() => void actions.resume(a.id)}
                        >
                          <AcademyIcon kind={a.mode === 'tryout' ? 'tryout' : 'questions'} />
                          <div>
                            <strong>
                              {a.mode === 'tryout' ? 'Tryout' : 'Latihan'} · {a.subjects.join(', ')}
                            </strong>
                            <p>
                              {a.questionCount} soal · {new Date(a.started).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <span className="text-button">
                            Lanjutkan <ChevronRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <div className="tryout-package-list">
                  {state.tryouts
                    .filter((e) => e.enrolled)
                    .map((e) => (
                      <button
                        className="tryout-package"
                        key={e.id}
                        onClick={() => setDetailId(e.id)}
                      >
                        <AcademyIcon kind="tryout" />
                        <div>
                          <h3>{e.title}</h3>
                          <p>{e.total} soal · sudah terdaftar</p>
                        </div>
                        <ChevronRight size={19} />
                      </button>
                    ))}
                </div>
                <h2 className="section-title">Riwayat Hasil</h2>
                <AttemptRows state={state} actions={actions} mode="tryout" />
              </>
            ) : (
              <>
                <div className="tryout-package-list">
                  {state.tryouts
                    .filter((e) => e.total > 0 && (!category || e.id === category))
                    .map((e) => (
                      <article key={e.id} className="white-panel tryout-package-panel">
                        <div className="catalogue-heading">
                          <h3>{e.title}</h3>
                          <span className="free-label">Gratis</span>
                        </div>
                        <button className="tryout-package" onClick={() => setDetailId(e.id)}>
                          <AcademyIcon kind="tryout" />
                          <div>
                            <h3>{e.title} — Latihan Mandiri</h3>
                            <p>{e.total} soal · Bisa Dikerjakan</p>
                          </div>
                          <span>
                            {e.enrolled ? 'Lanjutkan' : 'Lihat detail'} <ChevronRight size={13} />
                          </span>
                        </button>
                      </article>
                    ))}
                  {!state.tryouts.some((e) => e.total > 0 && (!category || e.id === category)) && (
                    <Empty
                      title="Soal kategori ini belum tersedia"
                      description="Tambahkan soal dari Bank Soal dengan kurikulum yang sesuai."
                      action={
                        <button className="primary" onClick={actions.openImport}>
                          Impor soal
                        </button>
                      }
                    />
                  )}
                </div>
                <h2 className="section-title">Kategori Tryout</h2>
                <div className="tryout-categories">
                  {state.tryouts.map((e, i) => (
                    <button
                      className={category === e.id ? 'selected' : ''}
                      key={e.id}
                      onClick={() => setCategory(category === e.id ? null : e.id)}
                    >
                      <span className={`category-pic category-${i}`}>
                        <AcademyIcon kind="tryout" />
                        <b>{e.total}</b>
                      </span>
                      <strong>{e.title}</strong>
                    </button>
                  ))}
                </div>
                <button className="calendar-link" onClick={() => setTab('upcoming')}>
                  <AcademyIcon kind="calendar" />
                  <strong>Lihat Kalender Tryout</strong>
                  <span>
                    Lihat <ChevronRight size={15} />
                  </span>
                </button>
                <section className="white-panel tryout-code">
                  <h2>Tryout Khusus</h2>
                  <div>
                    <AcademyIcon kind="tryout" size="large" />
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!actions.requireAccount()) return;
                        setJoining(true);
                        try {
                          const r = await api<{ id: string }>('/tryouts/code', {
                            method: 'POST',
                            body: JSON.stringify({ code }),
                          });
                          await actions.refresh();
                          setDetailId(r.id);
                          setCode('');
                        } catch (e) {
                          actions.notify((e as Error).message);
                        } finally {
                          setJoining(false);
                        }
                      }}
                    >
                      <label>
                        Punya Kode untuk Tryout Khusus?
                        <input
                          placeholder="Masukkan kode tryout"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          minLength={3}
                          maxLength={50}
                        />
                      </label>
                      <button className="primary" disabled={code.trim().length < 3 || joining}>
                        {joining ? <LoaderCircle className="spin" size={16} /> : null}Daftar
                      </button>
                      <small>Kode demo lokal: PAHAMIN-UTBK</small>
                    </form>
                  </div>
                </section>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

export function QuickPractice({
  state,
  actions,
  curriculum,
}: {
  state: State;
  actions: Actions;
  curriculum: string;
}) {
  const [subject, setSubject] = useState('Semua'),
    [count, setCount] = useState(5),
    [adaptive, setAdaptive] = useState(true);
  return (
    <>
      <PageHero
        title="Sikat Soal"
        onBack={() => actions.navigate('home')}
        art={<AcademyIcon kind="quick" size="large" />}
      />
      <div className="academy-width page-content">
        <section className="white-panel quick-config">
          <h2>Latihan singkat, makin paham!</h2>
          <p>Jawab beberapa soal dari bank soalmu, lalu pelajari pembahasannya.</p>
          <label>
            Pelajaran
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {['Semua', ...state.subjects].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="quiz-count-picker">
            {[5, 10, 20].map((n) => (
              <button className={count === n ? 'active' : ''} onClick={() => setCount(n)} key={n}>
                {n} soal
              </button>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={adaptive}
              onChange={(e) => setAdaptive(e.target.checked)}
            />
            Prioritaskan soal yang belum dikuasai
          </label>
          <p className="small muted">
            Soal salah pada hasil terakhir didahulukan, lalu soal yang belum pernah dikerjakan.
            Kurikulum: {curriculum}.
          </p>
          <button
            className="primary full"
            disabled={actions.busy}
            onClick={() => void actions.start({ subject, count, adaptive, curriculum })}
          >
            Mulai Sikat Soal <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
