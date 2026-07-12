import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new CheckoutController();

router.post('/checkout', tenantContext, controller.processCheckout.bind(controller));

export default router;
