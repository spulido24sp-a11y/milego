import db from '../config/database.js';

export class OrderRepository {
  baseQuery(tenantId) {
    return db('orders').where({ store_id: tenantId, deleted_at: null });
  }

  async create(orderData, itemsData, trx) {
    const conn = trx || db;
    const [order] = await conn('orders').insert(orderData).returning('*');

    const itemsToInsert = itemsData.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const items = await conn('order_items').insert(itemsToInsert).returning('*');

    // Add initial order status history
    await conn('order_status_history').insert({
      order_id: order.id,
      status: order.status,
      notes: 'Pedido creado exitosamente',
    });

    return { ...order, items };
  }

  async findById(id, tenantId) {
    const order = await db('orders')
      .select(
        'orders.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'customers.email as customer_email',
        'addresses.street as shipping_street',
        'addresses.city as shipping_city',
        'addresses.state as shipping_state',
      )
      .leftJoin('customers', 'orders.customer_id', 'customers.id')
      .leftJoin('addresses', 'orders.shipping_address_id', 'addresses.id')
      .where({ 'orders.id': id, 'orders.store_id': tenantId, 'orders.deleted_at': null })
      .first();
    if (!order) return null;

    const items = await db('order_items').where({ order_id: order.id });
    const history = await db('order_status_history')
      .where({ order_id: order.id })
      .orderBy('created_at', 'asc');

    const payment = await db('payments').where({ order_id: order.id }).first();

    return { ...order, items, history, payment };
  }

  async findByOrderNumber(orderNumber, tenantId) {
    const order = await db('orders')
      .select(
        'orders.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'customers.email as customer_email',
      )
      .leftJoin('customers', 'orders.customer_id', 'customers.id')
      .where({ 'orders.order_number': orderNumber, 'orders.store_id': tenantId, 'orders.deleted_at': null })
      .first();
    if (!order) return null;

    const items = await db('order_items').where({ order_id: order.id });
    return { ...order, items };
  }

  async findAll({ tenantId, status, customerId, page = 1, perPage = 20 }) {
    let query = db('orders')
      .select(
        'orders.*',
        'customers.name as customer_name',
        'customers.phone as customer_phone',
        'customers.email as customer_email',
        'addresses.street as shipping_street',
        'addresses.city as shipping_city',
        'addresses.state as shipping_state',
        'addresses.zip_code as shipping_zip',
      )
      .leftJoin('customers', 'orders.customer_id', 'customers.id')
      .leftJoin('addresses', 'orders.shipping_address_id', 'addresses.id')
      .where({ 'orders.store_id': tenantId, 'orders.deleted_at': null });

    if (status) query = query.where('orders.status', status);
    if (customerId) query = query.where('orders.customer_id', customerId);

    const [{ count }] = await db('orders')
      .where({ store_id: tenantId, deleted_at: null })
      .modify((qb) => {
        if (status) qb.where('status', status);
        if (customerId) qb.where('customer_id', customerId);
      })
      .count({ count: 'id' });

    const orders = await query
      .orderBy('orders.created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage);

    return { orders, total: parseInt(count, 10) };
  }

  async updateStatus(id, tenantId, status, notes, createdBy, trx) {
    const conn = trx || db;
    const [order] = await conn('orders')
      .where({ id, store_id: tenantId })
      .update({ status, updated_at: conn.fn.now() })
      .returning('*');

    if (!order) return null;

    await conn('order_status_history').insert({
      order_id: order.id,
      status,
      notes: notes || `Estado cambiado a ${status}`,
      created_by: createdBy || null,
    });

    return order;
  }

  async createPayment(paymentData, trx) {
    const conn = trx || db;
    const [payment] = await conn('payments').insert(paymentData).returning('*');

    await conn('payment_status_history').insert({
      payment_id: payment.id,
      status: payment.status,
      notes: 'Pago inicial registrado',
    });

    return payment;
  }
}
