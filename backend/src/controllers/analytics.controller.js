import db from '../config/database.js';
import { success } from '../utils/response.js';

export class AnalyticsController {
  async track(req, res, next) {
    try {
      const { event_type, event_name, payload, source } = req.body;
      if (!event_name) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'event_name es requerido' } });

      const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || `anon_${Date.now()}`;
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

      // Sanitize IP for PostgreSQL INET type
      const sanitizedIp = ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1' ? '127.0.0.1' : ipAddress.replace(/^::ffff:/, '');

      await db('analytics_events').insert({
        event_type: event_type || 'landing',
        event_name,
        payload: db.raw('?::jsonb', JSON.stringify(payload || {})),
        source: source || 'web',
        session_id: sessionId,
        ip_address: sanitizedIp,
        created_at: db.fn.now(),
      });

      return success(res, { tracked: true });
    } catch (err) {
      next(err);
    }
  }

  async funnel(req, res, next) {
    try {
      const storeId = req.user?.store_id || 1;
      const { product_id, period } = req.query;
      const days = parseInt(period, 10) || 7;

      const since = new Date(Date.now() - days * 86400000);

      const stages = ['landing_view', 'scroll_25', 'scroll_50', 'scroll_75', 'cta_click', 'checkout_started', 'purchase'];

      const events = await db('analytics_events')
        .where('created_at', '>=', since)
        .whereIn('event_name', stages)
        .select('event_name')
        .count('* as count')
        .groupBy('event_name')
        .orderByRaw("array_position(array[" + stages.map(s => `'${s}'`).join(',') + "], event_name)");

      const pipeline = {};
      for (const s of stages) pipeline[s] = 0;
      for (const e of events) pipeline[e.event_name] = parseInt(e.count, 10);

      // Product-specific orders for purchase count
      let purchaseCount = pipeline.purchase;
      let totalRevenue = 0;
      let totalCost = 0;
      if (product_id) {
        const orders = await db('orders')
          .where('product_id', product_id)
          .where('created_at', '>=', since);
        purchaseCount = orders.length;
        totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
        totalCost = orders.reduce((s, o) => s + parseFloat(o.cost_price || 0), 0);
      } else {
        const orders = await db('orders')
          .where('store_id', storeId)
          .where('created_at', '>=', since);
        purchaseCount = orders.length;
        totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
        totalCost = orders.reduce((s, o) => s + parseFloat(o.cost_price || 0), 0);
      }

      const visitors = pipeline.landing_view || 1;
      const ctr = visitors > 0 ? Math.round((pipeline.cta_click / visitors) * 100) : 0;
      const atc = pipeline.checkout_started || 0;
      const conversionRate = visitors > 0 ? ((purchaseCount / visitors) * 100).toFixed(2) : '0.00';
      const cpa = purchaseCount > 0 ? Math.round(totalRevenue / purchaseCount) : 0;
      const profit = totalRevenue - totalCost;
      const roas = totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : '0.00';

      return success(res, {
        pipeline,
        funnel: {
          visitors,
          ctr: `${ctr}%`,
          atc_count: atc,
          purchases: purchaseCount,
          conversion: `${conversionRate}%`,
          cpa: `$${cpa.toLocaleString('es-CO')}`,
          revenue: `$${Math.round(totalRevenue).toLocaleString('es-CO')}`,
          cost: `$${Math.round(totalCost).toLocaleString('es-CO')}`,
          profit: `$${Math.round(profit).toLocaleString('es-CO')}`,
          roas: `${roas}x`,
        },
        period: `${days}d`,
        stages,
      });
    } catch (err) {
      next(err);
    }
  }
}
