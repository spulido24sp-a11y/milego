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
    const [log] = await db('event_logs').insert({
      event_name: event,
      payload: JSON.stringify({ data, meta }),
      version: meta.version || 1,
      producer: meta.producer || 'core',
      correlation_id: meta.correlationId || null,
      status: 'pending',
    }).returning('*');

    const handlers = this.handlers[event] || [];
    for (const handler of handlers) {
      try {
        await handler(data, meta);
      } catch (err) {
        console.error(`[EventBus] Handler failed for ${event}:`, err.message);
        await db('event_logs').where({ id: log.id }).update({
          status: 'failed',
          error_message: err.message,
          processed_at: db.fn.now(),
        });
        return;
      }
    }

    await db('event_logs').where({ id: log.id }).update({
      status: 'completed',
      processed_at: db.fn.now(),
    });
  }
}

export const bus = new EventBus();