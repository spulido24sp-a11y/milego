import { bus } from './index.js';
import { auditHandler } from './handlers/audit.handler.js';
import { webhookHandler } from './handlers/webhook.handler.js';
import { handleOrderConfirmed } from './handlers/fulfillment.handler.js';
import { registerNotificationHandlers } from '../integrations/whatsapp/notifications.js';
import { MetaEventsService } from '../integrations/meta/events.service.js';
import { enqueue } from '../jobs/queue.js';

export function registerEventHandlers() {
  const events = [
    'order.created', 'order.status_changed',
    'product.created', 'product.updated', 'product.deleted',
    'user.login', 'user.logout',
    'customer.created', 'customer.updated', 'payment.completed', 'inventory.updated'
  ];

  for (const event of events) {
    bus.on(event, auditHandler);
    bus.on(event, webhookHandler);
  }

  bus.on('order.confirmed', handleOrderConfirmed);
  registerNotificationHandlers();

  bus.on('order.created', async (data) => {
    try {
      const meta = new MetaEventsService();
      await meta.initialize(data.order?.store_id || data.meta?.storeId || 1);
      await meta.trackPurchase(data.order, data.customer);
    } catch (err) {
      console.warn('[MetaEvents] Failed to track purchase:', err.message);
    }
  });

  // Asynchronous event handler subscription
  bus.on('product.created', async (data) => {
    if (data.productId) {
      await enqueue('process_launch_blueprint', { productId: data.productId });
    }
  });
}