import { AuthService } from '../services/auth.service.js';
import { success } from '../utils/response.js';

const authService = new AuthService();

export class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.validated;
      const result = await authService.login(email, password, req.ip, req.headers['user-agent']);
      return success(res, result);
    } catch (err) { next(err); }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'refreshToken requerido' } });
      }
      const result = await authService.refresh(refreshToken);
      return success(res, result);
    } catch (err) { next(err); }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await authService.logout(refreshToken);
      return success(res, { message: 'Sesión cerrada' });
    } catch (err) { next(err); }
  }

  async me(req, res, next) {
    try {
      return success(res, { user: req.user });
    } catch (err) { next(err); }
  }
}
