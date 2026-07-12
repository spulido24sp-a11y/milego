import app from './app.js';
import { config } from './config/index.js';
import db from './config/database.js';
import { logger } from './middlewares/requestLogger.js';
import { startWorker } from './jobs/worker.js';
import { startAdSyncWorker } from './workers/ad-sync.worker.js';

async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connected');
    
    // Start background job queue worker for Core 2.0
    startWorker(5000);

    // Start background sync for Meta and TikTok Ads snapshots
    startAdSyncWorker();
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    process.exit(1);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
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
