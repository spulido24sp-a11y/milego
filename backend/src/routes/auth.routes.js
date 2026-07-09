import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { loginSchema } from '../validators/auth.validator.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const controller = new AuthController();

const loginLimiter = rateLimit({
  windowMs: 60000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT, 10) || 5,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiados intentos. Intenta de nuevo en 1 minuto.' } },
});

const refreshLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes de refresh. Intenta de nuevo en 1 minuto.' } },
});

const logoutLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes de logout. Intenta de nuevo en 1 minuto.' } },
});

router.post('/auth/login', loginLimiter, validate(loginSchema), controller.login.bind(controller));
router.post('/auth/refresh', refreshLimiter, controller.refresh.bind(controller));
router.post('/auth/logout', logoutLimiter, controller.logout.bind(controller));
router.get('/auth/me', authenticate, controller.me.bind(controller));

export default router;
