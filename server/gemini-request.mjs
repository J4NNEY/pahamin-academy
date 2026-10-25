import { setTimeout as delay } from 'node:timers/promises';

// Retry overload once, with the original request deadline. Never retry a 400 or
// switch models silently. Reuse the same in-memory body; do not persist uploads.
export async function geminiRequest(url, options, fetcher = fetch, wait = delay) {
  const response = await fetcher(url, options);
  if (response.status !== 503) return response;
  await response.body?.cancel();
  await wait(1000, undefined, { signal: options.signal });
  options.signal?.throwIfAborted();
  return fetcher(url, options);
}
