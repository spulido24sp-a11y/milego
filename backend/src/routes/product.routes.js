import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js';

const router = Router();
const controller = new ProductController();

router.get('/products/:slug/public', tenantContext, controller.getBySlug.bind(controller));

router.get('/products', authenticate, tenantContext, controller.list.bind(controller));
router.get('/products/:id', authenticate, tenantContext, controller.getById.bind(controller));
router.post('/products', authenticate, tenantContext, requirePermission('products.create'), validate(createProductSchema), controller.create.bind(controller));
router.put('/products/:id', authenticate, tenantContext, requirePermission('products.update'), validate(updateProductSchema), controller.update.bind(controller));
router.delete('/products/:id', authenticate, tenantContext, requirePermission('products.delete'), controller.delete.bind(controller));

export default router;
