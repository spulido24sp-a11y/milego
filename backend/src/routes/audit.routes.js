import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new AuditController();

router.get('/audit', authenticate, tenantContext, controller.list.bind(controller));

export default router;
