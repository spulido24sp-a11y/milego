import db from '../../config/database.js';
import { bus } from '../../events/index.js';
import { WhatsAppClient } from './client.js';
import { OrderConfirmationService } from '../../services/order-confirmation.service.js';

const wa = new WhatsAppClient();
const confirmationService = new OrderConfirmationService();

export function registerNotificationHandlers() {
  bus.on('order.created', async (data) => {
    try {
      const { order, customer, items, shipping_address } = data;
      if (!customer?.phone) return;

      const storeId = order.store_id || 1;
      const settings = await db('settings').where({ store_id: storeId }).select('key', 'value');
      const settingMap = {};
      settings.forEach(s => { settingMap[s.key] = s.value; });

      const storeName = settingMap['store.name'] || 'MIleGo';
      const whatsappNumber = settingMap['store.whatsapp'] || '573209898615';

      const itemsStr = items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
      const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(order.total);

      if (order.payment_method === 'cash_on_delivery') {
        // Contraentrega: no basta con avisar, hay que EXIGIR confirmación
        // explícita antes de despachar (reduce pedidos falsos/devoluciones).
        const summary = `📦 *Pedido:* #${order.order_number}\n🛍️ *Producto:* ${itemsStr}\n💰 *Total:* ${total}\n📍 *Envío:* ${shipping_address?.city || ''}, ${shipping_address?.state || ''}\n\n`;
        await wa.sendMessage(customer.phone, `🛒 *¡Recibimos tu pedido en ${storeName}!* 🎉\n\n${summary}`);
        await confirmationService.requestConfirmation(order, customer);
      } else {
        const message = `🛒 *¡Pedido Confirmado!* 🎉\n\nHola ${customer.name},\n\nHemos recibido tu pedido en ${storeName}.\n\n📦 *Pedido:* #${order.order_number}\n🛍️ *Producto:* ${itemsStr}\n💰 *Total:* ${total}\n📍 *Envío:* ${shipping_address?.city || ''}, ${shipping_address?.state || ''}\n\nTe contactaremos cuando esté en camino. Si tienes dudas, responde este mensaje.\n\n¡Gracias por tu compra! 🚀`;
        await wa.sendMessage(customer.phone, message);
      }
      await logNotification(order.id, 'whatsapp', `Confirmación enviada a ${customer.phone}`);

      const teamPhone = settingMap['store.whatsapp_notify'] || '573209898615';
      const teamMessage = `📦 *NUEVO PEDIDO* 🚀\n\n👤 *Cliente:* ${customer.name}\n📞 *Teléfono:* ${customer.phone}\n📦 *Pedido:* #${order.order_number}\n🛍️ *Producto:* ${itemsStr}\n💰 *Total:* ${total}\n📍 *Dirección:* ${shipping_address?.street || ''}, ${shipping_address?.city || ''}, ${shipping_address?.state || ''}\n💵 *Pago:* ${order.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'Tarjeta'}\n\n${order.whatsapp_opt_in ? '✅ Cliente autorizó WhatsApp' : '❌ Cliente NO autorizó WhatsApp'}`;

      await wa.sendMessage(teamPhone, teamMessage);
      await logNotification(order.id, 'whatsapp', `Notificación de equipo enviada a ${teamPhone}`);
    } catch (err) {
      console.warn('[Notifications] order.created handler error:', err.message);
    }
  });

  bus.on('fulfillment.sent', async (data) => {
    try {
      const { order, dropi_order_id, tracking_number, carrier } = data;
      const orderData = await db('orders').where({ id: order.id }).first();
      if (!orderData?.customer_id) return;

      const customer = await db('customers').where({ id: orderData.customer_id }).first();
      if (!customer?.phone) return;

      const message = `📦 *Tu pedido #${order.order_number} ya está en camino!*\n\nHola ${customer.name},\n\nTu pedido ha sido despachado.\n\n🔢 *Guía:* ${tracking_number || 'Pendiente'}\n🚚 *Transportadora:* ${carrier || 'Por definir'}\n\nRecibirás actualizaciones aquí. ¡Gracias por confiar en nosotros! 🚀`;

      await wa.sendMessage(customer.phone, message);
      await logNotification(order.id, 'whatsapp', `Despacho notificado a ${customer.phone}`);
    } catch (err) {
      console.warn('[Notifications] fulfillment.sent handler error:', err.message);
    }
  });
}

async function logNotification(orderId, channel, message) {
  try {
    await db('fulfillment_log').insert({
      order_id: orderId,
      event: `notification_${channel}`,
      metadata: JSON.stringify({ channel, message }),
    });
  } catch {
    // non-critical
  }
}
