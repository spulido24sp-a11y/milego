import { Router } from 'express';
import { ConfigController } from '../controllers/config.controller.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new ConfigController();

router.get('/config', tenantContext, controller.getPublicConfig.bind(controller));

export default router;
