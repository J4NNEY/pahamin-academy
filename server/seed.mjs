const q = (id, subject, topic, question, options, answer, explanation, difficulty = 'Mudah') => ({
  id,
  subject,
  topic,
  question,
  options,
  answer,
  explanation,
  difficulty,
  source: 'Contoh Pahamin',
});
export const seedQuestions = [
  q(
    'q1',
    'Matematika',
    'Fungsi kuadrat',
    'Titik puncak grafik f(x) = x² − 6x + 8 adalah …',
    ['(3, −1)', '(−3, −1)', '(3, 1)', '(−3, 1)'],
    0,
    'Koordinat x puncak adalah −b/(2a) = 6/2 = 3. Substitusi x = 3 memberikan 9 − 18 + 8 = −1.',
  ),
  q(
    'q2',
    'Matematika',
    'Fungsi kuadrat',
    'Akar-akar persamaan x² − 5x + 6 = 0 adalah …',
    ['1 dan 6', '2 dan 3', '−2 dan −3', '−1 dan −6'],
    1,
    'Faktorkan x² − 5x + 6 menjadi (x − 2)(x − 3). Maka x = 2 atau x = 3.',
  ),
  q(
    'q3',
    'Matematika',
    'Peluang',
    'Sebuah dadu seimbang dilempar sekali. Peluang muncul bilangan prima adalah …',
    ['1/6', '1/3', '1/2', '2/3'],
    2,
    'Bilangan prima pada dadu adalah 2, 3, dan 5. Ada 3 kejadian dari 6 kemungkinan, sehingga peluangnya 3/6 = 1/2.',
  ),
  q(
    'q4',
    'Matematika',
    'Barisan aritmetika',
    'Suku ke-10 barisan 3, 7, 11, 15, … adalah …',
    ['35', '37', '39', '43'],
    2,
    'Rumus Un = a + (n − 1)b. Dengan a = 3 dan b = 4, U10 = 3 + 9 × 4 = 39.',
  ),
  q(
    'q5',
    'Fisika',
    'Hukum Newton',
    'Gaya resultan 20 N bekerja pada benda bermassa 4 kg. Percepatan benda adalah …',
    ['4 m/s²', '5 m/s²', '16 m/s²', '80 m/s²'],
    1,
    'Hukum II Newton menyatakan F = ma. Jadi a = F/m = 20/4 = 5 m/s².',
  ),
  q(
    'q6',
    'Fisika',
    'Gerak lurus',
    'Mobil bergerak dengan kecepatan tetap 15 m/s selama 20 sekon. Jarak yang ditempuh adalah …',
    ['35 m', '150 m', '300 m', '750 m'],
    2,
    'Pada gerak lurus beraturan, s = v × t = 15 × 20 = 300 meter.',
  ),
  q(
    'q7',
    'Biologi',
    'Sel',
    'Organel yang berperan utama dalam menghasilkan ATP melalui respirasi aerob adalah …',
    ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'],
    1,
    'Mitokondria adalah tempat siklus Krebs dan fosforilasi oksidatif yang menghasilkan sebagian besar ATP pada respirasi aerob.',
  ),
  q(
    'q8',
    'Biologi',
    'Ekosistem',
    'Dalam rantai makanan rumput → belalang → katak → ular, konsumen tingkat II adalah …',
    ['Rumput', 'Belalang', 'Katak', 'Ular'],
    2,
    'Rumput adalah produsen, belalang konsumen I, katak konsumen II, dan ular konsumen III.',
  ),
  q(
    'q9',
    'Kimia',
    'Struktur atom',
    'Atom netral dengan nomor atom 11 memiliki jumlah elektron sebanyak …',
    ['10', '11', '12', '23'],
    1,
    'Nomor atom menunjukkan jumlah proton. Pada atom netral, jumlah elektron sama dengan jumlah proton, yaitu 11.',
  ),
  q(
    'q10',
    'Kimia',
    'Larutan',
    'Larutan dengan pH = 3 bersifat …',
    ['Asam', 'Netral', 'Basa lemah', 'Basa kuat'],
    0,
    'Pada suhu 25 °C, larutan dengan pH kurang dari 7 bersifat asam, pH 7 netral, dan pH lebih dari 7 bersifat basa.',
  ),
  q(
    'q11',
    'Bahasa Indonesia',
    'Ide pokok',
    'Kalimat yang memuat gagasan utama suatu paragraf disebut …',
    ['Kalimat penjelas', 'Kalimat utama', 'Kalimat tanya', 'Kalimat langsung'],
    1,
    'Kalimat utama mengandung gagasan utama paragraf. Kalimat penjelas berfungsi menguraikan dan mendukung gagasan tersebut.',
  ),
  q(
    'q12',
    'Bahasa Indonesia',
    'Kata baku',
    'Penulisan kata baku yang tepat adalah …',
    ['Aktifitas', 'Resiko', 'Praktik', 'Apotik'],
    2,
    'Bentuk baku adalah aktivitas, risiko, praktik, dan apotek. Dari pilihan yang tersedia, hanya praktik yang baku.',
  ),
  q(
    'q13',
    'Bahasa Inggris',
    'Simple present',
    'Choose the correct sentence: She ___ to school every morning.',
    ['go', 'goes', 'going', 'gone'],
    1,
    'A singular third-person subject (she) takes a verb ending in -s or -es in the simple present: she goes.',
  ),
  q(
    'q14',
    'Bahasa Inggris',
    'Reading',
    'The word “however” is most commonly used to express …',
    ['Addition', 'Contrast', 'Cause', 'Time'],
    1,
    'However introduces a contrast between statements, similar to nevertheless or but.',
  ),
  q(
    'q15',
    'Penalaran Umum',
    'Logika',
    'Semua peneliti membaca jurnal. Rani adalah peneliti. Kesimpulan yang pasti benar adalah …',
    [
      'Rani menulis jurnal',
      'Rani membaca jurnal',
      'Semua pembaca adalah peneliti',
      'Rani tidak membaca jurnal',
    ],
    1,
    'Pernyataan umum berlaku bagi setiap peneliti. Karena Rani termasuk peneliti, Rani membaca jurnal.',
  ),
  q(
    'q16',
    'Penalaran Umum',
    'Pola bilangan',
    'Bilangan berikutnya pada pola 2, 6, 12, 20, 30, … adalah …',
    ['36', '40', '42', '44'],
    2,
    'Selisih antarsuku adalah 4, 6, 8, 10. Selisih berikutnya 12, sehingga 30 + 12 = 42.',
  ),
];

