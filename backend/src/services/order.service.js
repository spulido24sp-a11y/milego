import { OrderRepository } from '../repositories/order.repository.js';
import { bus } from '../events/index.js';

const repo = new OrderRepository();

export class OrderService {
  async list(tenantId, filters) {
    return repo.findAll({ tenantId, ...filters });
  }

  async getById(id, tenantId) {
    const order = await repo.findById(id, tenantId);
    if (!order) throw new Error('Pedido no encontrado');
    return order;
  }

  async getByOrderNumber(orderNumber, tenantId) {
    const order = await repo.findByOrderNumber(orderNumber, tenantId);
    if (!order) throw new Error('Pedido no encontrado');
    return order;
  }

  async updateStatus(id, tenantId, status, notes, createdBy) {
    const order = await repo.updateStatus(id, tenantId, status, notes, createdBy);
    if (!order) throw new Error('Pedido no encontrado');

    if (status === 'confirmed') {
      await bus.emit('order.confirmed', {
        order: { id: order.id, order_number: order.order_number, store_id: tenantId },
      });
    }

    return order;
  }
}
