import { verifyToken } from '../utils/jwt.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const error = new Error('Token requerido');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const payload = verifyToken(header.split(' ')[1]);
    req.user = payload;
    next();
  } catch {
    const error = new Error('Token inválido o expirado');
    error.statusCode = 401;
    error.code = 'TOKEN_INVALID';
    return next(error);
  }
}
