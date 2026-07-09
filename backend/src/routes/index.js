import { Router } from 'express';
import { config } from '../config/index.js';
import { success } from '../utils/response.js';

const router = Router();

router.get('/health', (_req, res) => {
  success(res, { status: 'ok', uptime: process.uptime(), version: config.version });
});

export { router as routes };
