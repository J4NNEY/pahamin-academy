const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function readApiResponse(response: Response, path: string): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json'))
    throw new Error(
      'API belum tersedia pada deployment ini. Periksa konfigurasi backend Cloudflare.',
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Respons API tidak dapat dibaca. Coba lagi beberapa saat.');
  }
  if (!response.ok || (isRecord(data) && typeof data.error === 'string'))
    throw new Error(
      isRecord(data) && typeof data.error === 'string'
        ? data.error
        : 'Permintaan gagal. Coba lagi.',
    );
  if (
    path === '/state' &&
    (!isRecord(data) ||
      !isRecord(data.preferences) ||
      ![
        'materials',
        'questions',
        'completed',
        'bookmarks',
        'attempts',
        'subjectStats',
        'curricula',
        'questionBookmarks',
        'tryouts',
        'eventAttempts',
        'liveSessions',
        'activeAttempts',
        'tutorMessages',
      ].every((key) => Array.isArray(data[key])) ||
      !(data.user === null || isRecord(data.user)) ||
      !isRecord(data.ai))
  )
    throw new Error(
      'Data awal aplikasi tidak valid. Periksa versi API dan konfigurasi deployment.',
    );
  return data;
}

export async function api<T = { ok: boolean }>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch('/api' + path, {
    credentials: 'same-origin',
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers },
  });
  return (await readApiResponse(response, path)) as T;
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
