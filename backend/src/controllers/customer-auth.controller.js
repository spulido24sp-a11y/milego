import { CustomerAuthService } from '../services/customer-auth.service.js';
import { requestMagicLinkSchema } from '../validators/customer.validator.js';
import { success, error } from '../utils/response.js';

const authService = new CustomerAuthService();

export class CustomerAuthController {
  async requestMagicLink(req, res, next) {
    try {
      const { email } = requestMagicLinkSchema.parse(req.body);
      const tenantId = req.tenant.storeId;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.requestMagicLink(email, tenantId, ip, userAgent);
      return success(res, result);
    } catch (err) {
      if (err.name === 'ZodError') {
        return error(res, 'Datos de validación inválidos', 400, err.errors);
      }
      next(err);
    }
  }

  async verifyMagicLink(req, res, next) {
    try {
      const { token } = req.query;
      if (!token) {
        return error(res, 'Token es obligatorio', 400);
      }

      const result = await authService.verifyMagicLinkToken(token);
      return success(res, result);
    } catch (err) {
      if (err.statusCode === 401) {
        return error(res, err.message, 401, null, err.code);
      }
      next(err);
    }
  }
}
