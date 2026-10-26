export type Question = {
  curriculum?: string;
  id?: string;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  answer?: number;
  explanation?: string;
  difficulty: string;
  source?: string;
};
export type Material = {
  origin?: 'academy';
  curriculum?: string;
  videoUrl?: string;
  id: string;
  title: string;
  subject: string;
  topic: string;
  summary: string;
  sections: { heading: string; content: string }[];
  keyPoints: string[];
  minutes: number;
  color: string;
  icon: string;
  source: string;
  createdAt: string;
  quiz?: Question[];
};
export type Result = {
  score: number;
  correct: number;
  total: number;
  unanswered: number;
  finishedAt: string;
  review: (Question & { selected: number | null; correct: boolean })[];
};
export type Attempt = {
  id: string;
  mode: 'practice' | 'tryout';
  started: number;
  duration: number;
  result: Result;
};
export type State = {
  activeAttempts: {
    id: string;
    mode: 'practice' | 'tryout';
    started: number;
    duration: number;
    eventId: string | null;
    questionCount: number;
    subjects: string[];
  }[];
  preferences: StudyPreferences;
  curricula: string[];
  subjectStats: { subject: string; total: number; correct: number; accuracy: number | null }[];
  questionBookmarks: string[];
  tryouts: TryoutEvent[];
  eventAttempts: { attempt_id: string; event_id: string; subject: string }[];
  liveSessions: LiveSession[];
  tutorMessages: { id: string; role: string; content: string; created: string }[];
  user: { id: string; name: string; email: string; goal: number; role: 'student' | 'admin' } | null;
  subjects: string[];
  materials: Material[];
  questions: Question[];
  completed: { id: string; date: string }[];
  bookmarks: string[];
  attempts: Attempt[];
  ai: { configured: boolean; model: string };
};
export type Session = {
  id: string;
  mode: 'practice' | 'tryout';
  started: number;
  duration: number;
  questions: Question[];
  answers?: Record<number, number>;
};
export type Page =
  | 'home'
  | 'materials'
  | 'questions'
  | 'tryout'
  | 'ai'
  | 'collection'
  | 'history'
  | 'settings'
  | 'live'
  | 'pegasus'
  | 'purchase'
  | 'tutor'
  | 'quick'
  | 'admin';
export type StudyPreferences = {
  onboarded: boolean;
  curriculum: string;
  focus: 'UTBK' | 'Ujian Sekolah';
  university: string;
  major: string;
  dailyMinutes: number;
  leaderboardOptIn: boolean;
};
export type TryoutEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  enrolled: boolean;
  total: number;
  duration: number;
  source: string;
  price: number;
  subtests: { subject: string; count: number }[];
};
export type LiveSession = {
  id: string;
  title: string;
  subject: string;
  className: string;
  teacher: string;
  startsAt: string;
  duration: number;
  meetingUrl: string;
  recordingUrl: string;
};
export type PracticeOptions = {
  mode?: 'practice' | 'tryout';
  subject?: string;
  count?: number;
  topic?: string;
  adaptive?: boolean;
  eventId?: string;
  curriculum?: string;
  difficulty?: string;
};
export type Actions = {
  navigate: (page: Page) => void;
  requireAccount: () => boolean;
  openMaterial: (material: Material) => void;
  start: (options: PracticeOptions) => Promise<void>;
  mutate: (path: string, body?: unknown, method?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  openImport: () => void;
  showResult: (result: Result) => void;
  resume: (id?: string) => Promise<void>;
  busy: boolean;
};
