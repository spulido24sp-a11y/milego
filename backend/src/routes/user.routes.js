import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

const router = Router();
const controller = new UserController();

router.get('/users', authenticate, tenantContext, requirePermission('users.read'), controller.list.bind(controller));
router.post('/users', authenticate, tenantContext, requirePermission('users.create'), validate(createUserSchema), controller.create.bind(controller));
router.put('/users/:id', authenticate, tenantContext, requirePermission('users.update'), validate(updateUserSchema), controller.update.bind(controller));
router.delete('/users/:id', authenticate, tenantContext, requirePermission('users.delete'), controller.delete.bind(controller));

export default router;
