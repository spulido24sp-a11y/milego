import db from '../config/database.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { EventRepository } from '../repositories/event.repository.js';
import { TelemetryAggregator } from './telemetry-aggregator.js';

const sessionRepo = new SessionRepository();
const eventRepo = new EventRepository();
const aggregator = new TelemetryAggregator();

export class LIAMEventCollector {
  static async createSession(data) {
    const session = await sessionRepo.create({
      session_id: data.sessionId,
      anonymous_visitor_id: data.anonymousVisitorId || null,
      product_id: data.productId,
      landing_id: data.landingId || null,
      landing_version: data.landingVersion || null,
      landing_hash: data.landingHash || null,
      landing_url: data.landingUrl || null,
      referrer: data.referrer || null,
      decision_engine_version: data.decisionEngineVersion || null,
      conversion_compiler_version: data.conversionCompilerVersion || null,
      prompt_version: data.promptVersion || null,
      learning_model_version: data.learningModelVersion || null,
      experiment_id: data.experimentId || null,
      experiment_variant: data.experimentVariant || null,
      theme_key: data.themeKey || null,
      cta_key: data.ctaKey || null,
      bundle_key: data.bundleKey || null,
      traffic_source: data.trafficSource || null,
      campaign: data.campaign || null,
      adset: data.adset || null,
      ad_name: data.adName || null,
      device: data.device || null,
      country: data.country || null,
      language: data.language || null,
      user_agent: data.userAgent || null,
      ip_address: data.ipAddress || null,
      payload: data.payload || {},
    });
    return session;
  }

  static async trackEvent({ sessionId, productId, eventType, payload = {}, clientTs = null, source, ctaText, themeUsed }) {
    // Backward compat: when source is provided (old API), store in liam_telemetry
    if (source !== undefined) {
      await this.initSchema();
      const [evt] = await db('liam_telemetry').insert({
        product_id: parseInt(productId, 10),
        event_type: eventType,
        source: (source || 'facebook').toLowerCase(),
        cta_text: ctaText || '',
        theme_used: themeUsed || '',
      }).returning('*');
      return evt;
    }
    if (!sessionId || !productId || !eventType) {
      throw new Error('sessionId, productId, and eventType are required');
    }
    const event = await eventRepo.create({
      session_id: sessionId,
      product_id: productId,
      event_type: eventType,
      payload,
      client_ts: clientTs,
    });
    await sessionRepo.touchSession(sessionId);
    return event;
  }

  static async trackPurchase({ sessionId, productId, revenue = 0, payload = {} }) {
    await this.trackEvent({
      sessionId,
      productId,
      eventType: 'purchase',
      payload: { ...payload, revenue },
    });
    await sessionRepo.markConverted(sessionId, revenue);
  }

  static async trackRefund({ sessionId, productId, amount = 0, payload = {} }) {
    await this.trackEvent({
      sessionId,
      productId,
      eventType: 'refund',
      payload: { ...payload, amount },
    });
  }

  static async initSchema() {
    const exists = await db.schema.hasTable('liam_telemetry');
    if (!exists) {
      await db.schema.createTable('liam_telemetry', table => {
        table.increments('id').primary();
        table.integer('product_id').notNullable();
        table.string('event_type').notNullable();
        table.string('source').notNullable();
        table.string('cta_text').nullable();
        table.string('theme_used').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }
  }

  static async getTelemetryStats(productId) {
    const events = await db('liam_telemetry')
      .where({ product_id: parseInt(productId, 10) })
      .select('event_type', 'source', 'cta_text', 'theme_used')
      .count('id as count')
      .groupBy('event_type', 'source', 'cta_text', 'theme_used');
    return events.length > 0 ? events : eventRepo.funnel(productId);
  }

  static async triggerAggregation() {
    return aggregator.aggregateRecent();
  }
}
