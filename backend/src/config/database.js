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

export default db;
