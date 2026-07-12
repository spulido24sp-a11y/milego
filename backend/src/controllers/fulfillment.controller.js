import { FulfillmentService } from '../services/fulfillment.service.js';
import { success, error } from '../utils/response.js';

const fulfillmentService = new FulfillmentService();

export class FulfillmentController {
  async send(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const result = await fulfillmentService.sendToFulfillment(parseInt(id, 10), tenantId);
      return success(res, result);
    } catch (err) {
      if (err.message.includes('ya fue enviado')) return error(res, err.message, 409);
      if (err.message.includes('no encontrado')) return error(res, err.message, 404);
      next(err);
    }
  }

  async syncStatus(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const result = await fulfillmentService.syncStatus(parseInt(id, 10), tenantId);
      return success(res, result);
    } catch (err) {
      if (err.message.includes('no tiene orden')) return error(res, err.message, 400);
      if (err.message.includes('no encontrado')) return error(res, err.message, 404);
      next(err);
    }
  }

  async getLog(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const { id } = req.params;
      const logs = await req.app.get('db')('fulfillment_log')
        .where({ order_id: parseInt(id, 10) })
        .orderBy('created_at', 'asc');
      return success(res, logs);
    } catch (err) {
      next(err);
    }
  }
}
