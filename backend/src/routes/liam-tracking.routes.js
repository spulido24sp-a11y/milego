import { Router } from 'express';
import { LiamTrackingController } from '../controllers/liam-tracking.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
const controller = new LiamTrackingController();

// Publicos — usados por el SDK desde el frontend
router.post('/liam/session', controller.createSession.bind(controller));
router.post('/liam/event', controller.trackEvent.bind(controller));

// Backend-only — purchase y refund no vienen del frontend
router.post('/liam/purchase', authenticate, controller.trackPurchase.bind(controller));
router.post('/liam/refund', authenticate, controller.trackRefund.bind(controller));

// Consultas
router.get('/liam/products/:productId/funnel', authenticate, controller.getFunnel.bind(controller));
router.get('/liam/products/:productId/metrics', authenticate, controller.getAggregated.bind(controller));
router.get('/liam/products/:productId/winners', authenticate, controller.getWinnerFeedback.bind(controller));

export default router;
