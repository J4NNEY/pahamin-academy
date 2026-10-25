export const learningCatalogue = [
  { label: 'Penalaran Umum', matches: ['Penalaran Umum'] },
  { label: 'Pengetahuan & Pemahaman Umum', matches: ['Pengetahuan & Pemahaman Umum'] },
  {
    label: 'Kemampuan Memahami Bacaan dan Menulis',
    matches: ['Kemampuan Memahami Bacaan dan Menulis'],
  },
  { label: 'Pengetahuan Kuantitatif', matches: ['Pengetahuan Kuantitatif'] },
  {
    label: 'Literasi Bahasa Indonesia',
    matches: ['Literasi Bahasa Indonesia', 'Bahasa Indonesia'],
  },
  { label: 'Literasi Bahasa Inggris', matches: ['Literasi Bahasa Inggris', 'Bahasa Inggris'] },
  { label: 'Penalaran Matematika', matches: ['Penalaran Matematika', 'Matematika'] },
  { label: 'Matematika saintek', matches: ['Matematika IPA'] },
  ...['Fisika', 'Kimia', 'Biologi', 'Geografi', 'Sejarah', 'Ekonomi', 'Sosiologi'].map((s) => ({
    label: s,
    matches: [s],
  })),
];
export const subjectMatches = (label: string, subject: string) =>
  learningCatalogue.find((s) => s.label === label)?.matches.includes(subject) || label === subject;
