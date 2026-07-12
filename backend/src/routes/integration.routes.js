import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { tenantContext } from '../middlewares/tenant.js';
import { requirePermission } from '../middlewares/permissions.js';
import { DropiHealthService } from '../integrations/dropi/health.service.js';
import { DropiSyncService } from '../integrations/dropi/sync.service.js';
import db from '../config/database.js';

const router = Router();
const healthService = new DropiHealthService();
const syncService = new DropiSyncService();

/**
 * GET /api/v1/health/providers
 * Returns diagnostic diagnostic report for all active integration channels.
 */
router.get('/health/providers', authenticate, tenantContext, async (req, res, next) => {
  try {
    const dropiReport = await healthService.checkHealth();
    res.json({
      success: true,
      data: {
        dropi: dropiReport
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/health/ai
 * Returns observability metrics for the AI Runtime.
 */
router.get('/health/ai', authenticate, tenantContext, async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;

    // 1. Calculate costs and tokens today
    const [dailyUsage] = await db('ai_usage')
      .where({ store_id: storeId })
      .where('created_at', '>=', db.raw("CURRENT_DATE"))
      .select(
        db.raw('COALESCE(SUM(cost), 0) as cost_today'),
        db.raw('COALESCE(SUM(tokens_in + tokens_out), 0) as tokens_today'),
        db.raw('COUNT(id) as requests_today')
      );

    // 2. Calculate costs and tokens this month
    const [monthlyUsage] = await db('ai_usage')
      .where({ store_id: storeId })
      .where('created_at', '>=', db.raw("DATE_TRUNC('month', CURRENT_DATE)"))
      .select(
        db.raw('COALESCE(SUM(cost), 0) as cost_month'),
        db.raw('COALESCE(SUM(tokens_in + tokens_out), 0) as tokens_month')
      );

    // 3. Cache Hits / Misses
    const [cacheStats] = await db('ai_usage')
      .where({ store_id: storeId })
      .select(
        db.raw('COUNT(CASE WHEN cached THEN 1 END) as cache_hits'),
        db.raw('COUNT(CASE WHEN NOT cached THEN 1 END) as cache_misses'),
        db.raw('COUNT(id) as total_requests')
      );

    const totalRequests = parseInt(cacheStats?.total_requests || '0', 10);
    const cacheHits = parseInt(cacheStats?.cache_hits || '0', 10);
    const cacheHitRatio = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    const cacheMissRatio = totalRequests > 0 ? ((totalRequests - cacheHits) / totalRequests) * 100 : 0;

    // 4. Latency average and P95 from active cache queries
    const [latencyRow] = await db('ai_cache')
      .select(
        db.raw('COALESCE(AVG(latency), 0) as avg_latency'),
        db.raw('COALESCE(percentile_cont(0.95) within group (order by latency), 0) as p95')
      );

    // 5. Query failed requests from logs
    const [failedRow] = await db('integration_requests_log')
      .where('provider', 'like', 'ai-%')
      .where('status', '>=', 400)
      .count('id as failed_count');

    // 6. Active provider details
    const activeProvider = process.env.AI_PROVIDER || 'gemini';
    const activeModel = activeProvider === 'mock' ? 'mock-model-v1' : `${activeProvider}-standard-v2`;

    res.json({
      success: true,
      data: {
        provider: activeProvider,
        model: activeModel,
        latencyAverage: Math.round(parseFloat(latencyRow?.avg_latency || '0')),
        p95: Math.round(parseFloat(latencyRow?.p95 || '0')),
        cacheHitRatio: Math.round(cacheHitRatio),
        cacheMissRatio: Math.round(cacheMissRatio),
        requestsToday: parseInt(dailyUsage?.requests_today || '0', 10),
        requestsFailed: parseInt(failedRow?.failed_count || '0', 10),
        costToday: parseFloat(dailyUsage?.cost_today || '0'),
        costMonth: parseFloat(monthlyUsage?.cost_month || '0'),
        tokensToday: parseInt(dailyUsage?.tokens_today || '0', 10),
        tokensMonth: parseInt(monthlyUsage?.tokens_month || '0', 10)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/products/import
 * Imports a catalog product by external ID from the Dropi provider.
 */
router.post('/products/import', authenticate, tenantContext, requirePermission('products.create'), async (req, res, next) => {
  try {
    const { externalId } = req.body;
    if (!externalId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'externalId es requerido en el cuerpo del payload' }
      });
    }

    const storeId = req.tenant.storeId;
    const product = await syncService.importProduct(externalId, storeId);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/products/:id/sync
 * Performs an incremental resynchronization of variants, stock, cost and images.
 */
router.post('/products/:id/sync', authenticate, tenantContext, requirePermission('products.update'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.tenant.storeId;

    const dbProduct = await db('products').where({ id, store_id: storeId }).first();
    if (!dbProduct) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Producto no encontrado en esta tienda' }
      });
    }

    const product = await syncService.syncProduct(id, dbProduct);

    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
});

export default router;