const material = (
  id,
  title,
  subject,
  topic,
  summary,
  sections,
  keyPoints,
  minutes,
  color,
  icon,
) => ({
  id,
  title,
  subject,
  topic,
  summary,
  sections,
  keyPoints,
  minutes,
  color,
  icon,
  source: 'Materi contoh',
  createdAt: '2026-10-25T00:00:00.000Z',
});
export const seedMaterials = [
  material(
    'm1',
    'Kenalan dengan fungsi kuadrat',
    'Matematika',
    'Fungsi kuadrat',
    'Pahami bentuk grafik, titik puncak, dan akar persamaan kuadrat dengan langkah sederhana.',
    [
      {
        heading: 'Apa itu fungsi kuadrat?',
        content:
          'Fungsi kuadrat memiliki bentuk **f(x) = ax² + bx + c**, dengan a ≠ 0. Grafiknya berupa parabola. Jika a > 0, parabola terbuka ke atas. Jika a < 0, parabola terbuka ke bawah.',
      },
      {
        heading: 'Menemukan titik puncak',
        content:
          'Koordinat horizontal titik puncak adalah **xp = −b/(2a)**. Substitusikan xp ke f(x) untuk memperoleh yp.\n\nContoh: f(x) = x² − 6x + 8. Maka xp = 3 dan yp = 9 − 18 + 8 = −1. Titik puncaknya (3, −1).',
      },
      {
        heading: 'Akar dan diskriminan',
        content:
          'Akar adalah nilai x saat f(x) = 0. Diskriminan **D = b² − 4ac** menentukan banyak akar real: D > 0 dua akar berbeda, D = 0 satu akar kembar, dan D < 0 tidak ada akar real.\n\nUntuk x² − 5x + 6 = 0, faktorisasi (x − 2)(x − 3) = 0 menghasilkan akar 2 dan 3.',
      },
    ],
    [
      'Tanda a menentukan arah parabola.',
      'Sumbu simetri berada pada x = −b/(2a).',
      'Diskriminan menentukan jumlah akar real.',
    ],
    12,
    'peach',
    'math',
  ),
  material(
    'm2',
    'Gerak dan gaya di sekitar kita',
    'Fisika',
    'Hukum Newton',
    'Dari benda diam sampai benda bergerak: kenali tiga hukum Newton.',
    [
      {
        heading: 'Hukum I: kelembaman',
        content:
          'Benda mempertahankan keadaan diam atau gerak lurus beraturan jika resultan gaya yang bekerja **nol**. Saat bus mendadak mengerem, tubuh terdorong ke depan karena kecenderungan mempertahankan gerak.',
      },
      {
        heading: 'Hukum II: F = ma',
        content:
          'Percepatan sebanding dengan resultan gaya dan berbanding terbalik dengan massa. **ΣF = m × a**. Satuan gaya adalah newton, massa kilogram, dan percepatan m/s².\n\nJika resultan gaya 20 N bekerja pada massa 4 kg, percepatannya 5 m/s².',
      },
      {
        heading: 'Hukum III: aksi dan reaksi',
        content:
          'Jika benda A memberikan gaya pada B, B memberikan gaya sama besar dan berlawanan arah pada A. Pasangan gaya ini **bekerja pada dua benda berbeda**, sehingga tidak saling meniadakan pada satu benda.',
      },
    ],
    [
      'Resultan gaya nol berarti percepatan nol.',
      'Hukum II menghubungkan gaya, massa, dan percepatan.',
      'Aksi dan reaksi bekerja pada benda berbeda.',
    ],
    10,
    'lavender',
    'atom',
  ),
  material(
    'm3',
    'Sel: dunia kecil, peran besar',
    'Biologi',
    'Sel',
    'Jelajahi bagian penyusun sel dan fungsi organelnya.',
    [
      {
        heading: 'Unit dasar kehidupan',
        content:
          'Sel merupakan unit struktural dan fungsional terkecil makhluk hidup. Sel prokariotik tidak memiliki inti bermembran, sedangkan sel eukariotik memiliki inti yang dibatasi membran.',
      },
      {
        heading: 'Organel dan pekerjaannya',
        content:
          '**Nukleus** menyimpan sebagian besar DNA. **Ribosom** menyintesis protein. **Mitokondria** berperan dalam respirasi aerob. **Badan Golgi** memodifikasi dan mengemas produk sel.\n\nSel tumbuhan memiliki dinding sel dan umumnya kloroplas pada jaringan yang berfotosintesis.',
      },
    ],
    [
      'Sel adalah unit dasar makhluk hidup.',
      'Ribosom menjadi tempat sintesis protein.',
      'Mitokondria menghasilkan ATP melalui respirasi aerob.',
    ],
    8,
    'mint',
    'leaf',
  ),
  material(
    'm4',
    'Cari ide pokok, pahami bacaan',
    'Bahasa Indonesia',
    'Ide pokok',
    'Cara membaca paragraf secara efektif dan menemukan gagasan utamanya.',
    [
      {
        heading: 'Gagasan utama dan penjelas',
        content:
          'Gagasan utama merupakan inti pembahasan paragraf. Gagasan penjelas menguraikan, memberi contoh, atau mendukung inti tersebut. Kalimat utama bisa berada di awal, akhir, atau tersirat dari keseluruhan paragraf.',
      },
      {
        heading: 'Langkah menemukan ide pokok',
        content:
          '1. Baca paragraf secara utuh.\n2. Tanyakan: apa yang paling banyak dibahas?\n3. Bedakan pernyataan umum dengan contoh.\n4. Rumuskan inti paragraf dengan kata-katamu sendiri.\n\nJangan memilih rincian yang hanya menjelaskan satu bagian kecil.',
      },
    ],
    [
      'Baca paragraf secara utuh.',
      'Kalimat utama berisi gagasan yang lebih umum.',
      'Contoh dan rincian mendukung gagasan utama.',
    ],
    7,
    'butter',
    'book',
  ),
  material(
    'm5',
    'Simple present, made simple',
    'Bahasa Inggris',
    'Simple present',
    'Pelajari pola kalimat untuk kebiasaan, fakta, dan kegiatan rutin.',
    [
      {
        heading: 'When do we use it?',
        content:
          'The simple present describes **habits, routines, and general facts**. Example: “The sun rises in the east.” Time expressions include every day, usually, and often.',
      },
      {
        heading: 'Sentence patterns',
        content:
          'With **I / you / we / they**, use the base verb: “They study every day.” With **he / she / it**, add -s or -es: “She studies every day.”\n\nFor negatives use do not or does not + base verb. For questions use Do / Does + subject + base verb.',
      },
    ],
    [
      'Use simple present for habits and general facts.',
      'He, she, it take -s/-es in positive sentences.',
      'Use the base verb after do or does.',
    ],
    9,
    'sky',
    'language',
  ),
  material(
    'm6',
    'Membaca pola, melatih logika',
    'Penalaran Umum',
    'Pola bilangan',
    'Strategi mengenali pola dan menyimpulkan informasi dengan tepat.',
    [
      {
        heading: 'Amati selisih antarsuku',
        content:
          'Pada deret 2, 6, 12, 20, 30, selisihnya 4, 6, 8, 10. Selisih bertambah 2, sehingga selisih berikutnya 12 dan suku berikutnya **42**.',
      },
      {
        heading: 'Hindari membalik pernyataan',
        content:
          'Jika semua A adalah B, bukan berarti semua B adalah A. Contoh: semua kucing adalah mamalia, tetapi tidak semua mamalia adalah kucing.\n\nKesimpulan yang benar harus mengikuti informasi yang diberikan tanpa menambah asumsi baru.',
      },
    ],
    [
      'Periksa selisih, rasio, atau pola selang-seling.',
      'Kesimpulan harus didukung premis.',
      'Jangan membalik implikasi secara sembarangan.',
    ],
    11,
    'rose',
    'brain',
  ),
];
