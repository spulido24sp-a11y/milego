/**
 * Dropi Intelligence Routes — Supply Chain API
 *
 * GET /api/v1/dropi/viability  — Suppliers viability and logistic scoring
 * GET /api/v1/dropi/combos/:id — Propose highly profitable bundle combo structures
 */
import { Router }             from 'express';
import { authenticate }       from '../middlewares/auth.js';
import { tenantContext }      from '../middlewares/tenant.js';
import { requirePermission }  from '../middlewares/permissions.js';
import { DropiIntelligenceService } from '../brain/dropi-intelligence.service.js';

const router = Router();
const dropiIntel = new DropiIntelligenceService();

/**
 * GET /api/v1/dropi/viability
 * Returns suppliers performance ranking and product logistics scores
 */
router.get('/dropi/viability', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;
    const report  = await dropiIntel.getSupplierViability(storeId);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/dropi/combos/:id
 * Proposes optimal bundle offers (x1, x2, x3) for a given product
 */
router.get('/dropi/combos/:id', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'ID del producto inválido.' } });
    }
    const combos = await dropiIntel.getOptimizedCombos(productId);
    if (!combos) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado.' } });
    }
    res.json({ success: true, data: combos });
  } catch (err) { next(err); }
});

export default router;
