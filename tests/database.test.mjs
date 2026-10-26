import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, scryptSync } from 'node:crypto';
import { createTestDatabase } from './helpers/database.mjs';
import { connectionOptions, pooledDatabase } from '../server/database.mjs';
import { applyMigrations } from '../server/migrations.mjs';
import { importSqlite } from '../server/import-sqlite.mjs';
import { createApp } from '../server/app.mjs';

test('database config requires an explicit URI and verifies remote TLS', () => {
  assert.throws(() => connectionOptions({}), /SUPABASE_DB_URL belum/);
  assert.throws(() => connectionOptions({ SUPABASE_DB_URL: 'https://example.test' }), /PostgreSQL/);
  const env = {
    SUPABASE_DB_URL: 'postgresql://postgres:fake@db.example.test:5432/postgres?sslmode=disable',
  };
  const config = connectionOptions(env);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(new URL(config.connectionString).searchParams.has('sslmode'), false);
  assert.throws(() => connectionOptions({ ...env, SUPABASE_DB_SSL: 'false' }), /loopback/);
  assert.equal(
    connectionOptions({
      SUPABASE_DB_URL: 'postgresql://test@127.0.0.1/postgres',
      SUPABASE_DB_SSL: 'false',
    }).ssl,
    false,
  );
  assert.equal(config.types.getTypeParser(20)('1793000000000'), 1793000000000);
  assert.throws(() => config.types.getTypeParser(20)('9999999999999999999'), /angka aman/);
});

test('pool transactions retain one client, commit or rollback, and always release', async () => {
  const calls = [];
  const client = {
    query: async (sql, values) => {
      calls.push([sql, values]);
      return { rows: [{ ok: true }] };
    },
    release: () => calls.push(['release']),
  };
  const db = pooledDatabase({
    connect: async () => client,
    query: () => {
      throw new Error('transaction escaped to pool');
    },
    end: async () => {},
  });
  await db.transaction(async (tx) => {
    assert.equal((await tx.get('SELECT $1', 7)).ok, true);
    await tx.run('SELECT $1', 8);
  });
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['BEGIN', 'SELECT $1', 'SELECT $1', 'COMMIT', 'release'],
  );
  calls.length = 0;
  await assert.rejects(
    db.transaction(async () => {
      throw new Error('write failed');
    }),
    /write failed/,
  );
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['BEGIN', 'ROLLBACK', 'release'],
  );
});

test('PostgreSQL schema migration replays safely, rolls back writes and denies Data API roles', async () => {
  const db = await createTestDatabase();
  try {
    assert.equal((await applyMigrations(db)).applied, false);
    const tables = await db.all(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='pahamin'",
    );
    assert.equal(tables.length, 15);
    assert.ok(tables.every((t) => t.rowsecurity));
    for (const role of ['anon', 'authenticated', 'service_role']) {
      assert.equal(
        (await db.get("SELECT has_schema_privilege($1,'pahamin','USAGE') AS allowed", role))
          .allowed,
        false,
      );
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.query(`SET LOCAL ROLE ${role}`);
          await tx.all('SELECT * FROM pahamin.users');
        }),
        (error) => error.code === '42501',
      );
    }
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.run(
          'INSERT INTO pahamin.users(id,email,name,password) VALUES ($1,$2,$3,$4)',
          '00000000-0000-4000-8000-000000000001',
          'rollback@test.dev',
          'Rollback',
          'fixture-hash',
        );
        await tx.run(
          "INSERT INTO pahamin.progress VALUES ('00000000-0000-4000-8000-000000000099','m1',now())",
        );
      }),
      (error) => error.code === '23503',
    );
    assert.equal((await db.get('SELECT count(*)::integer AS count FROM pahamin.users')).count, 0);
  } finally {
    await db.close();
  }
});

