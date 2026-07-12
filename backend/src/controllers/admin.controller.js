import { replayEvent } from '../events/replay.js';
import { success } from '../utils/response.js';
import db from '../config/database.js';
import { generateLanding } from '../landing/generator.js';
import { BlueprintGenerator } from '../brain/sales-engine/blueprint-generator.js';
import { publishLanding as publishLandingService } from '../landing/publisher.js';
import { WhatsAppClient } from '../integrations/whatsapp/client.js';
import { getConversionScore, formatScoreReport } from '../brain/conversion-optimizer/index.js';
import { TelemetryAggregator } from '../learning/telemetry-aggregator.js';
import { LIAMRecommendationEngine } from '../learning/recommendation-engine.js';

const blueprintGen = new BlueprintGenerator();

export class AdminController {
  async replayEvent(req, res, next) {
    try {
      const event = await replayEvent(parseInt(req.params.id, 10));
      return success(res, { event_log_id: event?.id || event });
    } catch (err) {
      next(err);
    }
  }

  async retryJob(req, res, next) {
    try {
      const { retryFailedJob } = await import('../jobs/dead-letter.js');
      const job = await retryFailedJob(parseInt(req.params.id, 10));
      return success(res, { job_id: job.id });
    } catch (err) {
      next(err);
    }
  }

  async generateBlueprint(req, res, next) {
    try {
      const product = await db('products').where('id', parseInt(req.params.id, 10)).first();
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });

      const settings = await db('settings')
        .where('store_id', product.store_id || 1)
        .select('key', 'value');
      const storeSettings = {};
      for (const s of settings) {
        try { storeSettings[s.key] = s.value ? JSON.parse(s.value) : null; }
        catch { storeSettings[s.key] = s.value; }
      }

      const { blueprint } = blueprintGen.generate(product);
      const landing = await generateLanding({ ...product, launch_blueprint: blueprint }, storeSettings);

      await db('products').where('id', product.id).update({
        launch_blueprint: db.raw('?::jsonb', JSON.stringify(blueprint)),
        updated_at: db.fn.now(),
      });

      const score = getConversionScore(product, blueprint, {
        stock: product.stock,
        html: landing.html,
        paymentMethods: 1,
        hasSchema: true,
        hasOgTags: true,
      });

