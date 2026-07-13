import app from './app.js';
import { config } from './config/index.js';
import db from './config/database.js';
import { logger } from './middlewares/requestLogger.js';
import { startWorker } from './jobs/worker.js';
import { startAdSyncWorker } from './workers/ad-sync.worker.js';
import { startDropiCatalogSync } from './integrations/dropi/sync.service.js';
import { publishLanding } from './landing/publisher.js';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

console.log('[STARTUP] server.js loaded, PORT=', process.env.PORT, 'NODE_ENV=', process.env.NODE_ENV);

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

  // Validación segura de variables de entorno (solo WARN, no crashea)
  try {
    config.validate();
  } catch (e) {
    logger.error({ err: e }, 'Config validation error');
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

  // Start autonomous Dropi catalog polling (detects + imports new products 24/7)
  try {
    startDropiCatalogSync(1);
  } catch (e) {
    logger.error({ err: e }, 'Dropi catalog worker failed to start');
  }

  // P0: garantizar usuario admin (los seeds no corren solos en prod)
  (async () => {
    try {
      const existing = await db('users').where({ email: 'admin@milego.co' }).first();
      if (existing) return;
      const storeRow = await db('stores').where({ slug: 'milego-store' }).orWhere('id', 1).first();
      const storeId = storeRow?.id || 1;
      let roleId = (await db('roles').where({ slug: 'admin' }).orWhere('name', 'admin').first())?.id;
      if (!roleId) {
        const roles = await db('roles').insert({ name: 'admin', slug: 'admin', is_system: true }).returning('id');
        roleId = roles[0]?.id || roles[0];
      }
      const { default: argon2 } = await import('argon2');
      const passwordHash = await argon2.hash(process.env.ADMIN_PASSWORD || 'admin123');
      await db('users').insert({
        name: 'Administrador MIleGo', email: 'admin@milego.co',
        password_hash: passwordHash, store_id: storeId, role_id: roleId, is_active: true,
      });
      logger.info('Usuario admin garantizado: admin@milego.co');
    } catch (e) {
      logger.error({ err: e }, 'No se pudo garantizar usuario admin');
    }
  })();

  // P0: publicar landings de todos los productos (para poder vender hoy)
  (async () => {
    try {
      const products = await db('products').select('id', 'slug', 'name');
      let published = 0;
      for (const p of products) {
        let slug = p.slug;
        if (!slug) {
          slug = (p.name || 'producto').toString().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          await db('products').where('id', p.id).update({ slug });
        }
        try { await publishLanding(p.id); published++; }
        catch (e) { logger.warn({ err: e, id: p.id }, 'No se pudo publicar landing'); }
      }
      logger.info(`Self-publish landings completado: ${published}/${products.length}`);
    } catch (e) {
      logger.error({ err: e }, 'Self-publish landings falló');
    }
  })();
})();

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    db.destroy().then(() => process.exit(0)).catch(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
