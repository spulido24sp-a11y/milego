import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new OrderController();

router.get('/orders', authenticate, tenantContext, requirePermission('orders.read'), controller.list.bind(controller));
router.get('/orders/by-number/:orderNumber', controller.getByOrderNumber.bind(controller));
router.get('/orders/:id', authenticate, tenantContext, requirePermission('orders.read'), controller.getById.bind(controller));
router.put('/orders/:id/status', authenticate, tenantContext, requirePermission('orders.update'), controller.updateStatus.bind(controller));

export default router;
