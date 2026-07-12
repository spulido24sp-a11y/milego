import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new SettingsController();

router.get('/config', tenantContext, controller.getPublicConfig.bind(controller));

export default router;
