// The provider grammar only describes generated learning content. Application
// fields (curriculum/video URL), defaults and large repeated enums belong to the
// server validator, not Gemini's constrained decoding grammar.
export function geminiResponseSchema(subject, mode = 'material') {
  const text = (description) => ({ type: 'string', description });
  const object = (properties) => ({
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  });
  const question = object({
    subject: { type: 'string', enum: [subject] },
    topic: text('Nama topik, 2 sampai 120 karakter.'),
    difficulty: { type: 'string', enum: ['Mudah', 'Sedang', 'Sulit'] },
    question: text('Teks soal, 5 sampai 6000 karakter.'),
    options: {
      type: 'array',
      items: text('Satu pilihan jawaban, 1 sampai 2000 karakter.'),
      minItems: 4,
      maxItems: 5,
    },
    answer: {
      type: 'integer',
      minimum: 0,
      maximum: 4,
      description: 'Indeks jawaban benar berbasis nol; harus tersedia pada options.',
    },
    explanation: text('Pembahasan jawaban, 5 sampai 6000 karakter.'),
  });
  if (mode === 'questions')
    return {
      type: 'array',
      items: question,
      description: 'Soal yang tersedia dalam dokumen, minimal 1 dan maksimal 200 soal.',
    };
  return object({
    title: text('Judul materi, 3 sampai 160 karakter.'),
    subject: { type: 'string', enum: [subject] },
    topic: text('Nama topik, 2 sampai 120 karakter.'),
    summary: text('Ringkasan, 10 sampai 3000 karakter.'),
    sections: {
      type: 'array',
      items: object({
        heading: text('Judul bagian, 2 sampai 200 karakter.'),
        content: text('Penjelasan Markdown, 10 sampai 12000 karakter.'),
      }),
      description: 'Satu sampai 12 bagian materi yang terstruktur.',
    },
    keyPoints: {
      type: 'array',
      items: text('Poin penting, 3 sampai 1000 karakter.'),
      description: 'Satu sampai 12 poin penting.',
    },
    quiz: {
      type: 'array',
      items: question,
      description: 'Lima soal latihan yang didukung dokumen.',
    },
  });
}
