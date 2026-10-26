import { useEffect, useRef, useId, type ReactNode } from 'react';
import { ArrowLeft, X, ArrowUpRight, BookOpen, Check, Bookmark, Clock, Search } from 'lucide-react';
import type { Material } from './types';
import { SubjectArt } from './Artwork';
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    id = useId(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
      >
        <header>
          <h2 id={id}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Tutup dialog">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function MaterialCard({
  material,
  completed,
  saved,
  onOpen,
  onBookmark,
}: {
  material: Material;
  completed: boolean;
  saved: boolean;
  onOpen: () => void;
  onBookmark: () => void;
}) {
  return (
    <article className="material-card">
      <button
        className={`material-art ${material.color}`}
        onClick={onOpen}
        aria-label={`Baca ${material.title}`}
      >
        <span className="art-tag">{material.subject}</span>
        <SubjectArt kind={material.icon} />
        <span className="art-corner">
          <ArrowUpRight size={17} />
        </span>
      </button>
      <div className="material-body">
        <div className="card-meta">
          <span>
            {material.origin === 'academy'
              ? 'PAHAMIN ACADEMY'
              : material.source.startsWith('Gemini')
                ? 'DIBUAT DENGAN AI'
                : 'MATERI CONTOH'}
          </span>
          <button
            aria-label={saved ? 'Hapus dari koleksi' : 'Simpan ke koleksi'}
            className={`bookmark-button ${saved ? 'saved' : ''}`}
            onClick={onBookmark}
          >
            <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button className="title-button" onClick={onOpen}>
          <h3>{material.title}</h3>
        </button>
        <p>{material.summary}</p>
        <div className="card-footer">
          <span>
            <Clock size={13} />
            {material.minutes} menit baca
          </span>
          {completed ? (
            <span className="completed">
              <Check size={13} />
              Selesai
            </span>
          ) : (
            <span className="level">Dasar</span>
          )}
        </div>
      </div>
    </article>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = 'Cari materi atau topik…',
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Hapus pencarian" onClick={() => onChange('')}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function PageHero({
  title,
  children,
  art,
  onBack,
  actions,
}: {
  title: string;
  children?: ReactNode;
  art?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <section className={`page-hero ${art ? 'illustrated' : ''}`}>
      <div className="academy-width">
        <div className="hero-heading">
          <button
            className="back-button"
            onClick={onBack || (() => history.back())}
            aria-label="Kembali"
          >
            <ArrowLeft />
          </button>
          <h1>{title}</h1>
          <div className="hero-actions">{actions}</div>
        </div>
        {art && (
          <div className="hero-illustration">
            {art}
            <strong>{title}</strong>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
