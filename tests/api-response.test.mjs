import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from '../src/api.ts';

test('HTML SPA fallback with status 200 is rejected before it can become application state', async () => {
  await assert.rejects(
    readApiResponse(
      new Response('<!doctype html><div id="root"></div>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
      '/state',
    ),
    /API belum tersedia/,
  );
});
test('invalid JSON and incomplete startup payloads produce recoverable errors', async () => {
  await assert.rejects(
    readApiResponse(
      new Response('{', { headers: { 'Content-Type': 'application/json' } }),
      '/state',
    ),
    /tidak dapat dibaca/,
  );
  for (const payload of [
    null,
    {},
    { error: 'Backend belum siap.' },
    { materials: [], questions: [] },
  ])
    await assert.rejects(readApiResponse(Response.json(payload), '/state'));
});
test('valid startup state and provider error messages retain their original meaning', async () => {
  const state = { user: null, preferences: {}, ai: {} };
  for (const field of [
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
  ])
    state[field] = [];
  assert.deepEqual(await readApiResponse(Response.json(state), '/state'), state);
  await assert.rejects(
    readApiResponse(
      Response.json({ error: 'Model sedang sibuk.' }, { status: 502 }),
      '/ai/generate',
    ),
    /Model sedang sibuk/,
  );
});
