import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { CustomerAuthController } from '../controllers/customer-auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authenticateCustomer } from '../middlewares/customerAuth.js';
import { requirePermission } from '../middlewares/permissions.js';
import { tenantContext } from '../middlewares/tenant.js';

const router = Router();
const controller = new CustomerController();
const authController = new CustomerAuthController();

// Public Customer Auth (Magic Link)
router.post('/auth/magic-link', tenantContext, authController.requestMagicLink.bind(authController));
router.get('/auth/magic-link', authController.verifyMagicLink.bind(authController));

// Public Customer Profile & Addresses (requires Customer JWT)
router.get('/customers/me', authenticateCustomer, controller.profileGet.bind(controller));
router.put('/customers/me', authenticateCustomer, controller.profileUpdate.bind(controller));
router.get('/customers/me/addresses', authenticateCustomer, controller.addressesList.bind(controller));
router.post('/customers/me/addresses', authenticateCustomer, controller.addressesAdd.bind(controller));
router.put('/customers/me/addresses/:addressId/default', authenticateCustomer, controller.addressesSetDefault.bind(controller));

// Administrative Staff Customer Management
router.get('/admin/customers', authenticate, tenantContext, requirePermission('customers.read'), controller.adminList.bind(controller));
router.get('/admin/customers/:id', authenticate, tenantContext, requirePermission('customers.read'), controller.adminGet.bind(controller));
router.post('/admin/customers/:id/notes', authenticate, tenantContext, requirePermission('customers.update'), controller.adminAddNote.bind(controller));
router.get('/admin/customers/:id/notes', authenticate, tenantContext, requirePermission('customers.read'), controller.adminGetNotes.bind(controller));

export default router;
