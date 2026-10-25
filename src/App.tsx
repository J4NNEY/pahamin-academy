import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  X,
  UserRound,
  Settings,
  Bookmark,
  History,
  LogOut,
  Sparkles,
  LoaderCircle,
  BookOpen,
  Video,
  Rocket,
  ClipboardList,
  LibraryBig,
  ShoppingBasket,
} from 'lucide-react';
import { api } from './api';
import type { Page, State, Material, Session, Result, PracticeOptions, Actions } from './types';
import { Modal, PageHero } from './ui';
import { AuthDialog, SettingsPage } from './Account';
import { AcademyIcon } from './AcademyArt';
import { Learning, Collection, StudyHistory, MaterialReader } from './Learning';
import { BankSoal, TryoutCenter, QuickPractice } from './TestCenter';
import { Pegasus, Tutor, Purchase } from './Personal';
import { LiveClasses } from './Live';
import { AIStudio, ImportDialog } from './Studio';
import { QuizDialog, ResultDialog } from './Quiz';

const navigation = [
  { id: 'home', label: 'Belajar', icon: BookOpen, kind: 'learning' },
  { id: 'live', label: 'Live', icon: Video, kind: 'live' },
  { id: 'pegasus', label: 'Pegasus', icon: Rocket, kind: 'pegasus' },
  { id: 'tryout', label: 'Tryout', icon: ClipboardList, kind: 'tryout' },
  { id: 'questions', label: 'Bank Soal', icon: LibraryBig, kind: 'questions' },
  { id: 'purchase', label: 'Pembelian', icon: ShoppingBasket, kind: 'purchase' },
  { id: 'ai', label: 'AI Studio', icon: Sparkles, kind: 'ai' },
] as const;
const pages: Page[] = [
  'home',
  'materials',
  'questions',
  'tryout',
  'ai',
  'collection',
  'history',
  'settings',
  'live',
  'pegasus',
  'purchase',
  'tutor',
  'quick',
];
const fromHash = () => {
  const key = location.hash.replace('#/', '');
  return pages.includes(key as Page) ? (key as Page) : 'home';
};
export default function AcademyApp() {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(''),
    [page, setPage] = useState<Page>(fromHash),
    [toast, setToast] = useState(''),
    [profile, setProfile] = useState(false),
    [auth, setAuth] = useState(false),
    [material, setMaterial] = useState<Material | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [session, setSession] = useState<Session | null>(null),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false);
  const [guestCurriculum, setGuestCurriculum] = useState(
    () => localStorage.getItem('pahamin-curriculum') || 'UTBK',
  );
  const refresh = useCallback(async () => {
    try {
      setState(await api<State>('/state'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const change = () => {
      setPage(fromHash());
      window.scrollTo({ top: 0 });
    };
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 5500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const navigate = (next: Page) => {
    setProfile(false);
    setMaterial(null);
    if (page === next) window.scrollTo({ top: 0, behavior: 'smooth' });
    else location.hash = '/' + next;
  };
  const requireAccount = () => {
    if (!state?.user) {
      setMaterial(null);
      setProfile(false);
      setAuth(true);
      return false;
    }
    return true;
  };
  const mutate = async (path: string, body?: unknown, method = 'POST') => {
    if (!requireAccount()) return false;
    try {
      await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      await refresh();
      return true;
    } catch (e) {
      setToast((e as Error).message);
      return false;
    }
  };
  const activeKey = `pahamin-active-${state?.user?.id || 'guest'}`;
  const start = async (options: PracticeOptions) => {
    if (!requireAccount()) return;
    setBusy(true);
    try {
      const a = await api<Session>('/practice', {
        method: 'POST',
        body: JSON.stringify({ mode: 'practice', subject: 'Semua', count: 10, ...options }),
      });
      setMaterial(null);
      setSession(a);
      localStorage.setItem(activeKey, a.id);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const resume = async (attemptId?: string) => {
    if (!requireAccount()) return;
    const id = attemptId || localStorage.getItem(activeKey) || state?.activeAttempts[0]?.id;
    if (!id) {
      setToast('Tidak ada sesi yang belum selesai.');
      return;
    }
    try {
      const a = await api<Session & { result: Result | null }>(`/attempts/${id}`);
      if (a.result) {
        setResult(a.result);
        localStorage.removeItem(activeKey);
      } else {
        setSession(a);
        localStorage.setItem(activeKey, a.id);
      }
    } catch (e) {
      setToast((e as Error).message);
      localStorage.removeItem(activeKey);
    }
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      localStorage.removeItem(activeKey);
      setProfile(false);
      await refresh();
      navigate('home');
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  if (!state)
    return (
      <div className="loading-screen">
        <span className="loading-logo">
          <BookOpen />
        </span>
        <h2>Pahamin Academy</h2>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={() => void refresh()}>
              Coba lagi
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>Menyiapkan ruang belajar…</p>
          </>
        )}
      </div>
    );
  const curriculum = state.user ? state.preferences.curriculum : guestCurriculum;
  const setCurriculum = async (value: string) => {
    if (state.user) await mutate('/study/preferences', { curriculum: value }, 'PATCH');
    else {
      setGuestCurriculum(value);
      localStorage.setItem('pahamin-curriculum', value);
    }
  };
  const actions: Actions = {
    navigate,
    requireAccount,
    openMaterial: setMaterial,
    start,
    mutate,
    refresh,
    notify: setToast,
    openImport: () => {
      if (requireAccount()) setImportOpen(true);
    },
    showResult: setResult,
    resume,
    busy,
  };
  const currentNav = ['home', 'materials', 'collection', 'history'].includes(page)
    ? 'home'
    : page === 'tutor'
      ? 'pegasus'
      : page === 'quick'
        ? 'questions'
        : page;
  return (
    <div className="academy-app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Lewati ke konten
      </a>
      <header className="academy-header">
        <nav className="academy-navbar academy-width" aria-label="Navigasi utama">
          <a className="academy-brand" href="#/home" aria-label="Pahamin Academy, halaman belajar">
            <svg viewBox="0 0 34 40" aria-hidden="true">
              <path
                d="M6 35V5q0-4 4-2L28 13q5 3 0 6L10 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 37V21l8-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>
              Pahamin<small>ACADEMY</small>
            </span>
          </a>
          <div className="academy-navlinks">
            {navigation.map((n) => (
              <button
                key={n.id}
                className={currentNav === n.id ? 'active' : ''}
                aria-current={currentNav === n.id ? 'page' : undefined}
                onClick={() => navigate(n.id)}
              >
                <AcademyIcon kind={n.kind} size="small" />
                <span>{n.label}</span>
                {n.id === 'ai' && <i className="nav-new">AI</i>}
              </button>
            ))}
          </div>
          <button
            className="academy-profile"
            onClick={() => (state.user ? setProfile(true) : setAuth(true))}
            aria-label={state.user ? 'Buka pengaturan akun' : 'Masuk atau daftar'}
          >
            <span className="profile-avatar">
              <UserRound size={20} />
            </span>
            <small>{state.user?.name.split(' ')[0] || 'Masuk'}</small>
          </button>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {(page === 'home' || page === 'materials') && (
          <Learning
            state={state}
            actions={actions}
            curriculum={curriculum}
            setCurriculum={setCurriculum}
            catalogueOnly={page === 'materials'}
          />
        )}
        {page === 'questions' && (
          <BankSoal
            state={state}
            actions={actions}
            curriculum={curriculum}
            setCurriculum={setCurriculum}
          />
        )}
        {page === 'tryout' && (
          <TryoutCenter
            state={state}
            actions={actions}
            hasActive={!!localStorage.getItem(activeKey) || state.activeAttempts.length > 0}
          />
        )}
        {page === 'quick' && (
          <QuickPractice state={state} actions={actions} curriculum={curriculum} />
        )}
        {page === 'pegasus' && <Pegasus state={state} actions={actions} />}
        {page === 'tutor' && <Tutor state={state} actions={actions} />}
        {page === 'live' && <LiveClasses state={state} actions={actions} />}
        {page === 'purchase' && <Purchase actions={actions} />}
        {page === 'collection' && <Collection state={state} actions={actions} />}
        {page === 'history' && <StudyHistory state={state} actions={actions} />}
        {page === 'settings' && (
          <>
            <PageHero title="Pengaturan" onBack={() => navigate('home')} />
            <div className="academy-width page-content">
              <SettingsPage
                state={state}
                onSave={async (name, goal) => {
                  if (await mutate('/profile', { name, goal }, 'PATCH'))
                    setToast('Profil dan target diperbarui.');
                }}
                onLogin={() => setAuth(true)}
                onLogout={logout}
              />
            </div>
          </>
        )}
        {page === 'ai' && (
          <>
            <PageHero
              title="AI Studio"
              onBack={() => navigate('home')}
              actions={<span className="hero-badge">Powered by Gemini</span>}
            />
            <div className="academy-width page-content">
              <AIStudio
                state={state}
                requireAccount={requireAccount}
                onSaved={async (id) => {
                  await refresh();
                  const next = await api<State>('/state');
                  setMaterial(next.materials.find((m) => m.id === id) || null);
                }}
                onSettings={() => navigate('settings')}
                toast={setToast}
              />
            </div>
          </>
        )}
      </main>
      <footer className="academy-footer academy-width">
        <strong>Pahamin Academy</strong>
        <span>Belajar jadi lebih paham.</span>
        <button onClick={() => navigate('settings')}>Bantuan & pengaturan</button>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Tutup pesan">
            <X size={16} />
          </button>
        </div>
      )}
      {profile && (
        <Modal title="Pengaturan" onClose={() => setProfile(false)}>
          <div className="profile-menu">
            {[
              { label: 'Ubah Profil', icon: UserRound, page: 'settings' },
              { label: 'Bookmark', icon: Bookmark, page: 'collection' },
              { label: 'Riwayat Belajar', icon: History, page: 'history' },
              { label: 'Pengaturan Gemini', icon: Sparkles, page: 'settings' },
            ].map((n) => (
              <button key={n.label} onClick={() => navigate(n.page as Page)}>
                <span>
                  <n.icon size={21} />
                </span>
                {n.label}
                <ChevronRight size={18} />
              </button>
            ))}
            <button className="primary full" onClick={() => void logout()}>
              <LogOut size={17} />
              Log Out
            </button>
          </div>
        </Modal>
      )}
      {auth && (
        <AuthDialog
          onClose={() => setAuth(false)}
          onSuccess={async () => {
            await refresh();
            setAuth(false);
            setToast('Selamat datang! Progres belajarmu akan tersimpan.');
          }}
        />
      )}
      {material && (
        <MaterialReader
          material={material}
          state={state}
          actions={actions}
          onClose={() => setMaterial(null)}
        />
      )}
      {importOpen && (
        <ImportDialog
          subjects={state.subjects}
          curriculum={curriculum}
          aiConfigured={state.ai.configured}
          onClose={() => setImportOpen(false)}
          onSaved={async (count, skipped) => {
            setImportOpen(false);
            await refresh();
            setToast(`${count} soal diimpor${skipped ? `, ${skipped} duplikat dilewati` : ''}.`);
          }}
        />
      )}
      {session && (
        <QuizDialog
          session={session}
          onClose={() => setSession(null)}
          onComplete={async (r) => {
            setSession(null);
            setResult(r);
            localStorage.removeItem(activeKey);
            await refresh();
          }}
        />
      )}
      {result && <ResultDialog result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
