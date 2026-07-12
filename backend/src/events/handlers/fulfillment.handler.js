import { FulfillmentService } from '../../services/fulfillment.service.js';

const fulfillmentService = new FulfillmentService();

export async function handleOrderConfirmed(eventData) {
  const { order } = eventData;
  if (!order?.id) return;

  try {
    await fulfillmentService.sendToFulfillment(order.id, order.store_id || 1);
  } catch (err) {
    console.error(`[Fulfillment] Auto-send failed for order #${order.order_number}: ${err.message}`);
  }
}
