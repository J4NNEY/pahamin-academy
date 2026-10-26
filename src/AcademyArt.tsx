import { BookOpen, Video, LibraryBig, ClipboardCheck, Gamepad2, Sparkles, Crown, Atom, FlaskConical, Leaf, Languages, Brain, Calculator, GraduationCap, CalendarDays, Compass, MessageCircle, Landmark, Globe2, Map, TrendingUp } from 'lucide-react';
const icons = {
  learning: BookOpen,
  live: Video,
  pegasus: Compass,
  tutor: MessageCircle,
  questions: LibraryBig,
  tryout: ClipboardCheck,
  quick: Gamepad2,
  ai: Sparkles,
  purchase: Crown,
  Matematika: Calculator,
  Fisika: Atom,
  Kimia: FlaskConical,
  Biologi: Leaf,
  'Bahasa Indonesia': BookOpen,
  'Bahasa Inggris': Languages,
  'Penalaran Umum': Brain,
  degree: GraduationCap,
  calendar: CalendarDays,
  Geografi: Globe2,
  Sejarah: Landmark,
  'Sejarah Wajib': Landmark,
  Ekonomi: TrendingUp,
  Sosiologi: Map,
};
export function AcademyIcon({
  kind,
  size = 'normal',
}: {
  kind: string;
  size?: 'small' | 'normal' | 'large';
}) {
  const Icon = icons[kind as keyof typeof icons] || BookOpen;
  return (
    <span className={`academy-icon icon-${kind.replaceAll(' ', '-')} ${size}`} aria-hidden="true">
      <span />
      <Icon strokeWidth={1.6} />
      <i />
    </span>
  );
}
export function StudyBanner({ kind = 'tryout' }: { kind?: string }) {
  return (
    <svg
      className={`study-banner-art ${kind}`}
      viewBox="0 0 250 180"
      aria-hidden="true"
      fill="none"
    >
      <ellipse cx="122" cy="159" rx="90" ry="10" fill="#3e73a0" opacity=".18" />
      <path
        d="M35 155V101q-20-23 3-35 19 9 6 35v54m162 0v-42q-18-23 2-31 17 15 6 31v42"
        fill="#a4d7a1"
      />
      <path d="M46 155v-49m-5 22-9-12m12 1 10-9m158 47v-43" stroke="#88bf8f" strokeWidth="3" />
      <rect x="77" y="24" width="94" height="137" rx="12" fill="#7fcabe" />
      <rect x="82" y="29" width="84" height="125" rx="8" fill="#fdfefc" />
      <path d="M83 41h82v12H83Z" fill="#66b9ad" />
      <rect x="105" y="22" width="39" height="8" rx="4" fill="#62aa9b" />
      {kind === 'pegasus' ? (
        <>
          <path d="m104 111 15-56q22 5 31 28l-32 40Z" fill="#939cd7" />
          <path d="m119 55 23 11-9-18-20-6Z" fill="#c2c7eb" />
          <circle cx="130" cy="64" r="3" fill="#535c99" />
          <path d="m108 105-18 12 15-35m24 30 17 15-7-34" fill="#737fc2" />
          <path d="m111 126-5 15 14-8" fill="#ffc87d" />
        </>
      ) : (
        <>
          <path
            d="M95 72h60M95 82h60m-60 9h38"
            stroke="#d2e1e8"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M96 130V104m0 26h55" stroke="#8ca7bc" strokeWidth="1.5" />
          <path d="m98 123 12-12 11 9 13-14 15 5" stroke="#8a98d5" strokeWidth="2" />
          <circle cx="98" cy="61" r="3" fill="#90c7b3" />
          <circle cx="109" cy="61" r="3" fill="#f5d788" />
          <circle cx="120" cy="61" r="3" fill="#f2a5b9" />
        </>
      )}
      <circle cx="68" cy="69" r="12" fill="#e7f4f5" />
      <text x="64" y="74" fill="#78b7b7" fontSize="15" fontFamily="sans-serif">
        ?
      </text>
      <circle cx="178" cy="30" r="10" fill="#d8e8f7" />
      <text x="175" y="34" fill="#76a2c8" fontSize="12">
        ?
      </text>
      <path d="m187 118 4-8 4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6Z" fill="#ffdb8e" />
    </svg>
  );
}
