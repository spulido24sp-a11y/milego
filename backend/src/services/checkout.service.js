import db from '../config/database.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { InventoryService } from './inventory.service.js';
import { bus } from '../events/index.js';
import { enqueue } from '../jobs/queue.js';

const orderRepo = new OrderRepository();
const customerRepo = new CustomerRepository();
const inventoryService = new InventoryService();

export class CheckoutService {
  async process(tenantId, checkoutData) {
    return db.transaction(async (trx) => {
      // 1. Validate items and calculate prices
      let subtotal = 0;
      const itemsData = [];

      for (const item of checkoutData.items) {
        let price = 0;
        let name = '';
        let sku = '';

        if (item.variant_id) {
          const variant = await trx('product_variants')
            .where({ id: item.variant_id, is_active: true })
            .forUpdate()
            .first();
          if (!variant) throw new Error('Variante de producto no encontrada o inactiva');
          if (variant.stock < item.quantity) {
            throw new Error(`Stock insuficiente para la variante. Disponible: ${variant.stock}`);
          }
          price = parseFloat(variant.price);
          sku = variant.sku;

          // Fetch product name
          const prod = await trx('products').where({ id: item.product_id }).first();
          if (!prod) throw new Error('Producto no encontrado');
          name = `${prod.name} (${variant.name})`;
        } else {
          const product = await trx('products')
            .where({ id: item.product_id, store_id: tenantId, deleted_at: null })
            .forUpdate()
            .first();
          if (!product) throw new Error('Producto no encontrado');
          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para el producto. Disponible: ${product.stock}`);
          }
          price = parseFloat(product.price);
          sku = product.sku;
          name = product.name;
        }

        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        itemsData.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          product_name: name,
          product_sku: sku,
          quantity: item.quantity,
          unit_price: price,
          total_price: itemTotal,
        });
      }

      const total = subtotal; // No shipping cost / discount rules for now

      // 2. Customer Management (find or create)
      let customer = null;
      if (checkoutData.customer.email) {
        customer = await customerRepo.findByEmail(checkoutData.customer.email, tenantId);
      }
      if (!customer && checkoutData.customer.phone) {
        customer = await customerRepo.findByPhone(checkoutData.customer.phone, tenantId);
      }

      if (!customer) {
        customer = await customerRepo.create({
          store_id: tenantId,
          name: checkoutData.customer.name,
          email: checkoutData.customer.email || null,
          phone: checkoutData.customer.phone,
          document_type: checkoutData.customer.document_type || null,
          document_number: checkoutData.customer.document_number || null,
        }, trx);
      } else {
        // Update document if provided
        const updateData = {};
        if (checkoutData.customer.document_type) updateData.document_type = checkoutData.customer.document_type;
        if (checkoutData.customer.document_number) updateData.document_number = checkoutData.customer.document_number;
        if (Object.keys(updateData).length > 0) {
          customer = await customerRepo.update(customer.id, updateData, trx);
        }
      }

      // 3. Shipping Address
      const address = await customerRepo.addAddress({
        customer_id: customer.id,
        label: 'Envío',
        street: checkoutData.shipping_address.street,
        city: checkoutData.shipping_address.city,
        state: checkoutData.shipping_address.state,
        zip_code: checkoutData.shipping_address.zip_code || null,
        country: checkoutData.shipping_address.country || 'Colombia',
        is_default: true,
      }, trx);

      await customerRepo.setDefaultAddress(customer.id, address.id, trx);

      // 4. Generate Order Number
      const [{ count }] = await trx('orders').where({ store_id: tenantId }).count({ count: 'id' });
      const orderNumber = `ORD-${Date.now()}-${parseInt(count, 10) + 1}`;

      // 5. Create Order
      const createdOrder = await orderRepo.create({
        store_id: tenantId,
        order_number: orderNumber,
        customer_id: customer.id,
        status: 'pending',
        subtotal,
        shipping_cost: 0,
        discount: 0,
        total,
        payment_method: checkoutData.payment_method || 'cash_on_delivery',
        payment_status: 'pending',
        notes: checkoutData.notes || null,
        shipping_address_id: address.id,
        whatsapp_opt_in: checkoutData.whatsapp_opt_in || false,
      }, itemsData, trx);

      // 6. Adjust Stock via Inventory Service
      for (const item of itemsData) {
        await inventoryService.adjustStock(
          item.product_id,
          item.variant_id,
          'sale',
          item.quantity,
          `Venta en Pedido #${orderNumber}`,
          null,
          trx
        );
      }

      // 7. Create Payment Log
      const payment = await orderRepo.createPayment({
        order_id: createdOrder.id,
        store_id: tenantId,
        provider: 'none',
        method: checkoutData.payment_method || 'cash_on_delivery',
        amount: total,
        currency: 'COP',
        status: 'pending',
      }, trx);

      // 8. Emit Order Created Event (asynchronous triggers for notifications/integrations)
      await bus.emit('order.created', {
        order: {
          id: createdOrder.id,
          order_number: orderNumber,
          total,
          payment_method: checkoutData.payment_method,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
        items: itemsData,
        shipping_address: checkoutData.shipping_address,
      });

      // 9. Programar recordatorio de confirmación por WhatsApp (contraentrega).
      // El primer recordatorio se envía a las 3h si el cliente no ha respondido;
      // el segundo (y la escalación al equipo) lo dispara el mismo handler
      // reprogramándose a sí mismo. Ver order-confirmation.service.js.
      if ((checkoutData.payment_method || 'cash_on_delivery') === 'cash_on_delivery') {
        const reminderAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
        await enqueue('whatsapp_confirmation_reminder', { orderId: createdOrder.id }, reminderAt);
      }

      return {
        order: createdOrder,
        customer,
        payment,
      };
    });
  }
}
