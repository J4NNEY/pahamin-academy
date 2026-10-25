import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  UserRound,
  PlayCircle,
  CalendarDays,
  ArrowUpRight,
  Check,
  LoaderCircle,
} from 'lucide-react';
import { PageHero } from './ui';
import { AcademyIcon } from './AcademyArt';
import { Modal, Empty } from './ui';
import type { State, Actions, LiveSession } from './types';

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
const addDays = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const formatDay = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('id-ID', { timeZone: 'UTC', ...opts });
export function LiveClasses({ state, actions }: { state: State; actions: Actions }) {
  const today = dayKey(new Date()),
    weekday = new Date(today + 'T12:00:00Z').getUTCDay(),
    monday = addDays(today, -((weekday + 6) % 7));
  const [week, setWeek] = useState(0),
    [day, setDay] = useState(today),
    [className, setClassName] = useState('Semua Kelas'),
    [recordings, setRecordings] = useState(false),
    [editing, setEditing] = useState<LiveSession | null | false>(false),
    [detail, setDetail] = useState<LiveSession | null>(null);
  const start = addDays(monday, week * 7),
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    classes = [...new Set(state.liveSessions.map((s) => s.className))];
  const sessions = state.liveSessions
    .filter(
      (s) =>
        (className === 'Semua Kelas' || s.className === className) &&
        (recordings ? !!s.recordingUrl : dayKey(new Date(s.startsAt)) === day),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const status = (s: LiveSession) =>
    Date.now() < Date.parse(s.startsAt)
      ? 'Akan Datang'
      : Date.now() < Date.parse(s.startsAt) + s.duration * 60000
        ? 'Berlangsung'
        : 'Berakhir';
  return (
    <>
      <PageHero
        title="Live Class"
        onBack={() => actions.navigate('home')}
        actions={
          <button className="hero-link" onClick={() => setRecordings(!recordings)}>
            <PlayCircle size={16} />
            {recordings ? 'Lihat Jadwal' : 'Lihat Rekaman'}
          </button>
        }
      />
      <div className="live-class-body">
        <div className="academy-width">
          <section className="white-panel live-class-picker">
            <div className="live-access">
              <span className="free-label">Personal</span>
              <button className="text-button" onClick={() => actions.navigate('purchase')}>
                Lihat Paket
              </button>
            </div>
            <div>
              <strong>Pilih Kelas</strong>
              <select
                aria-label="Pilih kelas Live Class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              >
                <option>Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </section>
          <div className="live-toolbar">
            <h2>{recordings ? 'Rekaman Kelasmu' : 'Jadwal Kelasmu'}</h2>
            <button
              className="secondary"
              onClick={() => {
                if (actions.requireAccount()) setEditing(null);
              }}
            >
              <Plus size={15} />
              Tambah Jadwal
            </button>
          </div>
          {!recordings && (
            <>
              <div className="live-week-tabs">
                <button
                  aria-label="Minggu sebelumnya"
                  onClick={() => {
                    setWeek(week - 1);
                    setDay(addDays(monday, (week - 1) * 7));
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                {[week, week + 1].map((w, i) => (
                  <button
                    key={w}
                    className={i === 0 ? 'active' : ''}
                    onClick={() => {
                      setWeek(w);
                      setDay(addDays(monday, w * 7));
                    }}
                  >
                    {formatDay(addDays(monday, w * 7), { day: 'numeric' })} -{' '}
                    {formatDay(addDays(monday, w * 7 + 6), { day: 'numeric', month: 'long' })}
                  </button>
                ))}
                <button
                  aria-label="Minggu berikutnya"
                  onClick={() => {
                    setWeek(week + 1);
                    setDay(addDays(monday, (week + 1) * 7));
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="live-day-tabs">
                {days.map((d, i) => (
                  <button className={day === d ? 'active' : ''} key={d} onClick={() => setDay(d)}>
                    <span>
                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][i]}
                    </span>
                    <small>{formatDay(d, { day: 'numeric' })}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <section className="day-sessions">
            <div className="day-session-heading">
              <strong>
                {recordings
                  ? 'Semua rekaman'
                  : `${formatDay(day, { day: 'numeric', month: 'short', year: 'numeric' })}${day === today ? ' (Hari ini)' : ''}`}
              </strong>
              <span>{sessions.length} Sesi</span>
            </div>
            {sessions.map((s) => (
              <article className="white-panel live-session-card" key={s.id}>
                <div className="session-label">
                  <span>{s.subject}</span>
                  <small>{s.className}</small>
                </div>
                <h3>{s.title}</h3>
                <div className="session-time">
                  <Clock size={13} />
                  {new Date(s.startsAt).toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB · {s.duration} menit
                </div>
                <span
                  className={`session-status ${status(s) === 'Berlangsung' ? 'live' : status(s) === 'Akan Datang' ? 'upcoming' : ''}`}
                >
                  {recordings ? 'Rekaman tersedia' : status(s)}
                </span>
                <footer>
                  <span>
                    <UserRound size={17} />
                    {s.teacher}
                  </span>
                  <button className="text-button" onClick={() => setDetail(s)}>
                    Lihat Sesi <ChevronRight size={14} />
                  </button>
                </footer>
              </article>
            ))}
            {!sessions.length && (
              <Empty
                title={recordings ? 'Belum ada rekaman' : 'Tidak ada sesi'}
                description={
                  recordings
                    ? 'Tambahkan tautan rekaman pada jadwal kelas yang kamu buat.'
                    : 'Pilih hari lain atau tambahkan jadwal belajar dengan tautan kelasmu.'
                }
                action={
                  <button
                    className="primary"
                    onClick={() => {
                      if (actions.requireAccount()) setEditing(null);
                    }}
                  >
                    <Plus size={16} />
                    Tambah Jadwal
                  </button>
                }
              />
            )}
          </section>
          <p className="live-service-note">
            <Video size={16} />
            Jadwal pribadi menggunakan tautan meeting dan rekaman yang kamu tambahkan. Belum ada
            integrasi pengajar atau penyedia streaming.
          </p>
        </div>
      </div>
      {detail && (
        <Modal title="Detail Live Class" onClose={() => setDetail(null)}>
          <div className="live-detail">
            <AcademyIcon kind={detail.subject} size="large" />
            <span className="subject-tag">{detail.subject}</span>
            <h2>{detail.title}</h2>
            <p>
              {detail.teacher} · {detail.className}
            </p>
            <p>
              {new Date(detail.startsAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </p>
            <div className="live-detail-links">
              {detail.meetingUrl ? (
                <a
                  className="primary full"
                  href={detail.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka Tautan Meeting <ArrowUpRight size={16} />
                </a>
              ) : (
                <p className="setup-notice">Tautan meeting belum ditambahkan.</p>
              )}
              {detail.recordingUrl && (
                <a
                  className="secondary full"
                  href={detail.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PlayCircle size={16} />
                  Lihat Rekaman
                </a>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setDetail(null);
                  setEditing(detail);
                }}
              >
                Edit jadwal & tautan <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {editing !== false && (
        <SessionForm
          session={editing}
          state={state}
          actions={actions}
          onClose={() => setEditing(false)}
          onSaved={(startsAt) => {
            const next = dayKey(new Date(startsAt));
            setDay(next);
            setWeek(
              Math.floor(
                (Date.parse(next + 'T12:00:00Z') - Date.parse(monday + 'T12:00:00Z')) /
                  (7 * 86400000),
              ),
            );
            setRecordings(false);
          }}
        />
      )}
    </>
  );
}

function SessionForm({
  session,
  state,
  actions,
  onClose,
  onSaved,
}: {
  session: LiveSession | null;
  state: State;
  actions: Actions;
  onClose: () => void;
  onSaved: (startsAt: string) => void;
}) {
  const initialDate = session
    ? new Date(Date.parse(session.startsAt) + 7 * 3600000).toISOString().slice(0, 16)
    : dayKey(new Date()) + 'T16:00';
  const [form, setForm] = useState({
      title: session?.title || '',
      subject: session?.subject || 'Matematika',
      className: session?.className || 'Kelas Belajar Pribadi',
      teacher: session?.teacher || state.user?.name || '',
      date: initialDate,
      duration: session?.duration || 60,
      meetingUrl: session?.meetingUrl || '',
      recordingUrl: session?.recordingUrl || '',
    }),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={session ? 'Edit Jadwal Kelas' : 'Tambah Jadwal Kelas'} onClose={onClose}>
      <form
        className="session-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { date, ...rest } = form;
            const selectedDate = String(new FormData(e.currentTarget).get('startsAtLocal') || date);
            const startsAt = new Date(selectedDate + ':00+07:00').toISOString();
            if (
              await actions.mutate(
                '/live-sessions' + (session ? `/${session.id}` : ''),
                { ...rest, startsAt },
                session ? 'PATCH' : 'POST',
              )
            ) {
              actions.notify(session ? 'Jadwal diperbarui.' : 'Jadwal kelas disimpan.');
              onSaved(startsAt);
              onClose();
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Judul sesi
          <input
            value={form.title}
            required
            minLength={3}
            maxLength={160}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="form-columns">
          <label>
            Pelajaran
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              {state.subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Durasi (menit)
            <input
              type="number"
              min={10}
              max={300}
              required
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          Kelas
          <input
            value={form.className}
            required
            minLength={2}
            maxLength={100}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
          />
        </label>
        <label>
          Pengajar / narasumber
          <input
            value={form.teacher}
            required
            minLength={2}
            maxLength={100}
            onChange={(e) => setForm({ ...form, teacher: e.target.value })}
          />
        </label>
        <label>
          Waktu mulai (WIB)
          <input type="datetime-local" name="startsAtLocal" defaultValue={form.date} required />
        </label>
        <label>
          Tautan meeting (opsional)
          <input
            type="url"
            placeholder="https://meet.google.com/…"
            value={form.meetingUrl}
            maxLength={1500}
            onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
          />
        </label>
        <label>
          Tautan rekaman (opsional)
          <input
            type="url"
            placeholder="https://…"
            value={form.recordingUrl}
            maxLength={1500}
            onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Simpan Jadwal
        </button>
      </form>
    </Modal>
  );
}
