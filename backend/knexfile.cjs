require('dotenv').config();

module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './src/database/migrations',
    extension: 'js',
  },
  seeds: {
    directory: './src/database/seeds',
    extension: 'js',
  },
};