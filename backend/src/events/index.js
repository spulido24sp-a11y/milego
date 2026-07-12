import db from '../config/database.js';

class EventBus {
  constructor() {
    this.handlers = {};
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  async emit(event, data, meta = {}) {
    // Enrich meta object automatically to prevent handler failures
    const parts = event.split('.');
    meta.eventName = event;
    meta.entityType = meta.entityType || parts[0] || 'unknown';
    meta.action = meta.action || parts[1] || 'unknown';
    meta.entityId = meta.entityId || data.productId || data.id || data.orderId || data.order?.id || data.customer?.id || null;
    meta.storeId = meta.storeId || data.store_id || 1;

    const [log] = await db('event_logs').insert({
      event_name: event,
      payload: JSON.stringify({ data, meta }),
      version: meta.version || 1,
      producer: meta.producer || 'core',
      correlation_id: meta.correlationId || null,
      status: 'pending',
    }).returning('*');

    const handlers = this.handlers[event] || [];
    let allSucceeded = true;
    for (const handler of handlers) {
      try {
        await handler(data, meta);
      } catch (err) {
        console.error(`[EventBus] Handler failed for ${event}:`, err.message);
        allSucceeded = false;
      }
    }

    await db('event_logs').where({ id: log.id }).update({
      status: allSucceeded ? 'completed' : 'completed_with_errors',
      error_message: allSucceeded ? null : 'One or more handlers failed',
      processed_at: db.fn.now(),
    });
  }
}

export const bus = new EventBus();