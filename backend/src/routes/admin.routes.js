import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new AdminController();

router.post('/admin/events/:id/replay', authenticate, requirePermission('events.replay'), controller.replayEvent.bind(controller));
router.post('/admin/jobs/:id/retry', authenticate, requirePermission('admin.jobs.retry'), controller.retryJob.bind(controller));
router.get('/admin/metrics', authenticate, controller.metrics.bind(controller));

export default router;
