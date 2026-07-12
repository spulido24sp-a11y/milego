import { verifyToken } from '../utils/jwt.js';

export function authenticateCustomer(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const error = new Error('Token de cliente requerido');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const payload = verifyToken(header.split(' ')[1]);
    if (payload.role !== 'customer') {
      const error = new Error('Token no es de tipo cliente');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }
    req.customer = { id: payload.sub };
    req.tenant = { storeId: payload.store_id };
    next();
  } catch {
    const error = new Error('Token de cliente inválido o expirado');
    error.statusCode = 401;
    error.code = 'TOKEN_INVALID';
    return next(error);
  }
}
