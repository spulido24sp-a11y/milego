import { Router } from 'express';
import { config } from '../config/index.js';
import { success } from '../utils/response.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  success(res, { status: 'ok', uptime: process.uptime(), version: config.version });
});

router.use('/', authRoutes);

export { router as routes };
