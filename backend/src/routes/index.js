import { Router } from 'express';
import { config } from '../config/index.js';
import { success } from '../utils/response.js';
import authRoutes from './auth.routes.js';
import configRoutes from './config.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';
import adminRoutes from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import orderRoutes from './order.routes.js';
import checkoutRoutes from './checkout.routes.js';
import integrationRoutes from './integration.routes.js';
import launchRoutes from './launch.routes.js';
import fulfillmentRoutes from './fulfillment.routes.js';
import wompiRoutes from './wompi.routes.js';
import analyticsRoutes from './analytics.routes.js';
import adsRoutes from './ads.routes.js';
import dropiIntelRoutes from './dropi-intelligence.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import liamTrackingRoutes from './liam-tracking.routes.js';

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
router.use('/', adminRoutes);
router.use('/', customerRoutes);
router.use('/', orderRoutes);
router.use('/', checkoutRoutes);
router.use('/', integrationRoutes);
router.use('/', launchRoutes);
router.use('/', fulfillmentRoutes);
router.use('/', wompiRoutes);
router.use('/', analyticsRoutes);
router.use('/', adsRoutes);
router.use('/', dropiIntelRoutes);
router.use('/', whatsappRoutes);
router.use('/', liamTrackingRoutes);

export { router as routes };
