import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';

const router = Router();
const controller = new CategoryController();

router.get('/categories', authenticate, tenantContext, controller.list.bind(controller));
router.get('/categories/:id', authenticate, tenantContext, controller.getById.bind(controller));
router.post('/categories', authenticate, tenantContext, requirePermission('categories.create'), validate(createCategorySchema), controller.create.bind(controller));
router.put('/categories/:id', authenticate, tenantContext, requirePermission('categories.update'), validate(updateCategorySchema), controller.update.bind(controller));
router.delete('/categories/:id', authenticate, tenantContext, requirePermission('categories.delete'), controller.delete.bind(controller));

export default router;
