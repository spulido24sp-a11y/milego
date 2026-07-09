import knex from 'knex';
import { config } from './index.js';

const db = knex({
  client: 'pg',
  connection: config.database.url,
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
