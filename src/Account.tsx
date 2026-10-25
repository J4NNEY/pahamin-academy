import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  LoaderCircle,
  Check,
  Sparkles,
  ArrowUpRight,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { api } from './api';
import { Modal, PageHeading } from './ui';
import type { State } from './types';
export function AuthDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [register, setRegister] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={register ? 'Mulai perjalananmu' : 'Senang kamu kembali.'} onClose={onClose}>
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api(`/auth/${register ? 'register' : 'login'}`, {
              method: 'POST',
              body: JSON.stringify({ name, email, password }),
            });
            await onSuccess();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          {register
            ? 'Satu akun untuk materi, latihan, dan ide-ide barumu.'
            : 'Masuk untuk lanjut belajar dan menyimpan progresmu.'}
        </p>
        {register && (
          <label>
            Nama lengkap
            <div className="input-with-icon">
              <User size={17} />
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={60}
                placeholder="Nama panggilan juga boleh"
              />
            </div>
          </label>
        )}
        <label>
          Email
          <div className="input-with-icon">
            <Mail size={17} />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="kamu@email.com"
            />
          </div>
        </label>
        <label>
          Password
          <div className="input-with-icon">
            <Lock size={17} />
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              placeholder="Minimal 8 karakter"
            />
          </div>
        </label>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{' '}
          {register ? 'Buat akun' : 'Masuk ke ruang belajar'}
        </button>
        <div className="auth-switch">
          {register ? 'Sudah punya akun?' : 'Baru di Pahamin?'}{' '}
          <button
            type="button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Masuk' : 'Daftar gratis'}
          </button>
        </div>
        <p className="auth-note">Akun tersimpan di server Pahamin Academy ini.</p>
      </form>
    </Modal>
  );
}
export function SettingsPage({
  state,
  onSave,
  onLogin,
  onLogout,
}: {
  state: State;
  onSave: (name: string, goal: number) => Promise<void>;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}) {
  const [name, setName] = useState(state.user?.name || ''),
    [goal, setGoal] = useState(state.user?.goal || 3),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(state.user?.name || '');
    setGoal(state.user?.goal || 3);
  }, [state.user?.name, state.user?.goal]);
  return (
    <>
      <PageHeading
        eyebrow="SESUAIKAN RUANGMU"
        title="Belajar dengan caramu."
        description="Atur profil, target harian, dan koneksi AI."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>
            <User size={20} />
            Profil & target
          </h2>
          {state.user ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await onSave(name, goal);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nama
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={60}
                />
              </label>
              <label>
                Email
                <input value={state.user.email} disabled />
              </label>
              <label>
                Target materi per hari
                <select value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option value={i + 1} key={i}>
                      {i + 1} materi per hari
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={busy}>
                Simpan perubahan <Check size={16} />
              </button>
            </form>
          ) : (
            <>
              <p className="muted">Buat akun untuk memiliki target dan progres personal.</p>
              <button className="primary" onClick={onLogin}>
                Masuk / daftar
              </button>
            </>
          )}
        </section>
        <section className="panel">
          <h2>
            <Sparkles size={20} />
            Koneksi Gemini
          </h2>
          <div className={`connection-status ${state.ai.configured ? 'connected' : ''}`}>
            <span className="status-dot" />
            {state.ai.configured ? 'API key terpasang' : 'Belum dikonfigurasi'}
          </div>
          <p className="muted">
            Model: <code>{state.ai.model}</code>
          </p>
          <p>
            Isi konfigurasi berikut di file <code>.env</code> pada folder project, lalu restart
            server:
          </p>
          <pre>
            GEMINI_API_KEY=key_kamu{'\n'}GEMINI_MODEL={state.ai.model}
          </pre>
          <p className="small muted">
            Key disimpan di server. Status terpasang belum membuktikan key valid; validitas
            diketahui saat generasi berhasil.
          </p>
          <a
            className="text-button"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Buka Google AI Studio <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="panel">
          <h2>
            <GraduationCap size={20} />
            Tentang ruang ini
          </h2>
          <p>
            Pahamin Academy adalah platform belajar mandiri dengan materi orisinal, bank soal, dan
            bantuan Gemini.
          </p>
          <p className="muted">
            Materi bawaan adalah contoh. Hasil AI perlu ditinjau sebelum dijadikan acuan belajar.
          </p>
          {state.user && (
            <button className="secondary danger" onClick={() => void onLogout()}>
              <LogOut size={16} />
              Keluar dari akun
            </button>
          )}
        </section>
      </div>
    </>
  );
}
