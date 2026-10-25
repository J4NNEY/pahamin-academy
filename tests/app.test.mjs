import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './helpers/database.mjs';
import { createApp } from '../server/app.mjs';
import { parseQuestions, gradeQuestions } from '../server/validation.mjs';
import { fileParts, generateWithGemini } from '../server/gemini.mjs';

const question = {
  subject: 'Matematika',
  topic: 'Penjumlahan',
  difficulty: 'Mudah',
  question: 'Berapakah 20 ditambah 5?',
  options: ['20', '25', '30', '35'],
  answer: 1,
  explanation: '20 + 5 = 25, sehingga jawabannya adalah 25.',
};
const material = {
  title: 'Memahami penjumlahan',
  subject: 'Matematika',
  topic: 'Penjumlahan',
  summary: 'Materi untuk memahami operasi penjumlahan dengan langkah sederhana.',
  sections: [
    {
      heading: 'Menjumlahkan bilangan',
      content: 'Penjumlahan menggabungkan dua nilai. Sebagai contoh, 20 + 5 menghasilkan 25.',
    },
  ],
  keyPoints: ['Tambahkan nilai kedua pada nilai pertama.'],
  quiz: [question],
};
test('CSV/JSON import rejects invalid rows and preserves quoted commas', () => {
  const csv =
    'subject,topic,difficulty,question,option_a,option_b,option_c,option_d,answer,explanation\nMatematika,Penjumlahan,Mudah,"Berapakah 20, ditambah 5?",20,25,30,35,B,20 + 5 = 25';
  const rows = parseQuestions(csv, '.csv');
  assert.equal(rows[0].answer, 1);
  assert.match(rows[0].question, /,/);
  assert.equal(parseQuestions(JSON.stringify([question]), '.json').length, 1);
  assert.throws(
    () => parseQuestions(JSON.stringify([{ ...question, answer: 8 }]), '.json'),
    /Soal 1/,
  );
  assert.throws(() =>
    parseQuestions(
      JSON.stringify([{ ...question, options: ['A', 'B', 'C', 'D'], answer: 4 }]),
      '.json',
    ),
  );
  assert.throws(() => parseQuestions('[]', '.json'));
  assert.throws(() => parseQuestions(JSON.stringify(Array(201).fill(question)), '.json'));
});
test('grading includes unanswered questions in denominator', () => {
  const r = gradeQuestions([question, question], { 0: 1 });
  assert.equal(r.score, 50);
  assert.equal(r.correct, 1);
  assert.equal(r.unanswered, 1);
  assert.equal(r.review[1].selected, null);
});
test('file processing validates magic bytes and text limits', async () => {
  await assert.rejects(
    fileParts({ originalname: 'fake.pdf', buffer: Buffer.from('not pdf') }),
    /Isi file/,
  );
  await assert.rejects(
    fileParts({ originalname: 'empty.txt', buffer: Buffer.from('   ') }),
    /kosong/,
  );
  await assert.rejects(
    fileParts({ originalname: 'big.txt', buffer: Buffer.from('a'.repeat(150001)) }),
    /150.000/,
  );
  await assert.rejects(
    fileParts({ originalname: 'script.exe', buffer: Buffer.from('data') }),
    /Format/,
  );
  assert.match(
    (await fileParts({ originalname: 'source.txt', buffer: Buffer.from('materi lengkap') }))[0]
      .text,
    /dokumen_sumber/,
  );
});
test('Gemini adapter uses server key, validates output, handles quota and no-key states', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const input = {
    file: { originalname: 'test.txt', buffer: Buffer.from('Materi penjumlahan bilangan') },
    subject: 'Matematika',
  };
  try {
    await assert.rejects(generateWithGemini(input), /belum terhubung/);
    process.env.GEMINI_API_KEY = 'test-key-never-production';
    const result = await generateWithGemini(input, async (url, options) => {
      assert.match(url, /generativelanguage.googleapis.com/);
      assert.equal(options.headers['x-goog-api-key'], 'test-key-never-production');
      assert.ok(JSON.parse(options.body).generationConfig.responseJsonSchema);
      assert.equal(Object.hasOwn(JSON.parse(options.body).generationConfig, 'temperature'), false);
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(material) }] } }],
      });
    });
    assert.equal(result.title, material.title);
    await assert.rejects(
      generateWithGemini(input, async () => new Response('', { status: 429 })),
      /Kuota/,
    );
    await assert.rejects(
      generateWithGemini(input, async () => new Response('', { status: 503 })),
      /sedang sibuk/,
    );
    await assert.rejects(
      generateWithGemini(input, async () =>
        Response.json({ candidates: [{ content: { parts: [{ text: '{"wrong":true}' }] } }] }),
      ),
      /sesuai format/,
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
test('HTTP application: accounts, ownership, imports, AI drafts, grading, expiry and logout', async (t) => {
  let calls = 0;
  const { app, db } = await createApp({
    database: await createTestDatabase(),
    provider: async ({ mode }) => {
      calls++;
      return mode === 'questions' ? [question] : material;
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, { cookie, body, method = 'GET', headers = {}, form } = {}) => {
    const response = await fetch(base + '/api' + url, {
      method,
      headers: {
        ...(form ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
      headers: response.headers,
    };
  };
  let alice, bob, aid;
  try {
    await t.test('guest sees examples and never receives answer keys', async () => {
      const r = await request('/state');
      assert.equal(r.status, 200);
      assert.equal(r.data.user, null);
      assert.equal(r.data.materials.length, 6);
      assert.equal(r.data.questions.length, 16);
      assert.equal(r.data.questions[0].answer, undefined);
      assert.equal(r.data.questions[0].explanation, undefined);
      assert.equal(
        (
          await request('/questions/import', {
            method: 'POST',
            body: { questions: [question], source: 'x' },
          })
        ).status,
        401,
      );
    });
    await t.test('register and login securely, reject duplicate and bad credentials', async () => {
      const a = await request('/auth/register', {
        method: 'POST',
        body: { name: 'Alice Test', email: 'alice@test.dev', password: 'secure-password' },
      });
      assert.equal(a.status, 201);
      alice = a.cookie;
      assert.match(a.headers.get('set-cookie'), /HttpOnly/i);
      assert.match(a.headers.get('set-cookie'), /SameSite=Strict/i);
      assert.equal(
        (
          await request('/auth/register', {
            method: 'POST',
            body: { name: 'Alice Test', email: 'alice@test.dev', password: 'secure-password' },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request('/auth/login', {
            method: 'POST',
            body: { email: 'alice@test.dev', password: 'wrong-password' },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request('/auth/login', {
            method: 'POST',
            body: { email: 'alice@test.dev', password: 'secure-password' },
          })
        ).status,
        200,
      );
      const b = await request('/auth/register', {
        method: 'POST',
        body: { name: 'Bob Test', email: 'bob@test.dev', password: 'secure-password' },
      });
      bob = b.cookie;
    });
    await t.test('cross-origin writes are rejected', async () => {
      assert.equal(
        (
          await request('/profile', {
            cookie: alice,
            method: 'PATCH',
            headers: { Origin: 'https://evil.example' },
            body: { name: 'Changed', goal: 5 },
          })
        ).status,
        403,
      );
    });
    await t.test('profile, completion and bookmarks persist and are private', async () => {
      assert.equal(
        (
          await request('/profile', {
            cookie: alice,
            method: 'PATCH',
            body: { name: 'Alice', goal: 4 },
          })
        ).status,
        200,
      );
      await request('/materials/m1/complete', { cookie: alice, method: 'POST' });
      await request('/materials/m1/complete', { cookie: alice, method: 'POST' });
      await request('/materials/m1/bookmark', { cookie: alice, method: 'POST' });
      const a = (await request('/state', { cookie: alice })).data;
      assert.equal(a.user.goal, 4);
      assert.equal(a.completed.length, 1);
      assert.deepEqual(a.bookmarks, ['m1']);
      const b = (await request('/state', { cookie: bob })).data;
      assert.equal(b.completed.length, 0);
      assert.equal(b.bookmarks.length, 0);
    });
    await t.test(
      'multipart CSV/JSON previews do not save until confirmation; duplicate import is skipped',
      async () => {
        const csvForm = new FormData();
        csvForm.append(
          'file',
          new Blob([
            'subject,topic,difficulty,question,option_a,option_b,option_c,option_d,answer,explanation\nMatematika,Penjumlahan,Mudah,Berapakah 20 ditambah 5?,20,25,30,35,B,20 + 5 sama dengan 25.',
          ]),
          'soal.csv',
        );
        const csvPreview = await request('/import/preview', {
          method: 'POST',
          cookie: alice,
          form: csvForm,
        });
        assert.equal(csvPreview.status, 200);
        assert.equal(csvPreview.data.questions[0].answer, 1);
        const form = new FormData();
        form.append(
          'file',
          new Blob([JSON.stringify([question])], { type: 'application/json' }),
          'soal.json',
        );
        form.append('subject', 'Matematika');
        const r = await request('/import/preview', { method: 'POST', cookie: alice, form });
        assert.equal(r.status, 200);
        assert.equal(r.data.questions[0].answer, 1);
        assert.equal(calls, 0);
        assert.equal((await request('/state', { cookie: alice })).data.questions.length, 16);
        const saved = await request('/questions/import', {
          method: 'POST',
          cookie: alice,
          body: { questions: r.data.questions, source: 'soal.json' },
        });
        assert.equal(saved.status, 201);
        assert.equal(saved.data.count, 1);
        const duplicate = await request('/questions/import', {
          method: 'POST',
          cookie: alice,
          body: { questions: r.data.questions, source: 'soal.json' },
        });
        assert.equal(duplicate.data.skipped, 1);
        assert.equal((await request('/state', { cookie: alice })).data.questions.length, 17);
        assert.equal((await request('/state', { cookie: bob })).data.questions.length, 16);
      },
    );
    await t.test(
      'AI draft is validated, then material and quiz save atomically to owner',
      async () => {
        const form = new FormData();
        form.append('file', new Blob(['Bahan penjumlahan bilangan']), 'materi.txt');
        form.append('subject', 'Matematika');
        const r = await request('/ai/generate', { method: 'POST', cookie: alice, form });
        assert.equal(r.status, 200);
        assert.equal(calls, 1);
        assert.equal((await request('/state', { cookie: alice })).data.materials.length, 6);
        const saved = await request('/materials', {
          method: 'POST',
          cookie: alice,
          body: { material: r.data.material, source: 'materi.txt' },
        });
        assert.equal(saved.status, 201);
        assert.equal((await request('/state', { cookie: alice })).data.materials.length, 7);
        assert.equal((await request('/state', { cookie: bob })).data.materials.length, 6);
        assert.equal(
          (await request(`/materials/${saved.data.id}/complete`, { method: 'POST', cookie: bob }))
            .status,
          404,
        );
      },
    );
    await t.test(
      'server snapshots questions, saves answers and grades without trusting client score',
      async () => {
        const a = await request('/practice', {
          method: 'POST',
          cookie: alice,
          body: { mode: 'tryout', subject: 'Matematika', count: 5 },
        });
        assert.equal(a.status, 201);
        aid = a.data.id;
        assert.equal(a.data.questions.length, 5);
        assert.equal(a.data.questions[0].answer, undefined);
        assert.equal(a.data.duration, 450);
        assert.equal((await request(`/attempts/${aid}`, { cookie: bob })).status, 404);
        const snapshot = (await db.get('SELECT questions FROM pahamin.attempts WHERE id=$1', aid))
          .questions;
        assert.equal(
          (
            await request(`/attempts/${aid}/answers`, {
              method: 'PATCH',
              cookie: alice,
              body: { index: 99, answer: 0 },
            })
          ).status,
          400,
        );
        await request(`/attempts/${aid}/answers`, {
          method: 'PATCH',
          cookie: alice,
          body: { index: 0, answer: snapshot[0].answer },
        });
        assert.equal(
          (await request(`/attempts/${aid}`, { cookie: alice })).data.answers[0],
          snapshot[0].answer,
        );
        const r = await request(`/attempts/${aid}/submit`, {
          method: 'POST',
          cookie: alice,
          body: { score: 100, answers: Object.fromEntries(snapshot.map((q, i) => [i, q.answer])) },
        });
        assert.equal(r.data.score, 20);
        assert.equal(r.data.unanswered, 4);
        assert.equal(r.data.review[0].answer, snapshot[0].answer);
        assert.equal(
          (await request(`/attempts/${aid}/submit`, { method: 'POST', cookie: alice })).data.score,
          20,
        );
        assert.equal(
          (
            await request(`/attempts/${aid}/answers`, {
              method: 'PATCH',
              cookie: alice,
              body: { index: 1, answer: 0 },
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      'concurrent answer saves preserve both answers and concurrent submit returns one result',
      async () => {
        const created = await request('/practice', {
          method: 'POST',
          cookie: alice,
          body: { mode: 'practice', subject: 'Matematika', count: 4 },
        });
        assert.equal(created.status, 201);
        const id = created.data.id;
        const snapshot = (await db.get('SELECT questions FROM pahamin.attempts WHERE id=$1', id))
          .questions;
        const saved = await Promise.all(
          [0, 1].map((index) =>
            request(`/attempts/${id}/answers`, {
              method: 'PATCH',
              cookie: alice,
              body: { index, answer: snapshot[index].answer },
            }),
          ),
        );
        assert.ok(saved.every((response) => response.status === 200));
        const session = (await request(`/attempts/${id}`, { cookie: alice })).data;
        assert.equal(session.answers[0], snapshot[0].answer);
        assert.equal(session.answers[1], snapshot[1].answer);
        const results = await Promise.all(
          [1, 2].map(() => request(`/attempts/${id}/submit`, { method: 'POST', cookie: alice })),
        );
        assert.ok(results.every((response) => response.status === 200));
        assert.deepEqual(results[0].data, results[1].data);
        assert.equal(results[0].data.correct, 2);
      },
    );
    await t.test('expired tryout rejects late answers but can be graded', async () => {
      const r = await request('/practice', {
        method: 'POST',
        cookie: alice,
        body: { mode: 'tryout', subject: 'Fisika', count: 5 },
      });
      const id = r.data.id;
      await db.run('UPDATE pahamin.attempts SET started=$1 WHERE id=$2', Date.now() - 999999, id);
      assert.equal(
        (
          await request(`/attempts/${id}/answers`, {
            method: 'PATCH',
            cookie: alice,
            body: { index: 0, answer: 0 },
          })
        ).status,
        409,
      );
      assert.equal(
        (await request(`/attempts/${id}/submit`, { method: 'POST', cookie: alice })).data.score,
        0,
      );
    });
    await t.test('logout revokes current session', async () => {
      await request('/auth/logout', { method: 'POST', cookie: alice });
      assert.equal((await request('/state', { cookie: alice })).data.user, null);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
});
