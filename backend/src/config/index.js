import 'dotenv/config';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

export const config = {
  env: process.env.NODE_ENV || 'development',
  version,
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  dropiProviderEnabled: process.env.DROPI_PROVIDER_ENABLED === 'true',
  dropiIntegrationKey: process.env.DROPI_INTEGRATION_KEY || null,
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_stagtest_5e4c1d6d6f7d4c1d6d6f7d4c',
    privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_stagtest_5e4c1d6d6f7d4c1d6d6f7d4c',
    env: process.env.WOMPI_ENV || 'sandbox',
  },
  liam: {
    recommendationMode: process.env.LIAM_RECOMMENDATION_MODE || 'off',
  },
};