function sqliteFixture(directory, { orphan = false } = {}) {
  const file = path.join(directory, 'source.sqlite');
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,name TEXT,password TEXT,goal INTEGER);
    CREATE TABLE questions(id TEXT PRIMARY KEY,user_id TEXT,payload TEXT);
    CREATE TABLE progress(user_id TEXT,material_id TEXT,completed_at TEXT);
    CREATE TABLE study_preferences(user_id TEXT,payload TEXT);
    CREATE TABLE tutor_messages(id TEXT,user_id TEXT,role TEXT,content TEXT,created TEXT);
    CREATE TABLE sessions(token TEXT,user_id TEXT,expires INTEGER);`);
  const id = '00000000-0000-4000-8000-000000000001',
    salt = '0123456789abcdef0123456789abcdef';
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(
    id,
    'legacy@test.dev',
    'Legacy Learner',
    `${salt}:${scryptSync('legacy-password', salt, 64).toString('hex')}`,
    5,
  );
  db.prepare('INSERT INTO questions VALUES (?,?,?)').run(
    'legacy-q1',
    orphan ? '00000000-0000-4000-8000-000000000099' : id,
    JSON.stringify({
      id: 'legacy-q1',
      subject: 'Matematika',
      topic: 'Migrasi',
      curriculum: 'UTBK',
      question: 'Berapa 2 ditambah 2?',
      options: ['3', '4'],
      answer: 1,
      explanation: 'Dua tambah dua sama dengan empat.',
    }),
  );
  db.prepare('INSERT INTO progress VALUES (?,?,?)').run(id, 'm1', '2026-10-26T09:00:00.000Z');
  db.prepare('INSERT INTO study_preferences VALUES (?,?)').run(
    id,
    JSON.stringify({ major: 'Informatika', dailyMinutes: 60 }),
  );
  for (const [messageId, role, content] of [
    ['00000000-0000-4000-8000-000000000002', 'user', 'Apa itu fungsi?'],
    ['00000000-0000-4000-8000-000000000003', 'assistant', 'Fungsi memetakan input ke output.'],
  ])
    db.prepare('INSERT INTO tutor_messages VALUES (?,?,?,?,?)').run(
      messageId,
      id,
      role,
      content,
      '2026-10-26T09:00:00.000Z',
    );
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(
    'old-session-hash',
    id,
    Date.now() + 86400000,
  );
  db.close();
  return file;
}
const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('SQLite import previews, preserves source and password login, orders tutor messages, and is repeat-safe', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pahamin-import-'));
  const source = sqliteFixture(directory),
    before = digest(source);
  const db = await createTestDatabase();
  let server;
  try {
    const preview = await importSqlite(db, source);
    assert.equal(preview.dryRun, true);
    assert.equal(preview.counts.users, 1);
    assert.equal(preview.skippedSessions, 1);
    assert.equal((await db.get('SELECT count(*)::integer AS count FROM pahamin.users')).count, 0);
    assert.equal((await importSqlite(db, source, { apply: true })).applied, true);
    assert.equal((await importSqlite(db, source, { apply: true })).alreadyImported, true);
    assert.equal(digest(source), before);
    assert.equal(
      (await db.get('SELECT count(*)::integer AS count FROM pahamin.sessions')).count,
      0,
    );
    const { app } = await createApp({ database: db });
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const login = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'legacy@test.dev', password: 'legacy-password' }),
    });
    assert.equal(login.status, 200);
    const state = await (
      await fetch(base + '/state', {
        headers: { Cookie: login.headers.get('set-cookie').split(';')[0] },
      })
    ).json();
    assert.equal(state.user.name, 'Legacy Learner');
    assert.equal(state.user.goal, 5);
    assert.equal(state.preferences.major, 'Informatika');
    assert.equal(state.completed[0].id, 'm1');
    assert.deepEqual(
      state.tutorMessages.map((m) => m.role),
      ['user', 'assistant'],
    );
    assert.ok(state.questions.some((q) => q.id === 'legacy-q1'));
    assert.equal(state.questions.find((q) => q.id === 'legacy-q1').answer, undefined);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('SQLite import rejects occupied destinations and orphaned rows without overwriting data', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pahamin-import-reject-'));
  const source = sqliteFixture(directory);
  const db = await createTestDatabase();
  try {
    await db.run(
      'INSERT INTO pahamin.users(id,email,name,password) VALUES ($1,$2,$3,$4)',
      '00000000-0000-4000-8000-000000000099',
      'existing@test.dev',
      'Existing',
      'hash',
    );
    await assert.rejects(importSqlite(db, source, { apply: true }), /Tujuan belum kosong/);
    assert.equal((await db.get('SELECT count(*)::integer AS count FROM pahamin.users')).count, 1);
    await db.run('DELETE FROM pahamin.users');
    await db.run(
      "INSERT INTO pahamin.catalogue(id,kind,payload) VALUES ('00000000-0000-4000-8000-000000000099','material','{}')",
    );
    await assert.rejects(
      importSqlite(db, source, { apply: true }),
      /Tujuan belum kosong \(catalogue\)/,
    );
    await db.run('DELETE FROM pahamin.catalogue');
    fs.rmSync(source);
    sqliteFixture(directory, { orphan: true });
    await assert.rejects(importSqlite(db, source, { apply: true }), /tanpa pemilik/);
    assert.equal((await db.get('SELECT count(*)::integer AS count FROM pahamin.users')).count, 0);
  } finally {
    await db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('SQLite import rolls back every prior row when a later database constraint fails', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pahamin-import-rollback-'));
  const source = sqliteFixture(directory);
  const legacy = new DatabaseSync(source);
  legacy.exec('CREATE TABLE live_sessions(id TEXT,user_id TEXT,payload TEXT)');
  legacy
    .prepare('INSERT INTO live_sessions VALUES (?,?,?)')
    .run('not-a-uuid', '00000000-0000-4000-8000-000000000001', '{}');
  legacy.close();
  const db = await createTestDatabase();
  try {
    await assert.rejects(
      importSqlite(db, source, { apply: true }),
      (error) => error.code === '22P02',
    );
    for (const table of [
      'users',
      'questions',
      'progress',
      'study_preferences',
      'schema_migrations',
    ]) {
      assert.equal(
        (await db.get(`SELECT count(*)::integer AS count FROM pahamin.${table}`)).count,
        table === 'schema_migrations' ? 2 : 0,
      );
    }
  } finally {
    await db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
