import db from '../config/database.js';

export class SessionRepository {
  async create(data) {
    const [session] = await db('liam_sessions').insert({
      session_id: data.session_id,
      anonymous_visitor_id: data.anonymous_visitor_id || null,
      product_id: data.product_id,
      landing_id: data.landing_id || null,
      landing_version: data.landing_version || null,
      landing_hash: data.landing_hash || null,
      landing_url: data.landing_url || null,
      referrer: data.referrer || null,
      decision_engine_version: data.decision_engine_version || null,
      conversion_compiler_version: data.conversion_compiler_version || null,
      prompt_version: data.prompt_version || null,
      learning_model_version: data.learning_model_version || null,
      experiment_id: data.experiment_id || null,
      experiment_variant: data.experiment_variant || null,
      theme_key: data.theme_key || null,
      cta_key: data.cta_key || null,
      bundle_key: data.bundle_key || null,
      traffic_source: data.traffic_source || null,
      campaign: data.campaign || null,
      adset: data.adset || null,
      ad_name: data.ad_name || null,
      device: data.device || null,
      country: data.country || null,
      language: data.language || null,
      user_agent: data.user_agent || null,
      ip_address: data.ip_address || null,
      first_event_at: new Date(),
      last_event_at: new Date(),
      payload: data.payload || {},
    }).returning('*');
    return session;
  }

  async findBySessionId(sessionId) {
    return db('liam_sessions').where({ session_id: sessionId }).first();
  }

  async markConverted(sessionId, revenue) {
    await db('liam_sessions').where({ session_id: sessionId }).update({
      converted: true,
      revenue: revenue || 0,
    });
  }

  async touchSession(sessionId) {
    await db('liam_sessions').where({ session_id: sessionId }).increment('event_count', 1).update({
      last_event_at: new Date(),
    });
  }

  async query(filters = {}) {
    let query = db('liam_sessions');
    if (filters.product_id) query = query.where({ product_id: filters.product_id });
    if (filters.traffic_source) query = query.where({ traffic_source: filters.traffic_source });
    if (filters.experiment_id) query = query.where({ experiment_id: filters.experiment_id });
    if (filters.converted !== undefined) query = query.where({ converted: filters.converted });
    if (filters.from) query = query.where('created_at', '>=', filters.from);
    if (filters.to) query = query.where('created_at', '<=', filters.to);
    return query.orderBy('created_at', 'desc');
  }
}
