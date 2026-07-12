import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { correlationId } from './middlewares/correlationId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { routes } from './routes/index.js';
import { registerEventHandlers } from './events/register.js';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  // Relaxed helmet settings for local development so SSL is not forced
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
}
app.use(corsMiddleware);
app.use(express.json());

app.get('/api/placeholder/:size', (req, res) => {
  const size = parseInt(req.params.size, 10) || 500;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#f1f5f9"/><text x="${size/2}" y="${size/2}" font-family="Arial,sans-serif" font-size="${size/15}" fill="#94a3b8" text-anchor="middle" dominant-baseline="central">Sin imagen</text></svg>`);
});
app.use('/admin', express.static(fileURLToPath(new URL('../../admin', import.meta.url))));
app.use('/uploads', express.static(new URL('../uploads', import.meta.url).pathname));
app.use(correlationId);
app.use(requestLogger);
app.use('/api/v1', routes);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const swaggerDocument = YAML.parse(readFileSync(`${__dirname}docs/openapi.yml`, 'utf8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'MIleGo API Docs',
}));

registerEventHandlers();

import { getPublishedLanding } from './landing/publisher.js';
import db from './config/database.js';

app.get('/launch/:slug', async (req, res, next) => {
  try {
    const landing = await getPublishedLanding(req.params.slug);
    if (!landing) {
      return res.status(404).sendFile(fileURLToPath(new URL('../../index.html', import.meta.url)));
    }
    res.send(landing.html);
  } catch (err) {
    next(err);
  }
});

app.get('/status', async (_req, res, next) => {
  try {
    const status = { api: true, db: true, products: 0, published: 0, orders: 0, pending: 0, stores: 0, blueprints: 0, uptime: Math.floor(process.uptime()), ordersData: [] };
    const [prodCount] = await db('products').count('id as c');
    status.products = prodCount?.count ?? prodCount?.c ?? 0;
    const [ordCount] = await db('orders').count('id as c');
    status.orders = ordCount?.count ?? ordCount?.c ?? 0;
    const [pubCount] = await db('products').where('status', 'published').count('id as c');
    status.published = pubCount?.count ?? pubCount?.c ?? 0;
    const [pendCount] = await db('orders').where('status', 'pending').count('id as c');
    status.pending = pendCount?.count ?? pendCount?.c ?? 0;
    const [storeCount] = await db('stores').count('id as c');
    status.stores = storeCount?.count ?? storeCount?.c ?? 0;
    const [bpC] = await db('products').whereNotNull('launch_blueprint').count('id as c');
    status.blueprints = bpC?.count ?? bpC?.c ?? 0;
    status.ordersData = await db('orders')
      .leftJoin('customers', 'orders.customer_id', 'customers.id')
      .orderBy('orders.created_at', 'desc').limit(10)
      .select('orders.id','orders.order_number','orders.total','orders.status','orders.payment_method','orders.created_at','customers.name as customer_name');

    res.send(`<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>MileGo · Status</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Outfit,system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:2rem}
h1{font-size:1.5rem;font-weight:900;margin-bottom:.25rem;display:flex;align-items:center;gap:.75rem}
h1 small{font-size:.8rem;font-weight:400;color:#64748b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:1.5rem 0}
.card{background:#1e293b;border-radius:12px;padding:1.25rem;border:1px solid #334155}
.card .label{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:600}
.card .value{font-size:1.75rem;font-weight:900;margin-top:.25rem;color:#f1f5f9}
.card .sub{font-size:.8rem;color:#94a3b8;margin-top:.25rem}
.ok{color:#22c55e}.warn{color:#eab308}.bad{color:#ef4444}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th{text-align:left;padding:.5rem .75rem;color:#64748b;font-weight:600;text-transform:uppercase;font-size:.7rem;letter-spacing:.05em;border-bottom:1px solid #334155}
td{padding:.5rem .75rem;border-bottom:1px solid #1e293b;color:#cbd5e1}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.section-title{font-size:.9rem;font-weight:700;color:#94a3b8;margin:2rem 0 .75rem;text-transform:uppercase;letter-spacing:.1em}
</style></head><body>
<h1>MileGo <small>v6 · RC1</small></h1>
<div class="grid">
  <div class="card"><div class="label">API</div><div class="value ok">●</div><div class="sub">${status.uptime}s uptime</div></div>
  <div class="card"><div class="label">DB</div><div class="value ok">●</div><div class="sub">PostgreSQL</div></div>
  <div class="card"><div class="label">Tiendas</div><div class="value">${status.stores}</div></div>
  <div class="card"><div class="label">Productos</div><div class="value">${status.products}</div><div class="sub">${status.published} publicados · ${status.blueprints} con blueprint</div></div>
  <div class="card"><div class="label">Pedidos</div><div class="value">${status.orders}</div><div class="sub">${status.pending} pendientes</div></div>
</div>
<div class="section-title">Últimos Pedidos</div>
<table><thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
${status.ordersData.map(o => `<tr><td>${o.order_number||o.id}</td><td>${o.customer_name||'-'}</td><td>$${Number(o.total).toLocaleString('es-CO')}</td><td>${o.payment_method==='cash_on_delivery'?'Contra entrega':o.payment_method||'-'}</td><td><span class="status-dot ${o.status==='pending'?'warn':o.status==='completed'?'ok':'bad'}"></span>${o.status}</td><td>${new Date(o.created_at).toLocaleString('es-CO')}</td></tr>`).join('')}
</tbody></table>
</body></html>`);
  } catch (err) { next(err); }
});

app.use('/uploads', express.static(new URL('../uploads', import.meta.url).pathname));
app.use(express.static(fileURLToPath(new URL('../..', import.meta.url)), { extensions: ['html'] }));

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
    correlation_id: null,
  });
});

app.use(errorHandler);

export default app;