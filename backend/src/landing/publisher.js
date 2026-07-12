import db from '../config/database.js';
import { generateLanding } from './generator.js';

export async function publishLanding(productId) {
  const product = await db('products').where('id', productId).first();
  if (!product) throw new Error('Producto no encontrado');

  const settings = await db('settings')
    .where('store_id', product.store_id || 1)
    .select('key', 'value');
  const storeSettings = {};
  for (const s of settings) {
    try { storeSettings[s.key] = s.value ? JSON.parse(s.value) : null; }
    catch { storeSettings[s.key] = s.value; }
  }

  const landing = await generateLanding(product, storeSettings);


  const lastVersion = await db('launch_versions')
    .where('product_id', productId)
    .max('version as maxVersion')
    .first();

  const version = (lastVersion?.maxVersion || 0) + 1;

  const blueprint = {
    ...(product.launch_blueprint || {}),
    landing_html: landing.html,
    landing_meta: landing.meta,
    landing_version: version,
    published_at: new Date().toISOString(),
  };

  await db('launch_versions').insert({
    product_id: productId,
    version,
    blueprint: db.raw('?::jsonb', JSON.stringify(blueprint)),
  });

  await db('products').where('id', productId).update({
    launch_blueprint: db.raw('?::jsonb', JSON.stringify(blueprint)),
    status: 'published',
    updated_at: db.fn.now(),
  });

  return {
    productId,
    slug: landing.meta.slug,
    url: landing.meta.url,
    version,
    title: landing.meta.title,
    description: landing.meta.description,
  };
}

export async function getPublishedLanding(slug) {
  const product = await db('products')
    .where(db.raw("launch_blueprint->'landing_meta'->>'slug'"), slug)
    .orWhere('slug', slug)
    .where('status', 'published')
    .whereNotNull(db.raw("launch_blueprint->>'landing_html'"))
    .first();

  if (!product) return null;

  const bp = product.launch_blueprint || {};
  return {
    html: bp.landing_html,
    meta: bp.landing_meta,
    product,
  };
}
