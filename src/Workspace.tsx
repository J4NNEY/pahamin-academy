import { useState } from 'react';
import {
  BookOpen,
  Bookmark,
  ClipboardList,
  Compass,
  History,
  LibraryBig,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
  Wallet,
  Zap,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import type { Page, State } from './types';
import { Modal } from './ui';

const navigation = [
  { page: 'home', label: 'Belajar', icon: BookOpen },
  { page: 'live', label: 'Live', icon: Video },
  { page: 'pegasus', label: 'Rencana', icon: Compass },
  { page: 'tryout', label: 'Tryout', icon: ClipboardList },
  { page: 'questions', label: 'Bank Soal', icon: LibraryBig },
  { page: 'ai', label: 'AI Studio', icon: Sparkles },
] as const;
const otherPages = [
  { page: 'materials', label: 'Semua materi', icon: BookOpen },
  { page: 'collection', label: 'Koleksiku', icon: Bookmark },
  { page: 'history', label: 'Riwayat belajar', icon: History },
  { page: 'quick', label: 'Latihan cepat', icon: Zap },
  { page: 'tutor', label: 'Paham AI', icon: MessageCircle },
  { page: 'purchase', label: 'Akses belajar', icon: Wallet },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
] as const;
export function WorkspaceNavigation({
  state,
  page,
  navigate,
  onAccount,
}: {
  state: State;
  page: Page;
  navigate: (page: Page) => void;
  onAccount: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active =
    page === 'materials' ? 'home' : page === 'quick' ? 'questions' : page === 'tutor' ? 'ai' : page;
  const go = (target: Page) => {
    setMenuOpen(false);
    navigate(target);
  };
  const links = navigation.map((n) => (
    <button
      key={n.page}
      className={active === n.page ? 'active' : ''}
      aria-current={active === n.page ? 'page' : undefined}
      onClick={() => go(n.page)}
    >
      <n.icon size={21} strokeWidth={1.7} />
      <span>{n.label}</span>
    </button>
  ));
  return (
    <>
      <header className="site-header">
        <div className="site-navbar academy-width">
          <a className="site-brand" href="#/home" aria-label="Pahamin Academy, halaman belajar">
            <BookOpen size={29} strokeWidth={1.7} />
            <span>
              Pahamin<small>ACADEMY</small>
            </span>
          </a>
          <nav className="site-navlinks desktop-navlinks" aria-label="Navigasi utama">
            {links}
          </nav>
          <div className="site-account-actions">
            <button
              className="site-more"
              aria-label="Menu lainnya"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MoreHorizontal size={22} />
            </button>
            <button
              className="site-account"
              onClick={onAccount}
              aria-label={state.user ? 'Buka pengaturan akun' : 'Masuk atau daftar'}
            >
              <span className="site-avatar">
                <UserRound size={20} />
              </span>
              <small>{state.user?.name.split(' ')[0] || 'Masuk'}</small>
            </button>
          </div>
        </div>
        <nav className="site-navlinks mobile-navlinks academy-width" aria-label="Navigasi utama">
          {links}
        </nav>
      </header>
      {menuOpen && (
        <Modal title="Menu lainnya" onClose={() => setMenuOpen(false)}>
          <nav className="site-more-menu" aria-label="Menu lainnya">
            {otherPages.map((n) => (
              <button
                key={n.page}
                onClick={() => go(n.page)}
                aria-current={page === n.page ? 'page' : undefined}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                <ChevronRight size={16} />
              </button>
            ))}
            {state.user?.role === 'admin' && (
              <button
                onClick={() => go('admin')}
                aria-current={page === 'admin' ? 'page' : undefined}
              >
                <ShieldCheck size={19} />
                <span>Panel admin</span>
                <ChevronRight size={16} />
              </button>
            )}
          </nav>
        </Modal>
      )}
    </>
  );
}
