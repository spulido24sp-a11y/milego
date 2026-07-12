import { CheckoutService } from '../services/checkout.service.js';
import { checkoutSchema } from '../validators/checkout.validator.js';
import { success, error, created } from '../utils/response.js';

const checkoutService = new CheckoutService();

export class CheckoutController {
  async processCheckout(req, res, next) {
    try {
      const tenantId = req.tenant.storeId;
      const validatedData = checkoutSchema.parse(req.body);

      const result = await checkoutService.process(tenantId, validatedData);
      return created(res, result);
    } catch (err) {
      if (err.name === 'ZodError') {
        return error(res, 'Datos de validación inválidos', 400, err.errors);
      }
      if (err.message.includes('Stock insuficiente') || err.message.includes('no encontrada')) {
        return error(res, err.message, 400);
      }
      next(err);
    }
  }
}
