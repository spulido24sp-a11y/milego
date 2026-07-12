import pino from 'pino';
import { config } from '../config/index.js';

const logger = pino({
  level: config.log.level
});

export function requestLogger(req, res, next) {
  const start = Date.now();
  req.log = logger.child({ reqId: req.id });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.log.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
    });
  });

  next();
}

export { logger };