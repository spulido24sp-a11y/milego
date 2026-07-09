import app from './app.js';
import { config } from './config/index.js';
import db from './config/database.js';
import { logger } from './middlewares/requestLogger.js';

async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`MIleGo API running on port ${config.port} [${config.env}]`);
  });

  function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      db.destroy().then(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
