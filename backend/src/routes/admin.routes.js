import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const adminCtrl = new AdminController();
const settingsCtrl = new SettingsController();

router.post('/admin/events/:id/replay', authenticate, requirePermission('events.replay'), adminCtrl.replayEvent.bind(adminCtrl));
router.post('/admin/jobs/:id/retry', authenticate, requirePermission('admin.jobs.retry'), adminCtrl.retryJob.bind(adminCtrl));
router.post('/admin/products/:id/generate-blueprint', authenticate, requirePermission('products.update'), adminCtrl.generateBlueprint.bind(adminCtrl));
router.get('/admin/products/:id/preview-landing', authenticate, requirePermission('products.read'), adminCtrl.previewLanding.bind(adminCtrl));
router.post('/admin/products/:id/publish-landing', authenticate, requirePermission('products.update'), adminCtrl.publishLanding.bind(adminCtrl));
router.get('/admin/products/:id/conversion-score', authenticate, requirePermission('products.read'), adminCtrl.conversionScore.bind(adminCtrl));

router.post('/admin/whatsapp/test', authenticate, adminCtrl.testWhatsApp.bind(adminCtrl));

router.get('/admin/metrics', authenticate, adminCtrl.metrics.bind(adminCtrl));
router.get('/admin/dashboard', authenticate, adminCtrl.dashboard.bind(adminCtrl));
router.get('/admin/liam-observability', authenticate, adminCtrl.liamObservability.bind(adminCtrl));
router.get('/admin/products/:productId/recommendations', authenticate, adminCtrl.liamRecommendations.bind(adminCtrl));

router.get('/admin/settings', authenticate, tenantContext, settingsCtrl.getAll.bind(settingsCtrl));
router.get('/admin/settings/grouped', authenticate, tenantContext, settingsCtrl.getGrouped.bind(settingsCtrl));
router.put('/admin/settings', authenticate, tenantContext, settingsCtrl.bulkUpsert.bind(settingsCtrl));
router.post('/admin/settings', authenticate, tenantContext, settingsCtrl.upsert.bind(settingsCtrl));
router.delete('/admin/settings/:key', authenticate, tenantContext, settingsCtrl.remove.bind(settingsCtrl));

export default router;