      return success(res, { blueprint, meta: landing.meta, conversion_score: score });
    } catch (err) {
      next(err);
    }
  }

  async previewLanding(req, res, next) {
    try {
      const product = await db('products').where('id', parseInt(req.params.id, 10)).first();
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });

      if (!product.launch_blueprint) {
        return res.status(400).json({ success: false, error: { code: 'NO_BLUEPRINT', message: 'Este producto no tiene un blueprint generado. Primero genera el blueprint.' } });
      }

      const settings = await db('settings')
        .where('store_id', product.store_id || 1)
        .select('key', 'value');
      const storeSettings = {};
      for (const s of settings) {
        try { storeSettings[s.key] = s.value ? JSON.parse(s.value) : null; }
        catch { storeSettings[s.key] = s.value; }
      }

      const landing = await generateLanding(product, storeSettings);
      return res.type('html').send(landing.html);
    } catch (err) {
      next(err);
    }
  }

  async publishLanding(req, res, next) {
    try {
      const product = await db('products').where('id', parseInt(req.params.id, 10)).first();
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });

      if (!product.launch_blueprint) {
        return res.status(400).json({ success: false, error: { code: 'NO_BLUEPRINT', message: 'Primero genera el blueprint antes de publicar.' } });
      }

      const result = await publishLandingService(product.id);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async metrics(req, res, next) {
    try {
      const [activeJobs] = await db('jobs').where('status', 'processing').count('*');
      const [failed24h] = await db('failed_jobs')
        .where('failed_at', '>=', new Date(Date.now() - 86400000))
        .count('*');
      const [eventCount] = await db('event_logs').count('*');

      return success(res, {
        uptime: process.uptime(),
        active_jobs: parseInt(activeJobs.count, 10),
        failed_jobs_24h: parseInt(failed24h.count, 10),
        events_total: parseInt(eventCount.count, 10),
      });
    } catch (err) {
      next(err);
    }
  }

  async testWhatsApp(req, res, next) {
    try {
      const { phone, message } = req.body;
      const wa = new WhatsAppClient();
      const result = await wa.sendMessage(phone, message || '🧪 Mensaje de prueba desde MIleGo');
      return success(res, { sent: true, result });
    } catch (err) {
      next(err);
    }
  }

  async conversionScore(req, res, next) {
    try {
      const product = await db('products').where('id', parseInt(req.params.id, 10)).first();
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });

      const bp = product.launch_blueprint || {};
      const html = bp.landing_html || '';
      const extra = { stock: product.stock, html, paymentMethods: 1, hasSchema: html.includes('schema.org'), hasOgTags: html.includes('og:') };
      const score = getConversionScore(product, bp, extra);
      return success(res, { conversion_score: score, report: formatScoreReport(score) });
    } catch (err) {
      next(err);
    }
  }

  async dashboard(req, res, next) {
    try {
      const storeId = req.user?.store_id || 1;
      const todayStart = new Date(new Date().setHours(0,0,0,0));
      const yesterdayStart = new Date(todayStart.getTime() - 86400000);

      const [productCount] = await db('products').where('store_id', storeId).count('*');
      const [analyzedCount] = await db('products').where('store_id', storeId).whereNotNull('launch_blueprint').count('*');

      const [ordersToday] = await db('orders')
        .where('store_id', storeId)
        .where('created_at', '>=', todayStart)
        .count('*');
      const [{ todayRevenue }] = await db('orders')
        .where('store_id', storeId)
        .where('created_at', '>=', todayStart)
        .sum('total as todayRevenue');

      const [ordersYesterday] = await db('orders')
        .where('store_id', storeId)
        .where('created_at', '>=', yesterdayStart)
        .where('created_at', '<', todayStart)
        .count('*');
      const [{ yesterdayRevenue }] = await db('orders')
        .where('store_id', storeId)
        .where('created_at', '>=', yesterdayStart)
        .where('created_at', '<', todayStart)
        .sum('total as yesterdayRevenue');

      const [salesTotal] = await db('orders').where('store_id', storeId).sum('total as total');
      const [ordersTotal] = await db('orders').where('store_id', storeId).count('*');

      const ordersByStatus = await db('orders').where('store_id', storeId)
        .select('status').count('* as count').groupBy('status');
      const pendingOrders = ordersByStatus.find(r => r.status === 'pending');
      const shippedOrders = ordersByStatus.find(r => r.status === 'shipped');
      const deliveredOrders = ordersByStatus.find(r => r.status === 'delivered');

      const [readyToLaunch] = await db('products')
        .where({ store_id: storeId, status: 'active' })
        .whereNotNull('launch_blueprint')
        .count('*');

      const topProducts = await db('products').where('store_id', storeId)
        .whereNotNull('launch_blueprint')
        .where('status', 'active')
        .orderByRaw("(launch_blueprint->'offer'->>'price_unit')::numeric DESC NULLS LAST")
        .limit(5)
        .select('id', 'name', 'price', 'cost_price', 'stock', 'launch_blueprint', 'slug');

      const topPrice = await db('products').where('store_id', storeId)
        .where('status', 'active')
        .whereNull('launch_blueprint')
        .orderBy('price', 'desc')
        .limit(3)
        .select('id', 'name', 'price', 'stock');

      const recentOrders = await db('orders').where('orders.store_id', storeId)
        .leftJoin('customers', 'orders.customer_id', 'customers.id')
        .orderBy('orders.created_at', 'desc').limit(5)
        .select('orders.id', db.raw("COALESCE(customers.name, 'Cliente') as customer_name"), 'orders.total', 'orders.status', 'orders.created_at');

      const products = await db('products').where('store_id', storeId)
        .whereNotNull('launch_blueprint')
        .select('id', 'name', 'price', 'cost_price', 'launch_blueprint');

      const scoredProducts = products.map(p => {
        const bp = p.launch_blueprint || {};
        const offer = bp.offer || {};
        const priceUnit = parseFloat(offer.price_unit) || parseFloat(p.price) || 0;
        const priceCost = parseFloat(offer.price_cost) || parseFloat(p.cost_price) || 0;
        const margin = priceUnit > 0 ? Math.round(((priceUnit - priceCost) / priceUnit) * 100) : 0;
        return { id: p.id, name: p.name, margin, priceUnit, priceCost };
      });

      const excellentCount = scoredProducts.filter(p => p.margin >= 50).length;
      const topMargin = scoredProducts.sort((a, b) => b.margin - a.margin).slice(0, 3);
      const avgMargin = scoredProducts.length > 0
        ? Math.round(scoredProducts.reduce((s, p) => s + p.margin, 0) / scoredProducts.length)
        : 0;

      const totalRevenue = parseFloat(salesTotal.total || 0);
      const estimatedProfit = totalRevenue * (avgMargin / 100);

      let liamRecommendation = null;
      let productOfDay = null;
      if (topPrice.length > 0) {
        productOfDay = { productName: topPrice[0].name, price: topPrice[0].price, stock: topPrice[0].stock };
        liamRecommendation = {
          productName: topPrice[0].name,
          price: topPrice[0].price,
          stock: topPrice[0].stock,
          reason: 'Producto sin analizar con mayor precio en catálogo',
        };
      } else if (topProducts.length > 0) {
        const bp = topProducts[0].launch_blueprint || {};
        const offer = bp.offer || {};
        const unitPrice = parseFloat(offer.price_unit) || parseFloat(topProducts[0].price) || 0;
        const costPrice = parseFloat(offer.price_cost) || parseFloat(topProducts[0].cost_price) || 0;
        const margin = unitPrice > 0 ? Math.round(((unitPrice - costPrice) / unitPrice) * 100) : 0;
        productOfDay = { productName: topProducts[0].name, price: unitPrice, stock: topProducts[0].stock, margin };
        liamRecommendation = {
          productName: topProducts[0].name,
          price: topProducts[0].price,
          stock: topProducts[0].stock,
          reason: 'Mayor margen estimado en catálogo analizado',
        };
      }

      // Funnel pipeline from analytics
      const stages = ['landing_view', 'scroll_25', 'scroll_50', 'scroll_75', 'cta_click', 'checkout_started', 'purchase'];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      let pipeline = {};
      for (const s of stages) pipeline[s] = 0;
      try {
        const events = await db('analytics_events')
          .where('created_at', '>=', sevenDaysAgo)
          .whereIn('event_name', stages)
          .select('event_name').count('* as count').groupBy('event_name');
        for (const e of events) pipeline[e.event_name] = parseInt(e.count, 10);
      } catch (_) {}

      const visitors = pipeline.landing_view || 0;
      const funnel = visitors > 0 ? {
        visitors,
        ctr: Math.round((pipeline.cta_click / visitors) * 100) + '%',
        atc_count: pipeline.checkout_started || 0,
        purchases: pipeline.purchase || 0,
        conversion: ((pipeline.purchase || 0) / visitors * 100).toFixed(2) + '%',
        revenue_to_date: `$${Math.round(totalRevenue).toLocaleString('es-CO')}`,
      } : null;

      return success(res, {
        commercial: {
          todayOrders: parseInt(ordersToday.count, 10),
          todayRevenue: parseFloat(todayRevenue || 0),
          yesterdayOrders: parseInt(ordersYesterday.count, 10),
          yesterdayRevenue: parseFloat(yesterdayRevenue || 0),
          pendingOrders: parseInt(pendingOrders?.count || 0, 10),
          shippedOrders: parseInt(shippedOrders?.count || 0, 10),
          deliveredOrders: parseInt(deliveredOrders?.count || 0, 10),
          totalOrders: parseInt(ordersTotal.count, 10),
          totalRevenue,
          estimatedProfit,
          readyToLaunch: parseInt(readyToLaunch.count, 10),
          avgMargin,
        },
        products: {
          total: parseInt(productCount.count, 10),
          analyzed: parseInt(analyzedCount.count, 10),
          excellent: excellentCount,
          avgMargin,
        },
        funnel,
        pipeline,
        productOfDay,
        topMargin,
        topProducts,
        recentOrders,
        liamRecommendation,
      });
    } catch (err) {
      next(err);
    }
  }

  async liamObservability(req, res, next) {
    try {
      const storeId = req.user?.store_id || 1;
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const lastHour = new Date(Date.now() - 3600000);
      const last5Min = new Date(Date.now() - 300000);

      // ── Summary ──────────────────────────────────────────────
      const [sessionsToday] = await db('liam_sessions')
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .count('* as total');

      const [uniqueVisitorsToday] = await db('liam_sessions')
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .whereNotNull('anonymous_visitor_id')
        .countDistinct('anonymous_visitor_id as total');

      const [eventsToday] = await db('liam_events')
        .where('created_at', '>=', todayStart)
        .count('* as total');

      const [purchasesToday] = await db('liam_events')
        .where('created_at', '>=', todayStart)
        .where({ event_type: 'purchase' })
        .count('* as total');

      const [refundsToday] = await db('liam_events')
        .where('created_at', '>=', todayStart)
        .where({ event_type: 'refund' })
        .count('* as total');

      const [{ todayRevenue, todayRefundAmount }] = await db('liam_sessions')
        .where('created_at', '>=', todayStart)
        .where({ converted: true })
        .select(
          db.raw('COALESCE(SUM(revenue), 0) as "todayRevenue"'),
          db.raw('0 as "todayRefundAmount"')
        );

      const activeSessions = await db('liam_sessions')
        .where('last_event_at', '>=', lastHour)
        .count('* as total');

      // ── Funnel (7 días) ──────────────────────────────────────
      const stages = ['page_view', 'cta_click', 'checkout_start', 'purchase'];
      const funnelData = {};
      for (const s of stages) {
        const [{ count }] = await db('liam_events')
          .where('created_at', '>=', sevenDaysAgo)
          .where({ event_type: s })
          .count('* as count');
        funnelData[s] = parseInt(count, 10);
      }

      const funnelSteps = stages.map((s, i) => {
        const count = funnelData[s];
        const prev = i > 0 ? funnelData[stages[i - 1]] : count;
        return {
          event: s,
          count,
          dropoff: i > 0 ? (prev > 0 ? Math.round((1 - count / prev) * 100) : 100) : 0,
          conversion: i > 0 ? (prev > 0 ? Math.round((count / prev) * 100) : 0) : 100,
        };
      });

      // ── Performance ─────────────────────────────────────────
      const pageViews = funnelData.page_view || 0;
      const ctaClicks = funnelData.cta_click || 0;
      const purchases = funnelData.purchase || 0;
      const refunds = funnelData.refund || 0;

      const sessions7d = await db('liam_sessions')
        .where('created_at', '>=', sevenDaysAgo)
        .count('* as total')
        .first();

      const [{ totalRevenue7d }] = await db('liam_sessions')
        .where('created_at', '>=', sevenDaysAgo)
        .where({ converted: true })
        .sum('revenue as totalRevenue7d');

      const performance = {
        cr: pageViews > 0 ? (purchases / pageViews * 100).toFixed(2) + '%' : '0%',
        ctr: pageViews > 0 ? (ctaClicks / pageViews * 100).toFixed(2) + '%' : '0%',
        aov: purchases > 0 ? `$${Math.round(parseFloat(totalRevenue7d || 0) / purchases).toLocaleString('es-CO')}` : '$0',
        refundRate: purchases > 0 ? (refunds / purchases * 100).toFixed(2) + '%' : '0%',
        sessions7d: parseInt(sessions7d?.total || 0, 10),
        uniqueVisitors7d: await (async () => {
          const [{ count }] = await db('liam_sessions')
            .where('created_at', '>=', sevenDaysAgo)
            .whereNotNull('anonymous_visitor_id')
            .countDistinct('anonymous_visitor_id as count');
          return parseInt(count, 10);
        })(),
      };

      // ── Winners (estadísticos) ──────────────────────────────
      let bestTheme = null, bestCta = null, bestBundle = null;
      try {
        const winnerData = await db('liam_daily_metrics')
          .where('date', '>=', sevenDaysAgo.toISOString().slice(0, 10))
          .groupBy('theme_key', 'cta_key', 'bundle_key')
          .select(
            'theme_key', 'cta_key', 'bundle_key',
            db.raw('SUM(page_views) as total_views'),
            db.raw('SUM(purchases) as total_purchases')
          )
          .having(db.raw('SUM(page_views)'), '>', 0);

        const byTheme = {}, byCta = {}, byBundle = {};
        for (const r of winnerData) {
          const v = parseInt(r.total_views, 10);
          const c = parseInt(r.total_purchases, 10);
          if (r.theme_key) { if (!byTheme[r.theme_key]) byTheme[r.theme_key] = { key: r.theme_key, views: 0, conversions: 0 }; byTheme[r.theme_key].views += v; byTheme[r.theme_key].conversions += c; }
          if (r.cta_key) { if (!byCta[r.cta_key]) byCta[r.cta_key] = { key: r.cta_key, views: 0, conversions: 0 }; byCta[r.cta_key].views += v; byCta[r.cta_key].conversions += c; }
          if (r.bundle_key) { if (!byBundle[r.bundle_key]) byBundle[r.bundle_key] = { key: r.bundle_key, views: 0, conversions: 0 }; byBundle[r.bundle_key].views += v; byBundle[r.bundle_key].conversions += c; }
        }

        const { evaluateDimension } = await import('../learning/statistics.js');
        const themeEval = evaluateDimension(Object.values(byTheme), { minViews: 100, minConversions: 5, minLift: 3 });
        const ctaEval = evaluateDimension(Object.values(byCta), { minViews: 100, minConversions: 5, minLift: 3 });
        const bundleEval = evaluateDimension(Object.values(byBundle), { minViews: 100, minConversions: 5, minLift: 3 });

        if (themeEval.winner) bestTheme = { key: themeEval.winner.key, cr: (themeEval.winner.conversionRate * 100).toFixed(1) + '%', lift: themeEval.winner.lift + '%', confidence: Math.round((1 - themeEval.winner.pValue) * 100) + '%', sample: themeEval.winner.views, purchases: themeEval.winner.conversions };
        if (ctaEval.winner) bestCta = { key: ctaEval.winner.key, cr: (ctaEval.winner.conversionRate * 100).toFixed(1) + '%', lift: ctaEval.winner.lift + '%', confidence: Math.round((1 - ctaEval.winner.pValue) * 100) + '%', sample: ctaEval.winner.views, purchases: ctaEval.winner.conversions };
        if (bundleEval.winner) bestBundle = { key: bundleEval.winner.key, cr: (bundleEval.winner.conversionRate * 100).toFixed(1) + '%', lift: bundleEval.winner.lift + '%', confidence: Math.round((1 - bundleEval.winner.pValue) * 100) + '%', sample: bundleEval.winner.views, purchases: bundleEval.winner.conversions };
      } catch (_) {}

      // ── Timeline (últimas 48h por hora) ─────────────────────
      const twoDaysAgo = new Date(Date.now() - 48 * 3600000);
      const timelineEvents = await db('liam_events')
        .where('created_at', '>=', twoDaysAgo)
        .select(
          db.raw("date_trunc('hour', created_at) as hour"),
          db.raw("COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views"),
          db.raw("COUNT(*) FILTER (WHERE event_type = 'cta_click') as cta_clicks"),
          db.raw("COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases")
        )
        .groupByRaw("date_trunc('hour', created_at)")
        .orderBy('hour', 'asc');

      // ── Health ──────────────────────────────────────────────
      const [eventsLast5Min] = await db('liam_events')
        .where('created_at', '>=', last5Min)
        .count('* as total');

      const eventsPerMin = Math.round(parseInt(eventsLast5Min?.total || 0, 10) / 5);

      const trackingErrors = [];
      try {
        const failedEvents = await db('event_logs')
          .where('status', 'failed')
          .where('created_at', '>=', lastHour)
          .orderBy('created_at', 'desc')
          .limit(5)
          .select('id', 'event_name', 'error_message', 'created_at');
        for (const e of failedEvents) {
          trackingErrors.push({ event: e.event_name, error: e.error_message?.slice(0, 100), time: e.created_at });
        }
      } catch (_) {}

      return success(res, {
        summary: {
          sessionsToday: parseInt(sessionsToday?.total || 0, 10),
          uniqueVisitorsToday: parseInt(uniqueVisitorsToday?.total || 0, 10),
          eventsToday: parseInt(eventsToday?.total || 0, 10),
          purchasesToday: parseInt(purchasesToday?.total || 0, 10),
          refundsToday: parseInt(refundsToday?.total || 0, 10),
          revenueToday: parseFloat(todayRevenue || 0),
          activeSessions: parseInt(activeSessions?.total || 0, 10),
        },
        funnel: funnelSteps,
        performance,
        winners: { theme: bestTheme, cta: bestCta, bundle: bestBundle },
        timeline: timelineEvents.map(r => ({
          hour: r.hour,
          pageViews: parseInt(r.page_views, 10),
          ctaClicks: parseInt(r.cta_clicks, 10),
          purchases: parseInt(r.purchases, 10),
        })),
        health: {
          eventsPerMin,
          activeSessions: parseInt(activeSessions?.total || 0, 10),
          trackingErrors,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async liamRecommendations(req, res, next) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const config = {
        minViews: parseInt(req.query.minViews, 10) || 300,
        minConversions: parseInt(req.query.minConversions, 10) || 15,
        alpha: parseFloat(req.query.alpha) || 0.05,
        minLift: parseFloat(req.query.minLift) || 5,
        daysBack: parseInt(req.query.days, 10) || 90,
      };

      const result = await LIAMRecommendationEngine.getRecommendations(productId, config);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
