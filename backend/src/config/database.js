import knex from 'knex';
import { config } from './index.js';

const dbUrl = config.database.url;
const isProd = config.env === 'production';

const db = knex({
  client: 'pg',
  connection: dbUrl ? {
    connectionString: dbUrl,
    ssl: isProd ? { rejectUnauthorized: false } : false,
  } : undefined,
  migrations: {
    directory: new URL('../database/migrations', import.meta.url).pathname,
    extension: 'js',
  },
  seeds: {
    directory: new URL('../database/seeds', import.meta.url).pathname,
    extension: 'js',
  },
});

// Auto-run migrations on startup (non-blocking, best-effort)
if (dbUrl) {
  db.migrate.latest()
    .then(([batch, log]) => {
      if (log.length) console.log(`[MIGRATIONS] batch ${batch} run: ${log.join(', ')}`);
      else console.log(`[MIGRATIONS] already up to date`);
    })
    .catch((e) => console.error('[MIGRATIONS] failed:', e.message));
}

export default db;
