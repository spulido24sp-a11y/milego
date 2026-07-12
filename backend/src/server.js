import app from './app.js';
import { config } from './config/index.js';
import db from './config/database.js';
import { logger } from './middlewares/requestLogger.js';
import { startWorker } from './jobs/worker.js';
import { startAdSyncWorker } from './workers/ad-sync.worker.js';

const PORT = config.port || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`MIleGo API running on port ${PORT} [${config.env}]`);
});

// Connect to DB in background (non-blocking)
(async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Database connection failed — continuing without DB');
  }

  // Start background job queue worker for Core 2.0 (non-blocking)
  try {
    startWorker(5000);
  } catch (e) {
    logger.error({ err: e }, 'Worker failed to start');
  }

  // Start background sync for Meta and TikTok Ads snapshots (non-blocking)
  try {
    startAdSyncWorker();
  } catch (e) {
    logger.error({ err: e }, 'AdSync worker failed to start');
  }
})();

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    db.destroy().then(() => process.exit(0)).catch(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
