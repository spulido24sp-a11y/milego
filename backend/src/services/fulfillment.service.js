import db from '../config/database.js';
import { DropiClient } from '../integrations/dropi/client.js';
import { bus } from '../events/index.js';

const dropi = new DropiClient();

export class FulfillmentService {
  /**
   * Send a confirmed order to Dropi for fulfillment.
   * Returns the updated order with fulfillment fields.
   */
  async sendToFulfillment(orderId, tenantId) {
    return db.transaction(async (trx) => {
      const order = await trx('orders')
        .where({ id: orderId, store_id: tenantId, deleted_at: null })
        .first();

      if (!order) throw new Error('Pedido no encontrado');
      if (order.dropi_order_id) throw new Error('El pedido ya fue enviado a Dropi');

      const items = await trx('order_items').where({ order_id: orderId });
      const customer = await trx('customers').where({ id: order.customer_id }).first();
      const address = await trx('addresses').where({ id: order.shipping_address_id }).first();

      const payload = {
        products: items.map(item => ({
          id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.unit_price),
        })),
        customer: {
          name: customer?.name || 'Cliente',
          phone: customer?.phone || '',
          document: customer?.document_number || '',
          email: customer?.email || '',
        },
        shipping: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          country: address?.country || 'Colombia',
        },
        order_number: order.order_number,
        payment_method: order.payment_method || 'cash_on_delivery',
        notes: order.notes || '',
      };

      let dropiResponse;
      try {
        dropiResponse = await dropi.createOrder(payload, `order-${orderId}`);
      } catch (err) {
        await trx('fulfillment_log').insert({
          order_id: orderId,
          event: 'send_failed',
          metadata: JSON.stringify({ error: err.message, payload }),
        });
        throw new Error(`Error al enviar a Dropi: ${err.message}`);
      }

      const dropiOrderId = dropiResponse?.id || dropiResponse?.order_id || null;
      const trackingNumber = dropiResponse?.tracking_number || dropiResponse?.guia || null;
      const carrier = dropiResponse?.carrier || dropiResponse?.transportadora || null;

      const [updated] = await trx('orders')
        .where({ id: orderId })
        .update({
          dropi_order_id: dropiOrderId ? String(dropiOrderId) : null,
          tracking_number: trackingNumber,
          carrier,
          fulfillment_status: dropiOrderId ? 'sent' : 'failed',
          fulfilled_at: dropiOrderId ? trx.fn.now() : null,
          tracking_updated_at: trackingNumber ? trx.fn.now() : null,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      await trx('fulfillment_log').insert({
        order_id: orderId,
        event: dropiOrderId ? 'sent_to_dropi' : 'send_failed',
        metadata: JSON.stringify({ dropi_response: dropiResponse, dropi_order_id: dropiOrderId }),
      });

      if (dropiOrderId) {
        await bus.emit('fulfillment.sent', {
          order: { id: orderId, order_number: order.order_number },
          dropi_order_id: dropiOrderId,
          tracking_number: trackingNumber,
          carrier,
        });
      }

      return updated;
    });
  }

  /**
   * Sync fulfillment status from Dropi for a single order.
   */
  async syncStatus(orderId, tenantId) {
    const order = await db('orders')
      .where({ id: orderId, store_id: tenantId })
      .first();

    if (!order?.dropi_order_id) {
      throw new Error('El pedido no tiene orden Dropi asociada');
    }

    let dropiOrder;
    try {
      dropiOrder = await dropi.getOrder(order.dropi_order_id);
    } catch (err) {
      throw new Error(`Error al consultar Dropi: ${err.message}`);
    }

    const dropiStatus = dropiOrder?.estado || dropiOrder?.status || '';
    const trackingNumber = dropiOrder?.tracking_number || dropiOrder?.guia || order.tracking_number;
    const carrier = dropiOrder?.carrier || dropiOrder?.transportadora || order.carrier;

    const fulfillmentStatusMap = {
      pendiente: 'pending',
      confirmado: 'confirmed',
      en_proceso: 'processing',
      enviado: 'shipped',
      en_transito: 'in_transit',
      entregado: 'delivered',
      cancelado: 'cancelled',
    };

    const fulfillmentStatus = fulfillmentStatusMap[dropiStatus.toLowerCase()] || 'unknown';

    const [updated] = await db('orders')
      .where({ id: orderId })
      .update({
        fulfillment_status: fulfillmentStatus,
        tracking_number: trackingNumber || order.tracking_number,
        carrier: carrier || order.carrier,
        tracking_updated_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    await db('fulfillment_log').insert({
      order_id: orderId,
      event: `status_sync_${fulfillmentStatus}`,
      metadata: JSON.stringify({ dropi_status: dropiStatus, dropi_response: dropiOrder }),
    });

    if (fulfillmentStatus === 'delivered') {
      await db('orders').where({ id: orderId }).update({ status: 'delivered' });
    }

    return updated;
  }

  /**
   * Log a fulfillment event manually.
   */
  async logEvent(orderId, event, metadata = {}) {
    await db('fulfillment_log').insert({
      order_id: orderId,
      event,
      metadata: JSON.stringify(metadata),
    });
  }
}
