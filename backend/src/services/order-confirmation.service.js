import db from '../config/database.js';
import { OrderService } from './order.service.js';
import { InventoryService } from './inventory.service.js';
import { WhatsAppClient } from '../integrations/whatsapp/client.js';

const orderService = new OrderService();
const inventoryService = new InventoryService();
const wa = new WhatsAppClient();

const CONFIRM_WORDS = ['1', 'si', 'sí', 'confirmo', 'confirmar', 'ok', 'dale', 'listo', 'correcto'];
const CANCEL_WORDS = ['2', 'no', 'cancelar', 'cancelo', 'anular', 'anular pedido'];

function normalize(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents
}

function classifyReply(text) {
  const norm = normalize(text);
  if (CONFIRM_WORDS.some((w) => norm === w || norm.startsWith(`${w} `))) return 'confirm';
  if (CANCEL_WORDS.some((w) => norm === w || norm.startsWith(`${w} `))) return 'cancel';
  return 'unrecognized';
}

export class OrderConfirmationService {
  /**
   * Envía el mensaje inicial pidiendo confirmación explícita del pedido
   * contraentrega. Debe llamarse justo después de crear la orden.
   */
  async requestConfirmation(order, customer) {
    if (order.payment_method !== 'cash_on_delivery') return;

    await db('orders').where({ id: order.id }).update({
      whatsapp_confirmation_status: 'awaiting',
      whatsapp_confirmation_requested_at: db.fn.now(),
    });

    const message =
      `Para procesar tu pedido *#${order.order_number}* contraentrega necesitamos que lo confirmes:\n\n` +
      `✅ Responde *1* para CONFIRMAR\n` +
      `❌ Responde *2* para CANCELAR\n\n` +
      `Si no confirmas, tu pedido no se despachará. ¡Gracias!`;

    await wa.sendMessage(customer.phone, message);
  }

  /**
   * Procesa un mensaje entrante de WhatsApp. Busca el pedido contraentrega
   * más reciente en estado 'awaiting' para ese número y actúa según el
   * texto recibido.
   */
  async processInboundMessage({ phone, body, rawPayload }) {
    const cleanPhone = (phone || '').replace(/[^\d+]/g, '');

    const logResult = async (matchedOrderId, resolution) => {
      await db('whatsapp_inbound_messages').insert({
        phone: cleanPhone,
        body: body || null,
        raw_payload: JSON.stringify(rawPayload || {}),
        matched_order_id: matchedOrderId || null,
        resolution,
      });
    };

    if (!cleanPhone) {
      await logResult(null, 'no_pending_order');
      return { resolution: 'no_pending_order' };
    }

    // Un mismo teléfono puede tener varios pedidos; tomamos el más reciente
    // que sigue esperando confirmación.
    const pendingOrder = await db('orders')
      .join('customers', 'orders.customer_id', 'customers.id')
      .where('customers.phone', cleanPhone)
      .where('orders.whatsapp_confirmation_status', 'awaiting')
      .orderBy('orders.created_at', 'desc')
      .select('orders.*')
      .first();

    if (!pendingOrder) {
      await logResult(null, 'no_pending_order');
      return { resolution: 'no_pending_order' };
    }

    const intent = classifyReply(body);

    if (intent === 'confirm') {
      await db('orders').where({ id: pendingOrder.id }).update({
        whatsapp_confirmation_status: 'confirmed',
        whatsapp_confirmation_responded_at: db.fn.now(),
      });
      // Dispara order.confirmed -> auto-despacho a logística (Dropi/fulfillment)
      await orderService.updateStatus(
        pendingOrder.id,
        pendingOrder.store_id,
        'confirmed',
        'Confirmado automáticamente por el cliente vía WhatsApp',
        null
      );
      await wa.sendMessage(cleanPhone, `¡Gracias! Tu pedido *#${pendingOrder.order_number}* fue confirmado y ya lo estamos preparando 🚀`);
      await logResult(pendingOrder.id, 'confirmed');
      return { resolution: 'confirmed', orderId: pendingOrder.id };
    }

    if (intent === 'cancel') {
      await db('orders').where({ id: pendingOrder.id }).update({
        whatsapp_confirmation_status: 'rejected',
        whatsapp_confirmation_responded_at: db.fn.now(),
        status: 'cancelled',
      });

      // Devolver el stock reservado
      const items = await db('order_items').where({ order_id: pendingOrder.id });
      for (const item of items) {
        try {
          await inventoryService.adjustStock(
            item.product_id,
            item.variant_id,
            'restock',
            item.quantity,
            `Cancelación por WhatsApp del pedido #${pendingOrder.order_number}`,
            null
          );
        } catch (err) {
          console.warn('[OrderConfirmation] restock failed:', err.message);
        }
      }

      await wa.sendMessage(cleanPhone, `Entendido, cancelamos tu pedido *#${pendingOrder.order_number}*. Si fue un error, escríbenos y con gusto lo reactivamos.`);
      await logResult(pendingOrder.id, 'rejected');
      return { resolution: 'rejected', orderId: pendingOrder.id };
    }

    // No entendimos la respuesta: reforzamos las opciones
    await wa.sendMessage(
      cleanPhone,
      `No entendí tu respuesta 🤔 Para tu pedido *#${pendingOrder.order_number}*, responde *1* para confirmar o *2* para cancelar.`
    );
    await logResult(pendingOrder.id, 'unrecognized');
    return { resolution: 'unrecognized', orderId: pendingOrder.id };
  }

  /**
   * Llamado por el job en background. Si el pedido sigue 'awaiting':
   *  - intento 1 (reminders_sent === 0): envía un recordatorio y reprograma.
   *  - intento 2 (reminders_sent === 1): marca 'no_response' y avisa al equipo
   *    para que llame manualmente al cliente (evita perder la venta del todo).
   */
  async sendReminderOrEscalate(orderId) {
    const order = await db('orders').where({ id: orderId }).first();
    if (!order || order.whatsapp_confirmation_status !== 'awaiting') return;

    const customer = await db('customers').where({ id: order.customer_id }).first();
    if (!customer?.phone) return;

    if (order.whatsapp_confirmation_reminders_sent === 0) {
      await wa.sendMessage(
        customer.phone,
        `Hola ${customer.name}, seguimos esperando tu confirmación para el pedido *#${order.order_number}* 📦\n\nResponde *1* para confirmar o *2* para cancelar.`
      );
      await db('orders').where({ id: order.id }).update({ whatsapp_confirmation_reminders_sent: 1 });
      return { escalated: false };
    }

    // Segundo intento sin respuesta: dejamos de automatizar y avisamos al equipo
    await db('orders').where({ id: order.id }).update({
      whatsapp_confirmation_status: 'no_response',
      whatsapp_confirmation_reminders_sent: order.whatsapp_confirmation_reminders_sent + 1,
    });

    const settings = await db('settings').where({ store_id: order.store_id, key: 'store.whatsapp_notify' }).first();
    const teamPhone = settings?.value || '573209898615';
    await wa.sendMessage(
      teamPhone,
      `⚠️ *Sin respuesta* — El pedido *#${order.order_number}* (${customer.name}, ${customer.phone}) no confirmó por WhatsApp tras 2 intentos. Llamar manualmente antes de despachar.`
    );
    return { escalated: true };
  }
}
