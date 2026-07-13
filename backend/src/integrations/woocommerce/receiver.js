import express from 'express';
import db from '../config/database.js';
import { publishLanding } from '../landing/publisher.js';

const router = express.Router();

const CK = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CS = process.env.WOOCOMMERCE_CONSUMER_SECRET;

function slugify(s = '') {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'producto';
}

function parseAuth(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const [ck, cs] = decoded.split(':');
      if (ck && cs) return { ck, cs };
    } catch { /* ignore */ }
  }
  const qk = req.query.consumer_key;
  const qs = req.query.consumer_secret;
  if (qk && qs) return { ck: qk, cs: qs };
  return null;
}

function authMiddleware(req, res, next) {
  if (!CK || !CS) {
    console.warn('[WC] Auth no configurada (WOOCOMMERCE_CONSUMER_KEY/SECRET) — permitiendo tráfico (modo setup)');
    return next();
  }
  const creds = parseAuth(req);
  if (!creds || creds.ck !== CK || creds.cs !== CS) {
    return res.status(401).json({ code: 'woocommerce_rest_cannot_view', message: 'Consumer key/secret inválido' });
  }
  next();
}

async function findOrCreateCategory(storeId, name) {
  if (!name) return null;
  const existing = await db('categories').where({ store_id: storeId, name }).first();
  if (existing) return existing.id;
  const [row] = await db('categories')
    .insert({ store_id: storeId, name, slug: slugify(name), sort_order: 99 })
    .returning(['id']);
  return row.id;
}

function mapProduct(wc, storeId) {
  const id = String(wc.id ?? wc.ID ?? '');
  const regular = parseFloat(wc.regular_price) || parseFloat(wc.price) || 0;
  const sale = parseFloat(wc.sale_price) || 0;
  const price = sale > 0 ? sale : (parseFloat(wc.price) || regular);
  const base = parseFloat(wc.regular_price) || 0;
  const compare_price = (base && base > price) ? base : null;
  const stock = parseInt(wc.stock_quantity ?? wc.stock ?? 0, 10) || 0;
  const status = wc.status === 'publish' ? 'active' : 'draft';

  return {
    provider_id: 'dropi',
    provider_product_id: id,
    dropi_id: id,
    name: wc.name || 'Producto sin nombre',
    description: wc.description || '',
    short_description: wc.short_description || '',
    sku: wc.sku || null,
    price,
    compare_price,
    stock,
    status,
    barcode: wc.barcode || null,
    category_name: Array.isArray(wc.categories) && wc.categories[0]?.name
      ? wc.categories[0].name
      : null,
    images: Array.isArray(wc.images)
      ? wc.images.map((img, i) => ({ url: img.src, alt: img.alt || wc.name, sort_order: i + 1, is_primary: i === 0 }))
      : [],
    raw: wc,
  };
}

async function upsertProduct(mapped, storeId) {
  const { category_name, images, raw, ...productData } = mapped;

  let categoryId = null;
  if (category_name) categoryId = await findOrCreateCategory(storeId, category_name);

  const existing = await db('products')
    .where({ store_id: storeId, provider_id: 'dropi', provider_product_id: mapped.provider_product_id })
    .first();

  const slug = `${slugify(mapped.name)}-${mapped.provider_product_id}`;

  const payload = {
    ...productData,
    store_id: storeId,
    slug,
    category_id: categoryId,
    provider_last_sync: db.fn.now(),
    sync_status: 'synced',
    updated_at: db.fn.now(),
  };

  let productId;
  if (existing) {
    await db('products').where('id', existing.id).update(payload);
    productId = existing.id;
  } else {
    [productId] = await db('products').insert(payload).returning(['id']);
    productId = productId.id ?? productId;
  }

  if (images.length) {
    await db('product_images').where('product_id', productId).del();
    await db('product_images').insert(images.map(img => ({ ...img, product_id: productId })));
  }

  try {
    await publishLanding(productId);
  } catch (e) {
    console.warn(`[WC] No se pudo publicar landing para producto ${productId}: ${e.message}`);
  }

  return productId;
}

async function handleBatch(req, res) {
  const body = req.body || {};
  const storeId = 1;
  const result = { create: [], update: [], delete: [] };

  for (const wc of (body.create || [])) {
    const id = await upsertProduct(mapProduct(wc, storeId), storeId);
    result.create.push({ id, product_id: id });
  }
  for (const wc of (body.update || [])) {
    const id = await upsertProduct(mapProduct(wc, storeId), storeId);
    result.update.push({ id, product_id: id });
  }
  for (const del of (body.delete || [])) {
    const pid = String(del.id ?? del);
    await db('products').where({ store_id: storeId, provider_id: 'dropi', provider_product_id: pid }).del();
    result.delete.push({ id: pid });
  }

  console.info(`[WC] Batch procesado: +${result.create.length} ~${result.update.length} -${result.delete.length}`);
  res.json(result);
}

async function handleCreate(req, res) {
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  const storeId = 1;
  const created = [];
  for (const wc of items) {
    const id = await upsertProduct(mapProduct(wc, storeId), storeId);
    created.push({ id, product_id: id });
  }
  res.status(201).json(Array.isArray(body) ? created : created[0]);
}

router.use(authMiddleware);

router.get('/products', (_req, res) => res.json([]));
router.get('/', (_req, res) => res.json({ wc: 'ok' }));
router.post('/products/batch', handleBatch);
router.post('/products', handleCreate);
router.put('/products/:id', async (req, res) => {
  const storeId = 1;
  const id = await upsertProduct(mapProduct({ ...req.body, id: req.params.id }, storeId), storeId);
  res.json({ id, product_id: id });
});

export default router;
