import { Router } from 'express';
import { FulfillmentController } from '../controllers/fulfillment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new FulfillmentController();

router.post('/orders/:id/fulfillment/send', authenticate, tenantContext, requirePermission('orders.update'), controller.send.bind(controller));
router.post('/orders/:id/fulfillment/sync', authenticate, tenantContext, requirePermission('orders.update'), controller.syncStatus.bind(controller));
router.get('/orders/:id/fulfillment/log', authenticate, tenantContext, requirePermission('orders.read'), controller.getLog.bind(controller));

export default router;
