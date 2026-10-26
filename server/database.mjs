import fs from 'node:fs';
import { Pool, types } from 'pg';

export const SCHEMA_VERSION = '202610260002_admin';

// One small async SQL interface for the production pool and PostgreSQL test engine.
// SQL uses native $1 parameters; no query rewriting or credentials in the browser.
export function sqlDatabase(executor, { transaction, close = async () => {} } = {}) {
  return {
    query: (sql, values = []) => executor.query(sql, values),
    async get(sql, ...values) {
      return (await executor.query(sql, values)).rows[0];
    },
    async all(sql, ...values) {
      return (await executor.query(sql, values)).rows;
    },
    async run(sql, ...values) {
      return executor.query(sql, values);
    },
    transaction,
    close,
  };
}

export function connectionOptions(env = process.env) {
  if (!env.SUPABASE_DB_URL?.trim())
    throw new Error(
      'SUPABASE_DB_URL belum diisi. Salin koneksi database dari Supabase → Connect → Session pooler ke .env.',
    );
  let url;
  try {
    url = new URL(env.SUPABASE_DB_URL.trim());
  } catch {
    throw new Error('Format SUPABASE_DB_URL belum valid. Gunakan URI postgresql:// dari Supabase.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.pathname.slice(1)
  )
    throw new Error('SUPABASE_DB_URL harus berupa URI PostgreSQL lengkap.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (env.SUPABASE_DB_SSL === 'false' && !local)
    throw new Error('SSL hanya boleh dimatikan untuk PostgreSQL loopback lokal.');
  // Avoid URI sslmode silently overriding certificate verification in pg.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl', 'uselibpqcompat'])
    url.searchParams.delete(key);
  const ca = env.SUPABASE_DB_CA_FILE ? fs.readFileSync(env.SUPABASE_DB_CA_FILE, 'utf8') : undefined;
  return {
    connectionString: url.toString(),
    ssl:
      env.SUPABASE_DB_SSL === 'false' && local
        ? false
        : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
    application_name: 'pahamin-academy',
    // Millisecond timestamps are bigint in PostgreSQL and safe JS integers.
    types: {
      getTypeParser: (oid, format) =>
        oid === 20 && format !== 'binary'
          ? (value) => {
              const n = Number(value);
              if (!Number.isSafeInteger(n))
                throw new Error('Nilai database di luar batas angka aman.');
              return n;
            }
          : types.getTypeParser(oid, format),
    },
  };
}

export async function connectDatabase(env = process.env) {
  const pool = new Pool(connectionOptions(env));
  // Do not log errors containing connection URLs, parameters or user data.
  pool.on('error', () =>
    console.error('Koneksi database terputus; pool akan membuka koneksi baru.'),
  );
  const db = pooledDatabase(pool);
  try {
    await db.get('SELECT 1 AS connected');
    return db;
  } catch {
    await db.close();
    throw new Error(
      'Koneksi Supabase gagal. Periksa SUPABASE_DB_URL, password, jaringan, dan sertifikat SSL.',
    );
  }
}

export function pooledDatabase(pool) {
  return sqlDatabase(pool, {
    close: () => pool.end(),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(sqlDatabase(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* Original error is more useful. */
        }
        throw error;
      } finally {
        client.release();
      }
    },
  });
}

export async function assertSchema(db) {
  try {
    const version = await db.get(
      'SELECT version FROM pahamin.schema_migrations WHERE version=$1',
      SCHEMA_VERSION,
    );
    if (!version) throw new Error('Missing version');
  } catch {
    throw new Error('Skema Pahamin belum siap. Jalankan npm run db:migrate terlebih dahulu.');
  }
}
