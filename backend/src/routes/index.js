import { Router } from 'express';
import { config } from '../config/index.js';
import { success } from '../utils/response.js';
import authRoutes from './auth.routes.js';
import configRoutes from './config.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  success(res, { status: 'ok', uptime: process.uptime(), version: config.version });
});

router.use('/', authRoutes);
router.use('/', configRoutes);
router.use('/', productRoutes);
router.use('/', categoryRoutes);
router.use('/', userRoutes);
router.use('/', auditRoutes);

export { router as routes };
