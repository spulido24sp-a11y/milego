export function requirePermission(slug) {
  return (req, _res, next) => {
    if (!req.user?.permissions?.includes(slug)) {
      const error = new Error('No tienes permiso para esta acción');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }
    next();
  };
}
