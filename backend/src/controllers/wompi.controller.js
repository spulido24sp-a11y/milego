import { WompiClient } from '../integrations/wompi/client.js';
import db from '../config/database.js';
import { bus } from '../events/index.js';
import { success, error } from '../utils/response.js';

const wompi = new WompiClient();

export class WompiController {
  async createCheckoutSession(req, res, next) {
    try {
      const { order_id } = req.body;
      if (!order_id) return error(res, 'order_id es requerido', 400);

      const tenantId = req.tenant.storeId;

      const order = await db('orders')
        .where({ id: order_id, store_id: tenantId })
        .first();

      if (!order) return error(res, 'Orden no encontrada', 404);
      if (order.payment_method !== 'credit_card') {
        return error(res, 'Esta orden no usa pago con tarjeta', 400);
      }
      if (order.wompi_transaction_id) {
        return error(res, 'Ya existe una transacción Wompi para esta orden', 400);
      }

      const customer = await db('customers').where({ id: order.customer_id }).first();
      if (!customer) return error(res, 'Cliente no encontrado', 404);

      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const reference = `ORD-${order.id}-${Date.now()}`;
      const redirectUrl = `${baseUrl}/gracias.html?order=${order.order_number}&payment_method=credit_card`;
      const webhookUrl = `${baseUrl}/api/v1/wompi/webhook`;

      const transaction = await wompi.createTransaction({
        amount: parseFloat(order.total),
        currency: 'COP',
        customerData: {
          email: customer.email || 'cliente@example.com',
          name: customer.name,
          phone: customer.phone,
          document_type: customer.document_type,
          document_number: customer.document_number,
          installments: 1,
        },
        reference,
        redirectUrl,
        webhookUrl,
      });

      await db('orders').where({ id: order.id }).update({
        wompi_transaction_id: transaction.id,
        wompi_status: transaction.status,
      });

      await db('payments').where({ order_id: order.id }).update({
        wompi_transaction_id: transaction.id,
      });

      const redirectUrlCheckout = wompi.isSandbox
        ? `https://sandbox.wompi.co/p/${transaction.id}`
        : `https://checkout.wompi.co/p/${transaction.id}`;

      return success(res, {
        transaction_id: transaction.id,
        redirect_url: redirectUrlCheckout,
        status: transaction.status,
      });
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const event = req.body;

      if (!event || !event.data || !event.data.transaction) {
        return success(res, { received: true });
      }

      const tx = event.data.transaction;
      const transactionId = tx.id;
      const status = tx.status;

      const order = await db('orders').where({ wompi_transaction_id: transactionId }).first();
      if (!order) {
        return success(res, { received: true });
      }

      const payment = await db('payments').where({ order_id: order.id }).first();

      await db('orders').where({ id: order.id }).update({
        wompi_status: status,
        payment_status: status === 'APPROVED' ? 'completed' : 'failed',
        ...(status === 'APPROVED' ? { status: 'confirmed' } : {}),
      });

      await db('payments').where({ order_id: order.id }).update({
        status: status === 'APPROVED' ? 'completed' : 'failed',
        wompi_response: JSON.stringify(tx),
      });

      if (payment) {
        await db('payment_status_history').insert({
          payment_id: payment.id,
          status: status === 'APPROVED' ? 'completed' : 'failed',
          notes: `Webhook Wompi: ${status}`,
        });
      }

      if (status === 'APPROVED') {
        await bus.emit('payment.completed', {
          orderId: order.id,
          order_number: order.order_number,
          transactionId,
          amount: order.total,
        });
      } else {
        await bus.emit('payment.failed', {
          orderId: order.id,
          order_number: order.order_number,
          transactionId,
          status,
        });
      }

      return success(res, { received: true });
    } catch (err) {
      next(err);
    }
  }

  async getPaymentStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { order: orderNumber } = req.query;
      const tenantId = req.tenant.storeId;

      let query = db('orders')
        .select('id', 'order_number', 'payment_method', 'payment_status', 'wompi_transaction_id', 'wompi_status')
        .where({ store_id: tenantId });

      if (orderNumber) {
        query = query.where({ order_number: orderNumber });
      } else if (orderId && orderId !== '0') {
        query = query.where({ id: orderId });
      } else {
        return error(res, 'ID de orden requerido', 400);
      }

      const order = await query.first();
      if (!order) return error(res, 'Orden no encontrada', 404);

      let wompiDetail = null;
      if (order.wompi_transaction_id) {
        try {
          wompiDetail = await wompi.getTransaction(order.wompi_transaction_id);
        } catch {
          wompiDetail = null;
        }
      }

      return success(res, { order, wompi_transaction: wompiDetail });
    } catch (err) {
      next(err);
    }
  }
}
