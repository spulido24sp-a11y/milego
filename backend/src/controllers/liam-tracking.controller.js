import db from '../config/database.js';
import { LIAMEventCollector } from '../learning/event-collector.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { EventRepository } from '../repositories/event.repository.js';
import { success, error, created } from '../utils/response.js';

const sessionRepo = new SessionRepository();
const eventRepo = new EventRepository();

export class LiamTrackingController {
  async createSession(req, res, next) {
    try {
      const data = req.body;
      if (!data.sessionId || !data.productId) {
        return error(res, 'sessionId and productId are required', 400);
      }
      const enriched = {
        ...data,
        ipAddress: data.ipAddress || req.ip,
        userAgent: data.userAgent || req.headers['user-agent'],
      };
      const session = await LIAMEventCollector.createSession(enriched);
      return created(res, { session });
    } catch (err) {
      next(err);
    }
  }

  async trackEvent(req, res, next) {
    try {
      const { sessionId, productId, eventType, payload, clientTs } = req.body;
      if (!sessionId || !productId || !eventType) {
        return error(res, 'sessionId, productId, and eventType are required', 400);
      }
      const event = await LIAMEventCollector.trackEvent({
        sessionId, productId, eventType, payload, clientTs,
      });
      return success(res, { event });
    } catch (err) {
      next(err);
    }
  }

  async trackPurchase(req, res, next) {
    try {
      const { sessionId, productId, revenue, payload } = req.body;
      if (!sessionId || !productId) {
        return error(res, 'sessionId and productId are required', 400);
      }
      await LIAMEventCollector.trackPurchase({ sessionId, productId, revenue, payload });
      return success(res, { message: 'Purchase tracked' });
    } catch (err) {
      next(err);
    }
  }

  async trackRefund(req, res, next) {
    try {
      const { sessionId, productId, amount, payload } = req.body;
      if (!sessionId || !productId) {
        return error(res, 'sessionId and productId are required', 400);
      }
      await LIAMEventCollector.trackRefund({ sessionId, productId, amount, payload });
      return success(res, { message: 'Refund tracked' });
    } catch (err) {
      next(err);
    }
  }

  async getFunnel(req, res, next) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const from = req.query.from || null;
      const to = req.query.to || null;
      const funnel = await eventRepo.funnel(productId, from, to);
      return success(res, funnel);
    } catch (err) {
      next(err);
    }
  }

  async getAggregated(req, res, next) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const days = parseInt(req.query.days, 10) || 30;
      const from = new Date(Date.now() - days * 86400000).toISOString();

      const metrics = await db('liam_daily_metrics')
        .where({ product_id: productId })
        .where('date', '>=', from.slice(0, 10))
        .orderBy('date', 'asc');

      return success(res, metrics);
    } catch (err) {
      next(err);
    }
  }

  async getWinnerFeedback(req, res, next) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const minSessions = parseInt(req.query.minSessions, 10) || 100;

      const results = await db('liam_daily_metrics')
        .where({ product_id: productId })
        .groupBy('theme_key', 'cta_key', 'bundle_key')
        .select(
          'theme_key', 'cta_key', 'bundle_key',
          db.raw('SUM(page_views) as total_views'),
          db.raw('SUM(purchases) as total_purchases'),
          db.raw('SUM(revenue) as total_revenue'),
          db.raw('SUM(cta_clicks) as total_clicks'),
          db.raw('SUM(sessions) as total_sessions')
        )
        .having('total_sessions', '>=', minSessions);

      const enriched = results.map(r => ({
        theme: r.theme_key,
        cta: r.cta_key,
        bundle: r.bundle_key,
        views: parseInt(r.total_views, 10),
        purchases: parseInt(r.total_purchases, 10),
        sessions: parseInt(r.total_sessions, 10),
        revenue: parseFloat(r.total_revenue),
        conversionRate: r.total_views > 0 ? (parseInt(r.total_purchases, 10) / parseInt(r.total_views, 10)) : 0,
        ctr: r.total_views > 0 ? (parseInt(r.total_clicks, 10) / parseInt(r.total_views, 10)) : 0,
        aov: r.total_purchases > 0 ? (parseFloat(r.total_revenue) / parseInt(r.total_purchases, 10)) : 0,
      }));

      const bestCta = enriched.filter(e => e.cta).sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;
      const bestTheme = enriched.filter(e => e.theme).sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;
      const bestBundle = enriched.filter(e => e.bundle).sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;

      return success(res, {
        winners: { cta: bestCta, theme: bestTheme, bundle: bestBundle },
        combinations: enriched.sort((a, b) => b.conversionRate - a.conversionRate),
      });
    } catch (err) {
      next(err);
    }
  }
}
