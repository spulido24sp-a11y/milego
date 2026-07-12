/**
 * Ads Routes — Ad Intelligence API
 *
 * GET  /api/v1/ads/insights      — Daily KPIs by platform
 * GET  /api/v1/ads/top-products  — Top campaigns ranked by ROAS
 * GET  /api/v1/ads/burnt-ads     — Fatigued creatives alert list
 * POST /api/v1/ads/sync          — Manual sync trigger
 */
import { Router }             from 'express';
import { authenticate }       from '../middlewares/auth.js';
import { tenantContext }      from '../middlewares/tenant.js';
import { requirePermission }  from '../middlewares/permissions.js';
import { AdIntelligenceService } from '../brain/ad-intelligence.service.js';
import { MetaAdsService }     from '../integrations/meta/ads.service.js';
import { TikTokAdsService }   from '../integrations/tiktok/ads.service.js';

const router = Router();
const adIntel = new AdIntelligenceService();

router.get('/ads/insights', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;
    const days    = parseInt(req.query.days || 7, 10);
    const kpis    = await adIntel.getDailyKPIs(storeId, days);
    res.json({ success: true, data: kpis });
  } catch (err) { next(err); }
});

router.get('/ads/top-products', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;
    const limit   = parseInt(req.query.limit || 5, 10);
    const top     = await adIntel.getTopProducts(storeId, limit);
    res.json({ success: true, data: top });
  } catch (err) { next(err); }
});

router.get('/ads/burnt-ads', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;
    const burnt   = await adIntel.getBurntAds(storeId);
    res.json({ success: true, data: burnt });
  } catch (err) { next(err); }
});

router.post('/ads/sync', authenticate, tenantContext, requirePermission('products.update'), async (req, res, next) => {
  try {
    const storeId = req.tenant.storeId;
    const results = [];
    const metaSvc = new MetaAdsService();
    results.push(await metaSvc.syncToDb(storeId));
    const ttSvc = new TikTokAdsService();
    results.push(await ttSvc.syncToDb(storeId));
    res.json({ success: true, data: { synced: results } });
  } catch (err) { next(err); }
});

export default router;
