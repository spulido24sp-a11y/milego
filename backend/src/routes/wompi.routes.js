import { Router } from 'express';
import { WompiController } from '../controllers/wompi.controller.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new WompiController();

router.post('/wompi/create-checkout', tenantContext, controller.createCheckoutSession.bind(controller));
router.post('/wompi/webhook', controller.handleWebhook.bind(controller));
router.get('/wompi/payment-status/:orderId', tenantContext, controller.getPaymentStatus.bind(controller));

export default router;
