import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createTestDatabase } from './helpers/database.mjs';
import { createApp } from '../server/app.mjs';
import { setAdminAccess } from '../server/admin-access.mjs';
import { applyMigrations, migrationFile } from '../server/migrations.mjs';

const question = {
  curriculum: 'Kelas 12',
  subject: 'Matematika',
  topic: 'Topik admin',
  difficulty: 'Mudah',
  question: 'Berapakah 10 ditambah 5?',
  options: ['10', '15', '20', '25'],
  answer: 1,
  explanation: 'Sepuluh ditambah lima sama dengan lima belas.',
};
const material = {
  curriculum: 'Kelas 12',
  subject: 'Matematika',
  topic: 'Topik admin',
  title: 'Materi resmi admin',
  summary: 'Belajar penjumlahan bilangan dengan contoh sederhana.',
  sections: [
    { heading: 'Menjumlahkan', content: 'Gabungkan dua bilangan untuk memperoleh jumlahnya.' },
  ],
  keyPoints: ['Penjumlahan menggabungkan bilangan.'],
};

test('admin catalogue protects roles, publishes shared content and preserves attempt snapshots', async (t) => {
  const db = await createTestDatabase();
  const { app } = await createApp({ database: db, serveStatic: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, cookie, body, method = body === undefined ? 'GET' : 'POST') {
    const r = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get('set-cookie')?.split(';')[0],
    };
  }
  const register = async (email) =>
    (
      await request('/auth/register', null, {
        email,
        name: 'Admin test',
        password: 'testing-password',
        role: 'admin',
      })
    ).cookie;
  let admin, student, lesson, item, attempt;
  try {
    admin = await register('editor@admin.test');
    student = await register('student@admin.test');
    await t.test(
      'registration/profile cannot assign role; all admin routes reject guests and students',
      async () => {
        assert.equal((await request('/state', admin)).data.user.role, 'student');
        await request('/profile', student, { name: 'Student', goal: 3, role: 'admin' }, 'PATCH');
        for (const [path, method, body] of [
          ['/admin/content', 'GET'],
          ['/admin/materials', 'POST', { content: material }],
          ['/admin/questions', 'POST', { content: question }],
          ['/admin/questions/import', 'POST', { questions: [question] }],
          ['/admin/materials/from-ai', 'POST', { material: { ...material, quiz: [question] } }],
          ['/admin/content/status', 'POST', { items: [], status: 'published' }],
          [
            '/admin/questions/00000000-0000-4000-8000-000000000001',
            'PUT',
            { content: question, revision: 1 },
          ],
          [
            '/admin/content/00000000-0000-4000-8000-000000000001/status',
            'PATCH',
            { status: 'published', revision: 1 },
          ],
        ]) {
          assert.equal((await request(path, null, body, method)).status, 401);
          assert.equal((await request(path, student, body, method)).status, 403);
        }
        await assert.rejects(setAdminAccess(db, 'missing@admin.test'), /belum terdaftar/);
        await setAdminAccess(db, 'editor@admin.test');
        assert.equal((await request('/state', admin)).data.user.role, 'admin');
      },
    );
    await t.test(
      'new drafts are private even to signed-in admins outside the admin endpoint',
      async () => {
        let r = await request('/admin/materials', admin, { content: material });
        assert.equal(r.status, 201);
        lesson = r.data;
        r = await request('/admin/questions', admin, { content: question });
        assert.equal(r.status, 201);
        item = r.data;
        assert.equal((await request('/admin/content', admin)).data.entries.length, 2);
        for (const cookie of [null, student, admin]) {
          const state = (await request('/state', cookie)).data;
          assert.ok(!state.materials.some((m) => m.id === lesson.id));
          assert.ok(!state.questions.some((q) => q.id === item.id));
        }
        assert.equal(
          (
            await request('/admin/questions', admin, {
              content: { ...question, options: ['A', 'B', 'C', 'D'], answer: 4 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request('/admin/materials', admin, {
              content: { ...material, videoUrl: 'javascript:alert(1)' },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      'published lessons/questions reach guests and students without question keys',
      async () => {
        lesson = (
          await request(
            `/admin/content/${lesson.id}/status`,
            admin,
            { status: 'published', revision: lesson.revision },
            'PATCH',
          )
        ).data;
        item = (
          await request(
            `/admin/content/${item.id}/status`,
            admin,
            { status: 'published', revision: item.revision },
            'PATCH',
          )
        ).data;
        for (const cookie of [null, student]) {
          const state = (await request('/state', cookie)).data;
          assert.equal(state.materials.find((m) => m.id === lesson.id).origin, 'academy');
          const q = state.questions.find((q) => q.id === item.id);
          assert.ok(q);
          assert.equal(q.answer, undefined);
          assert.equal(q.explanation, undefined);
        }
        const r = await request('/practice', student, {
          subject: question.subject,
          curriculum: question.curriculum,
          topic: question.topic,
          mode: 'practice',
          count: 1,
        });
        assert.equal(r.status, 201);
        attempt = r.data;
        assert.equal(attempt.questions[0].id, item.id);
        assert.equal(attempt.questions[0].answer, undefined);
      },
    );
    await t.test(
      'edits use revisions and old attempts keep their original answer key',
      async () => {
        const r = await request(
          `/admin/questions/${item.id}`,
          admin,
          { content: { ...question, answer: 2 }, status: 'published', revision: item.revision },
          'PUT',
        );
        assert.equal(r.status, 200);
        assert.equal(
          (
            await request(
              `/admin/questions/${item.id}`,
              admin,
              { content: question, revision: item.revision },
              'PUT',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/admin/content/${item.id}/status`,
              admin,
              { status: 'draft', revision: item.revision },
              'PATCH',
            )
          ).status,
          409,
        );
        item = r.data;
        assert.equal(
          (
            await request(
              `/attempts/${attempt.id}/answers`,
              student,
              { index: 0, answer: 1 },
              'PATCH',
            )
          ).status,
          200,
        );
        const result = await request(`/attempts/${attempt.id}/submit`, student, {});
        assert.equal(result.data.score, 100);
        assert.equal(result.data.review[0].answer, 1);
        const updatedLesson = await request(
          `/admin/materials/${lesson.id}`,
          admin,
          {
            content: { ...material, title: 'Materi yang diperbarui' },
            status: 'published',
            revision: lesson.revision,
          },
          'PUT',
        );
        assert.equal(updatedLesson.status, 200);
        lesson = updatedLesson.data;
        assert.equal(
          (await request('/state')).data.materials.find((m) => m.id === lesson.id).title,
          'Materi yang diperbarui',
        );
      },
    );
    await t.test(
      'unpublish/archive/restore removes public access and retains history',
      async () => {
        item = (
          await request(
            `/admin/content/${item.id}/status`,
            admin,
            { status: 'draft', revision: item.revision },
            'PATCH',
          )
        ).data;
        lesson = (
          await request(
            `/admin/content/${lesson.id}/status`,
            admin,
            { status: 'archived', revision: lesson.revision },
            'PATCH',
          )
        ).data;
        const state = (await request('/state', student)).data;
        assert.ok(!state.questions.some((q) => q.id === item.id));
        assert.ok(!state.materials.some((m) => m.id === lesson.id));
        assert.equal((await request(`/attempts/${attempt.id}`, student)).data.result.score, 100);
        assert.equal(
          (
            await request(
              `/admin/materials/${lesson.id}`,
              admin,
              { content: material, revision: lesson.revision },
              'PUT',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/admin/content/${lesson.id}/status`,
              admin,
              { status: 'draft', revision: lesson.revision },
              'PATCH',
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      'batch import is atomic, deduplicated and saves drafts without publishing',
      async () => {
        let r = await request('/admin/questions/import', admin, {
          questions: [question, question, { ...question, question: 'Pertanyaan impor tambahan?' }],
        });
        assert.equal(r.status, 201);
        assert.deepEqual(r.data, { count: 1, skipped: 2 });
        assert.equal((await request('/admin/content', admin)).data.entries.length, 3);
        r = await request('/admin/questions/import', admin, {
          questions: [question, { ...question, answer: 8 }],
        });
        assert.equal(r.status, 400);
        assert.equal((await request('/admin/content', admin)).data.entries.length, 3);
        assert.ok(
          !(await request('/state', student)).data.questions.some(
            (q) => q.topic === question.topic,
          ),
        );
      },
    );
    await t.test(
      'personal imports stay private and revocation applies to an existing session',
      async () => {
        await request('/questions/import', admin, {
          questions: [{ ...question, question: 'Soal pribadi admin saja?' }],
          source: 'personal.json',
        });
        assert.ok(
          (await request('/state', admin)).data.questions.some(
            (q) => q.question === 'Soal pribadi admin saja?',
          ),
        );
        assert.ok(
          !(await request('/state', student)).data.questions.some(
            (q) => q.question === 'Soal pribadi admin saja?',
          ),
        );
        const generated = await request('/admin/materials/from-ai', admin, {
          material: {
            ...material,
            title: 'Draf hasil AI',
            quiz: [question, { ...question, question: 'Soal kedua dari draf AI?' }],
          },
        });
        assert.equal(generated.status, 201);
        assert.equal(generated.data.questions, 2);
        let entries = (await request('/admin/content', admin)).data.entries;
        assert.equal(entries.length, 6);
        const selected = entries
          .filter((e) => e.status === 'draft')
          .map((e) => ({ id: e.id, revision: e.revision }));
        // One stale revision cancels the entire batch, even after an earlier row changed.
        const stale = selected.map((e, i) => ({
          ...e,
          revision: i === selected.length - 1 ? e.revision + 99 : e.revision,
        }));
        assert.equal(
          (await request('/admin/content/status', admin, { items: stale, status: 'published' }))
            .status,
          409,
        );
        entries = (await request('/admin/content', admin)).data.entries;
        assert.ok(entries.every((e) => e.status === 'draft'));
        assert.equal(
          (await request('/admin/content/status', admin, { items: selected, status: 'published' }))
            .status,
          200,
        );
        assert.equal(
          (await request('/state', student)).data.materials.find((m) => m.id === generated.data.id)
            .title,
          'Draf hasil AI',
        );
        assert.equal(
          (
            await request('/admin/content/status', admin, {
              items: [selected[0], selected[0]],
              status: 'draft',
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request('/admin/materials/from-ai', admin, {
              material: { ...material, quiz: [question, { ...question, answer: 9 }] },
            })
          ).status,
          400,
        );
        assert.equal((await request('/admin/content', admin)).data.entries.length, 6);
        await setAdminAccess(db, 'editor@admin.test', 'student');
        assert.equal((await request('/admin/content', admin)).status, 403);
        assert.equal((await request('/state', admin)).data.user.role, 'student');
      },
    );
  } finally {
    await new Promise((r) => server.close(r));
    await db.close();
  }
});

test('incremental admin migration preserves existing accounts and personal data', async () => {
  const db = await createTestDatabase();
  try {
    // Recreate the exact v1 state, then apply the incremental migration.
    await db.query('DROP SCHEMA pahamin CASCADE');
    await db.query(await fs.readFile(migrationFile, 'utf8'));
    await db.run(
      "INSERT INTO pahamin.users(id,email,name,password) VALUES ('00000000-0000-4000-8000-000000000001','legacy@admin.test','Legacy','untouched')",
    );
    await db.run(
      "INSERT INTO pahamin.materials VALUES ('private','00000000-0000-4000-8000-000000000001','{}')",
    );
    assert.equal((await applyMigrations(db)).applied, true);
    assert.equal(
      (await db.get("SELECT role FROM pahamin.users WHERE email='legacy@admin.test'")).role,
      'student',
    );
    assert.equal((await db.get('SELECT count(*)::int AS n FROM pahamin.materials')).n, 1);
    await setAdminAccess(db, 'legacy@admin.test');
    assert.equal((await applyMigrations(db)).applied, false);
    assert.equal(
      (await db.get("SELECT role,password FROM pahamin.users WHERE email='legacy@admin.test'"))
        .role,
      'admin',
    );
  } finally {
    await db.close();
  }
});
