// Classify provider failures without exposing Google's raw payload, prompts or keys.
export async function geminiError(response) {
  const data = await response.json().catch(() => ({}));
  const upstream = data?.error || {};
  const details = Array.isArray(upstream.details) ? upstream.details : [];
  const reason = details.find((detail) => detail?.reason)?.reason;
  let code, message;
  if (
    [401, 403].includes(response.status) ||
    ['API_KEY_INVALID', 'API_KEY_EXPIRED', 'API_KEY_SERVICE_BLOCKED'].includes(reason)
  ) {
    code = 'GEMINI_AUTH';
    message = 'API key Gemini ditolak. Periksa key dan izin model di server.';
  } else if (response.status === 429) {
    code = 'GEMINI_QUOTA';
    message =
      'Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi nanti atau periksa kuota proyek Gemini.';
  } else if (response.status === 404) {
    code = 'GEMINI_MODEL';
    message = 'Model Gemini tidak tersedia. Periksa GEMINI_MODEL di .env.';
  } else if (response.status === 402) {
    code = 'GEMINI_BILLING';
    message = 'Kredit Gemini tidak tersedia. Periksa penagihan proyek Gemini.';
  } else if (response.status === 413) {
    code = 'GEMINI_FILE_SIZE';
    message = 'Dokumen melebihi batas permintaan Gemini. Pecah file menjadi beberapa bagian.';
  } else if (response.status === 400) {
    code = 'GEMINI_INVALID_ARGUMENT';
    message =
      'Gemini menolak permintaan (HTTP 400). Periksa kompatibilitas model dan format dokumen; ini belum tentu masalah ukuran file.';
    // Only match known categories; never pass the provider message to the client.
    const description = String(upstream.message || '');
    if (/password|encrypted/i.test(description)) {
      code = 'GEMINI_PDF_LOCKED';
      message =
        'PDF dilindungi password atau terenkripsi. Gunakan salinan PDF yang dapat dibuka tanpa password.';
    } else if (/input.*token|token.*limit|context.*length|too many pages/i.test(description)) {
      code = 'GEMINI_INPUT_LIMIT';
      message =
        'Isi dokumen melampaui batas baca model Gemini. Pecah dokumen menjadi beberapa bagian.';
    }
  } else if (response.status === 503) {
    code = 'GEMINI_BUSY';
    message =
      'Model Gemini sedang sibuk karena permintaan tinggi. Coba lagi beberapa saat; file tidak perlu diubah.';
  } else if ([408, 504].includes(response.status)) {
    code = 'GEMINI_TIMEOUT';
    message = 'Gemini belum selesai merespons. Tunggu sebentar lalu coba kembali.';
  } else {
    code = 'GEMINI_PROVIDER';
    message = `Layanan Gemini gagal merespons (HTTP ${response.status}). Coba kembali beberapa saat.`;
  }
  return Object.assign(new Error(message), { status: 502, code, providerStatus: response.status });
}
