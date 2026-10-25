import { PGlite } from '@electric-sql/pglite';
import { sqlDatabase } from '../../server/database.mjs';
import { applyMigrations } from '../../server/migrations.mjs';

export async function createTestDatabase() {
  const engine = await PGlite.create();
  await engine.exec(
    'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;',
  );
  function adapter(client) {
    return sqlDatabase({
      query: (sql, values = []) =>
        values.length
          ? client.query(sql, values)
          : client.exec(sql).then((results) => results.at(-1) || { rows: [] }),
    });
  }
  const db = {
    ...adapter(engine),
    transaction: (work) => engine.transaction((tx) => work(adapter(tx))),
    close: () => engine.close(),
  };
  await applyMigrations(db);
  return db;
}
