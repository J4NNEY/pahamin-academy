import { AsyncLocalStorage } from 'node:async_hooks';
import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { Pool } from 'pg';
import { createApp } from '../server/app.mjs';
import { connectionOptions, pooledDatabase, assertSchema } from '../server/database.mjs';

// Never share a database socket or in-flight I/O between Worker requests.
const requestDatabase = new AsyncLocalStorage();
const scopedDatabase = Object.fromEntries(
  ['query', 'get', 'all', 'run', 'transaction'].map((method) => [
    method,
    (...args) => {
      const db = requestDatabase.getStore();
      if (!db) throw new Error('Konteks database permintaan tidak tersedia.');
      return db[method](...args);
    },
  ]),
);
let handlerPromise;
function handler() {
  return (handlerPromise ||= createApp({
    database: scopedDatabase,
    checkSchema: false,
    serveStatic: false,
    trustCloudflare: true,
  }).then(({ app }) => httpServerHandler(createServer(app))));
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.HYPERDRIVE?.connectionString)
      return Response.json(
        {
          error:
            'Database deployment belum dikonfigurasi. Hubungkan binding HYPERDRIVE ke database Supabase pada Cloudflare Worker.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    let db;
    let closing = false;
    try {
      const options = connectionOptions({
        ...env,
        SUPABASE_DB_URL: env.HYPERDRIVE.connectionString,
        SUPABASE_DB_CA_FILE: undefined,
      });
      if (env.HYPERDRIVE) {
        // Hyperdrive manages TLS to the origin; the driver connects to its bound tunnel.
        options.ssl = false;
        delete options.statement_timeout;
      }
      const pool = new Pool(options);
      pool.on('error', () => {
        if (!closing) console.error('Koneksi database Worker terputus.');
      });
      db = pooledDatabase(pool);
      await assertSchema(db);
      const appHandler = await handler();
      return await requestDatabase.run(db, () => appHandler.fetch(request, env, ctx));
    } catch {
      return Response.json(
        {
          error:
            'Backend deployment belum siap. Periksa secret database, koneksi, dan migrasi Supabase di Cloudflare.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    } finally {
      closing = true;
      if (db) ctx.waitUntil(db.close());
    }
  },
};
