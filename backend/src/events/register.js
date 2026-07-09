import { bus } from './index.js';
import { auditHandler } from './handlers/audit.handler.js';
import { webhookHandler } from './handlers/webhook.handler.js';

export function registerEventHandlers() {
  const events = [
    'order.created', 'order.status_changed',
    'product.created', 'product.updated', 'product.deleted',
    'user.login', 'user.logout',
  ];

  for (const event of events) {
    bus.on(event, auditHandler);
    bus.on(event, webhookHandler);
  }
}