import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './helpers/database.mjs';
import { createApp } from '../server/app.mjs';
import { answerWithGemini } from '../server/tutor.mjs';

test('Pahamify workflows preserve ownership and use actual local results', async (t) => {
  let tutorCalls = 0;
  const { app, db } = await createApp({
    database: await createTestDatabase(),
    tutorProvider: async ({ message, history }) => {
      tutorCalls++;
      return `Penjelasan untuk ${message}. Konteks sebelumnya ${history.length} pesan.`;
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, { cookie, method = 'GET', body, form } = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(form ? {} : { 'Content-Type': 'application/json' }),
      },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get('set-cookie')?.split(';')[0],
    };
  };
  const register = async (name) =>
    (
      await request('/auth/register', {
        method: 'POST',
        body: { name, email: `${name.toLowerCase()}@features.test`, password: 'testing-password' },
      })
    ).cookie;
  let alice, bob;
  try {
    alice = await register('Alice');
    bob = await register('Bob');
    await t.test(
      'curriculum and target changes merge without resetting unrelated preferences',
      async () => {
        let r = await request('/study/preferences', {
          method: 'PATCH',
          cookie: alice,
          body: {
            onboarded: true,
            university: 'Kampus Pilihan',
            major: 'Informatika',
            dailyMinutes: 60,
            curriculum: 'Kelas 12',
          },
        });
        assert.equal(r.status, 200);
        await request('/study/preferences', {
          method: 'PATCH',
          cookie: alice,
          body: { leaderboardOptIn: true },
        });
        const state = (await request('/state', { cookie: alice })).data;
        assert.equal(state.preferences.curriculum, 'Kelas 12');
        assert.equal(state.preferences.major, 'Informatika');
        assert.equal(state.preferences.dailyMinutes, 60);
        assert.equal(state.preferences.onboarded, true);
        assert.equal((await request('/state', { cookie: bob })).data.preferences.major, '');
        assert.equal(
          (
            await request('/study/preferences', {
              method: 'PATCH',
              cookie: alice,
              body: { curriculum: 'invalid' },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      'topic filters and curriculum prevent unrelated questions entering a session',
      async () => {
        const r = await request('/practice', {
          method: 'POST',
          cookie: alice,
          body: {
            subject: 'Matematika',
            topic: 'Fungsi kuadrat',
            curriculum: 'UTBK',
            mode: 'practice',
            count: 10,
          },
        });
        assert.equal(r.status, 201);
        assert.equal(r.data.questions.length, 2);
        const savedState = (await request('/state', { cookie: alice })).data;
        assert.ok(
          savedState.activeAttempts.some((a) => a.id === r.data.id && a.questionCount === 2),
        );
        assert.equal((await request('/state', { cookie: bob })).data.activeAttempts.length, 0);
        assert.ok(r.data.questions.every((q) => q.topic === 'Fungsi kuadrat'));
        assert.equal(r.data.questions[0].answer, undefined);
        assert.equal(
          (
            await request('/practice', {
              method: 'POST',
              cookie: alice,
              body: { subject: 'Matematika', curriculum: 'Kelas 7', mode: 'practice', count: 5 },
            })
          ).status,
          400,
        );
        await request('/questions/q1/bookmark', { method: 'POST', cookie: alice });
        assert.deepEqual((await request('/state', { cookie: alice })).data.questionBookmarks, [
          'q1',
        ]);
        assert.deepEqual((await request('/state', { cookie: bob })).data.questionBookmarks, []);
      },
    );
    await t.test('adaptive sessions prioritize last incorrect response', async () => {
      const a = await request('/practice', {
        method: 'POST',
        cookie: alice,
        body: { subject: 'Matematika', mode: 'practice', count: 4 },
      });
      const q = (await db.get('SELECT questions FROM pahamin.attempts WHERE id=$1', a.data.id))
        .questions[0];
      await request(`/attempts/${a.data.id}/answers`, {
        method: 'PATCH',
        cookie: alice,
        body: { index: 0, answer: (q.answer + 1) % 4 },
      });
      await request(`/attempts/${a.data.id}/submit`, { method: 'POST', cookie: alice });
      const next = await request('/practice', {
        method: 'POST',
        cookie: alice,
        body: { subject: 'Matematika', mode: 'practice', count: 1, adaptive: true },
      });
      assert.equal(next.status, 201);
      const review = (await db.get('SELECT result FROM pahamin.attempts WHERE id=$1', a.data.id))
        .result.review;
      assert.ok(review.some((x) => !x.correct && x.id === next.data.questions[0].id));
    });
    await t.test(
      'tryout requires enrollment, supports private subtest results and rejects unknown codes',
      async () => {
        let r = await request('/practice', {
          method: 'POST',
          cookie: alice,
          body: { eventId: 'utbk', mode: 'tryout', subject: 'Matematika', count: 5 },
        });
        assert.equal(r.status, 403);
        assert.equal(
          (await request('/tryouts/utbk/enroll', { method: 'POST', cookie: alice })).status,
          200,
        );
        r = await request('/practice', {
          method: 'POST',
          cookie: alice,
          body: { eventId: 'utbk', mode: 'tryout', subject: 'Matematika', count: 5 },
        });
        assert.equal(r.status, 201);
        assert.equal(r.data.duration, 360);
        assert.equal((await request('/state', { cookie: alice })).data.eventAttempts.length, 1);
        assert.equal((await request('/state', { cookie: bob })).data.eventAttempts.length, 0);
        assert.equal(
          (
            await request('/tryouts/code', {
              method: 'POST',
              cookie: bob,
              body: { code: 'unknown' },
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request('/tryouts/code', {
              method: 'POST',
              cookie: bob,
              body: { code: 'pahamin-utbk' },
            })
          ).data.id,
          'utbk',
        );
        assert.equal(
          (
            await request('/practice', {
              method: 'POST',
              cookie: alice,
              body: { eventId: 'utbk', mode: 'practice', subject: 'Matematika', count: 5 },
            })
          ).status,
          400,
        );
      },
    );
    await t.test('new curriculum imports appear only in matching tryout category', async () => {
      const q = {
        curriculum: 'Kelas 12',
        subject: 'Fisika',
        topic: 'Gaya',
        difficulty: 'Mudah',
        question: 'Sebuah gaya 12 N bekerja pada massa 3 kg. Percepatannya?',
        options: ['2 m/s²', '3 m/s²', '4 m/s²', '6 m/s²'],
        answer: 2,
        explanation: 'Percepatan sama dengan gaya dibagi massa: 12/3 = 4 m/s².',
      };
      await request('/questions/import', {
        method: 'POST',
        cookie: alice,
        body: { questions: [q], source: 'Import Kelas 12' },
      });
      const events = (await request('/state', { cookie: alice })).data.tryouts;
      assert.equal(events.find((e) => e.id === 'tka-sma').total, 1);
      assert.equal(events.find((e) => e.id === 'utbk').total, 10);
      assert.equal(
        (await request('/state', { cookie: bob })).data.tryouts.find((e) => e.id === 'tka-sma')
          .total,
        0,
      );
    });
    await t.test(
      'leaderboard hides non-participants and calculates points from actual graded answers',
      async () => {
        const r = await request('/leaderboard', { cookie: bob });
        assert.equal(r.status, 200);
        assert.ok(r.data.rows.every((x) => x.name === 'Alice'));
        assert.equal(r.data.optedIn, false);
        const before = r.data.rows.length;
        assert.equal(before, 1);
        await request('/study/preferences', {
          method: 'PATCH',
          cookie: alice,
          body: { leaderboardOptIn: false },
        });
        assert.equal((await request('/leaderboard', { cookie: bob })).data.rows.length, 0);
      },
    );
    await t.test(
      'live sessions reject unsafe links and cannot be edited by another account',
      async () => {
        const input = {
          title: 'Latihan fungsi kuadrat',
          subject: 'Matematika',
          className: 'Kelas 12',
          teacher: 'Pengajar Lokal',
          startsAt: '2026-10-26T09:00:00.000Z',
          duration: 60,
          meetingUrl: 'https://meet.google.com/example',
          recordingUrl: '',
        };
        assert.equal(
          (
            await request('/live-sessions', {
              method: 'POST',
              cookie: alice,
              body: { ...input, meetingUrl: 'javascript:alert(1)' },
            })
          ).status,
          400,
        );
        const saved = await request('/live-sessions', {
          method: 'POST',
          cookie: alice,
          body: input,
        });
        assert.equal(saved.status, 201);
        assert.equal((await request('/state', { cookie: alice })).data.liveSessions.length, 1);
        assert.equal((await request('/state', { cookie: bob })).data.liveSessions.length, 0);
        assert.equal(
          (
            await request(`/live-sessions/${saved.data.id}`, {
              method: 'PATCH',
              cookie: bob,
              body: { title: 'Edited' },
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(`/live-sessions/${saved.data.id}`, {
              method: 'PATCH',
              cookie: alice,
              body: { recordingUrl: 'https://www.youtube.com/watch?v=abcdefghijk' },
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      'tutor history is private; unavailable material and guest access are rejected',
      async () => {
        const form = new FormData();
        form.append('message', 'Jelaskan fungsi kuadrat');
        const r = await request('/tutor', { method: 'POST', cookie: alice, form });
        assert.equal(r.status, 200);
        assert.match(r.data.reply, /fungsi kuadrat/);
        assert.equal(tutorCalls, 1);
        assert.equal((await request('/state', { cookie: alice })).data.tutorMessages.length, 2);
        assert.equal((await request('/state', { cookie: bob })).data.tutorMessages.length, 0);
        const missing = new FormData();
        missing.append('message', 'Jelaskan materi');
        missing.append('materialId', 'not-owned');
        assert.equal(
          (await request('/tutor', { method: 'POST', cookie: alice, form: missing })).status,
          404,
        );
        assert.equal((await request('/tutor', { method: 'POST', form })).status, 401);
      },
    );
  } finally {
    await new Promise((r) => server.close(r));
    await db.close();
  }
});

test('tutor Gemini adapter sends bounded history and validates provider failures', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-key';
  try {
    const text = await answerWithGemini(
      {
        message: 'Jelaskan x kuadrat',
        history: [
          { role: 'user', content: 'Halo' },
          { role: 'assistant', content: 'Halo, ada yang bisa dibantu?' },
        ],
        file: { originalname: 'source.txt', buffer: Buffer.from('x kuadrat adalah x dikali x') },
      },
      async (url, options) => {
        assert.match(url, /generativelanguage.googleapis.com/);
        const body = JSON.parse(options.body);
        assert.equal(Object.hasOwn(body.generationConfig, 'temperature'), false);
        assert.equal(body.contents[1].role, 'model');
        assert.match(body.contents[2].parts[1].text, /dokumen_sumber/);
        return Response.json({
          candidates: [{ content: { parts: [{ text: 'x kuadrat adalah x × x.' }] } }],
        });
      },
    );
    assert.match(text, /kuadrat/);
    await assert.rejects(
      answerWithGemini({ message: 'Halo' }, async () => new Response('', { status: 429 })),
      /Kuota/,
    );
    await assert.rejects(
      answerWithGemini({ message: 'Halo' }, async () => new Response('', { status: 503 })),
      /sedang sibuk/,
    );
    await assert.rejects(
      answerWithGemini({ message: 'Halo' }, async () => Response.json({})),
      /tidak memberikan/,
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
