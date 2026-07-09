export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'Error interno del servidor' : err.message;

  if (statusCode === 500) {
    req.log?.error({ err, reqId: req.id, correlationId: req.correlationId }, message);
  }

  return res.status(statusCode).json({
    success: false,
    error: { code, message, details: err.details || [] },
    correlation_id: req.correlationId || null,
  });
}