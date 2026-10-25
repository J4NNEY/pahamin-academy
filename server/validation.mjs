import { z } from 'zod';
import Papa from 'papaparse';

export const subjects = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Fisika',
  'Kimia',
  'Biologi',
  'Penalaran Umum',
  'Pengetahuan & Pemahaman Umum',
  'Kemampuan Memahami Bacaan dan Menulis',
  'Pengetahuan Kuantitatif',
  'Literasi Bahasa Indonesia',
  'Literasi Bahasa Inggris',
  'Penalaran Matematika',
  'Matematika IPA',
  'Geografi',
  'Sejarah',
  'Sejarah Wajib',
  'Ekonomi',
  'Sosiologi',
  'Pendidikan Pancasila dan Kewarganegaraan',
  'Kewirausahaan',
];
export const curricula = [
  'UTBK',
  'UM UGM',
  'SIMAK UI',
  'Kelas 10',
  'Kelas 11',
  'Kelas 12',
  'Kelas 10-IPA',
  'Kelas 10-IPS',
  'Kelas 11-IPA',
  'Kelas 11-IPS',
  'Kelas 12-IPA',
  'Kelas 12-IPS',
  'Kelas 7',
  'Kelas 8',
  'Kelas 9',
];
export const questionSchema = z
  .object({
    curriculum: z.enum(curricula).default('UTBK'),
    subject: z.enum(subjects),
    topic: z.string().trim().min(2).max(120),
    difficulty: z.enum(['Mudah', 'Sedang', 'Sulit']),
    question: z.string().trim().min(5).max(6000),
    options: z.array(z.string().trim().min(1).max(2000)).min(4).max(5),
    answer: z.number().int().min(0).max(4),
    explanation: z.string().trim().min(5).max(6000),
  })
  .refine((q) => q.answer < q.options.length, { message: 'Jawaban tidak tersedia dalam pilihan.' });
export const materialSchema = z.object({
  curriculum: z.enum(curricula).default('UTBK'),
  videoUrl: z
    .string()
    .max(1500)
    .refine(
      (value) =>
        !value ||
        (() => {
          try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
          } catch {
            return false;
          }
        })(),
      { message: 'URL video harus HTTPS.' },
    )
    .optional(),
  title: z.string().trim().min(3).max(160),
  subject: z.enum(subjects),
  topic: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(10).max(3000),
  sections: z
    .array(
      z.object({ heading: z.string().min(2).max(200), content: z.string().min(10).max(12000) }),
    )
    .min(1)
    .max(12),
  keyPoints: z.array(z.string().min(3).max(1000)).min(1).max(12),
  quiz: z.array(questionSchema).min(1).max(10),
});
export const importSchema = z.array(questionSchema).min(1).max(200);

export function parseQuestions(content, extension) {
  let rows;
  if (extension === '.json') {
    const parsed = JSON.parse(content.replace(/^\uFEFF/, ''));
    rows = Array.isArray(parsed) ? parsed : parsed.questions;
  } else {
    const parsed = Papa.parse(content.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors.length) throw new Error('CSV tidak valid: ' + parsed.errors[0].message);
    rows = parsed.data.map((r) => ({
      subject: r.subject,
      curriculum: r.curriculum || 'UTBK',
      topic: r.topic,
      difficulty: r.difficulty,
      question: r.question,
      options: [r.option_a, r.option_b, r.option_c, r.option_d, r.option_e].filter(
        (v) => v !== undefined && v !== '',
      ),
      answer: /^[A-E]$/i.test(r.answer?.trim())
        ? r.answer.trim().toUpperCase().charCodeAt(0) - 65
        : Number(r.answer),
      explanation: r.explanation,
    }));
  }
  const result = importSchema.safeParse(rows);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Soal ${Number(issue.path[0] ?? 0) + 1}, kolom ${issue.path.slice(1).join('.') || 'data'}: ${issue.message}`,
    );
  }
  return result.data;
}

export function gradeQuestions(questions, answers) {
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  return {
    score: Math.round((correct / questions.length) * 100),
    correct,
    total: questions.length,
    unanswered: questions.filter((_, i) => answers[i] === undefined || answers[i] === null).length,
    review: questions.map((q, i) => ({
      ...q,
      selected: answers[i] ?? null,
      correct: answers[i] === q.answer,
    })),
  };
}
