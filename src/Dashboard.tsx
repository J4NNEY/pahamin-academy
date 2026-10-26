import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ClipboardList,
  LibraryBig,
  MessageCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Actions, State } from './types';

const day = (date: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(date));
export function DashboardHeader({
  state,
  actions,
  curriculum,
}: {
  state: State;
  actions: Actions;
  curriculum: string;
}) {
  const today = day(new Date().toISOString());
  const done = state.completed.filter((c) => day(c.date) === today).length;
  const goal = state.user?.goal || 3;
  const percent = Math.min(100, Math.round((done / goal) * 100));
  const shortcuts = [
    { page: 'questions', label: 'Bank Soal', icon: LibraryBig },
    { page: 'tryout', label: 'Tryout', icon: ClipboardList },
    { page: 'quick', label: 'Latihan cepat', icon: Zap },
    { page: 'tutor', label: 'Paham AI', icon: MessageCircle },
  ] as const;
  return (
    <>
      <section className="learning-summary">
        <div className="academy-width">
          <div className="summary-heading">
            <div>
              <h1>
                {state.user
                  ? `Halo, ${state.user.name.split(' ')[0]}`
                  : 'Selamat datang di Pahamin'}
              </h1>
              <p>Materi dan latihan untuk {curriculum}.</p>
            </div>
            {state.user ? (
              <button className="summary-target" onClick={() => actions.navigate('settings')}>
                <CheckCircle2 size={17} />
                {done}/{goal} materi hari ini
              </button>
            ) : (
              <button className="primary" onClick={() => actions.requireAccount()}>
                Masuk
              </button>
            )}
          </div>
          {state.user && (
            <div
              className="summary-progress"
              role="progressbar"
              aria-label="Target materi harian"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={Math.min(done, goal)}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          )}
          {state.activeAttempts.length > 0 && (
            <button
              className="summary-resume"
              onClick={() => void actions.resume(state.activeAttempts[0].id)}
            >
              <Clock3 size={16} /> Lanjutkan latihan yang belum selesai <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>
      <section className="simple-shortcuts academy-width" aria-label="Pintasan belajar">
        {shortcuts.map((s) => (
          <button key={s.page} onClick={() => actions.navigate(s.page)}>
            <s.icon size={23} strokeWidth={1.7} />
            <span>{s.label}</span>
          </button>
        ))}
      </section>
    </>
  );
}
export function SuggestedMaterials({
  state,
  actions,
  curriculum,
}: {
  state: State;
  actions: Actions;
  curriculum: string;
}) {
  const suggestions = state.materials
    .filter(
      (m) => (m.curriculum || 'UTBK') === curriculum && !state.completed.some((c) => c.id === m.id),
    )
    .slice(0, 3);
  return (
    <section className="simple-suggestions">
      {suggestions.length > 0 && (
        <div className="white-panel">
          <div className="simple-section-heading">
            <h2>Materi untukmu</h2>
            <button className="text-button" onClick={() => actions.navigate('materials')}>
              Lihat semua <ArrowRight size={15} />
            </button>
          </div>
          {suggestions.map((m) => (
            <button
              key={m.id}
              className="simple-material-row"
              onClick={() => actions.openMaterial(m)}
            >
              <BookOpen size={20} />
              <span>
                <strong>{m.title}</strong>
                <small>
                  {m.subject} &middot; {m.minutes} menit
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}
      <button className="simple-ai-link" onClick={() => actions.navigate('ai')}>
        <Sparkles size={21} />
        <span>
          <strong>Buat materi dari file</strong>
          <small>Unggah catatanmu di AI Studio.</small>
        </span>
        <ArrowRight size={17} />
      </button>
    </section>
  );
}
