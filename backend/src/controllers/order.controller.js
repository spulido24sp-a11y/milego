import { OrderService } from '../services/order.service.js';
import { success, error } from '../utils/response.js';

const orderService = new OrderService();

export class OrderController {
  async list(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { status, customer_id, page, per_page } = req.query;

      const result = await orderService.list(tenantId, {
        status,
        customerId: customer_id ? parseInt(customer_id, 10) : null,
        page: page ? parseInt(page, 10) : 1,
        perPage: per_page ? parseInt(per_page, 10) : 20,
      });

      return success(res, result.orders, { total: result.total });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;

      const order = await orderService.getById(parseInt(id, 10), tenantId);
      return success(res, order);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return error(res, err.message, 404);
      }
      next(err);
    }
  }

  async getByOrderNumber(req, res, next) {
    try {
      const tenantId = parseInt(req.query.store_id, 10) || 1;
      const { orderNumber } = req.params;
      const order = await orderService.getByOrderNumber(orderNumber, tenantId);
      return success(res, order);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return error(res, err.message, 404);
      }
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const { status, notes } = req.body;
      const staffUserId = req.user.sub;

      const order = await orderService.updateStatus(
        parseInt(id, 10),
        tenantId,
        status,
        notes,
        staffUserId
      );

      return success(res, order);
    } catch (err) {
      if (err.message.includes('no encontrado')) {
        return error(res, err.message, 404);
      }
      next(err);
    }
  }
}
