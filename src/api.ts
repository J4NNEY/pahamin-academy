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
  const data = await response
    .json()
    .catch(() => ({ error: 'Server belum tersambung. Jalankan npm run dev.' }));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal. Coba lagi.');
  return data;
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
