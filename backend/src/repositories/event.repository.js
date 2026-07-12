import db from '../config/database.js';

export class EventRepository {
  async create(data) {
    const [event] = await db('liam_events').insert({
      session_id: data.session_id,
      product_id: data.product_id,
      event_type: data.event_type,
      payload: data.payload || {},
      client_ts: data.client_ts || null,
    }).returning('*');
    return event;
  }

  async findBySession(sessionId) {
    return db('liam_events').where({ session_id: sessionId }).orderBy('created_at', 'asc');
  }

  async findByProduct(productId, eventType = null, from = null, to = null) {
    let query = db('liam_events').where({ product_id: productId });
    if (eventType) query = query.where({ event_type: eventType });
    if (from) query = query.where('created_at', '>=', from);
    if (to) query = query.where('created_at', '<=', to);
    return query.orderBy('created_at', 'desc');
  }

  async countByProductAndType(productId, eventType, from = null, to = null) {
    let query = db('liam_events').where({ product_id: productId, event_type: eventType });
    if (from) query = query.where('created_at', '>=', from);
    if (to) query = query.where('created_at', '<=', to);
    const [{ count }] = await query.count({ count: 'id' });
    return parseInt(count, 10);
  }

  async funnel(productId, from = null, to = null) {
    const events = ['page_view', 'cta_click', 'checkout_start', 'purchase'];
    const results = {};
    for (const eventType of events) {
      results[eventType] = await this.countByProductAndType(productId, eventType, from, to);
    }
    return results;
  }

  async conversionsByField(productId, field, from = null, to = null) {
    const subQuery = db('liam_events')
      .select(db.raw('s.?? as dimension', [field]))
      .count('* as total')
      .join('liam_sessions as s', 'liam_events.session_id', 's.session_id')
      .where('liam_events.product_id', productId)
      .whereIn('liam_events.event_type', ['page_view', 'purchase'])
      .groupBy(`s.${field}`);

    if (from) subQuery.where('liam_events.created_at', '>=', from);
    if (to) subQuery.where('liam_events.created_at', '<=', to);

    return subQuery;
  }
}
