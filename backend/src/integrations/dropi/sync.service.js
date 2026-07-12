import { CommerceProvider } from '../provider.interface.js';
import { DropiClient } from './client.js';
import { DropiMapper } from './mapper.js';
import { ProductService } from '../../services/product.service.js';
import db from '../../config/database.js';
import { config } from '../../config/index.js';

const client = new DropiClient();
const productService = new ProductService();

let _syncServiceInstance = null;
function getSyncService() {
  if (!_syncServiceInstance) _syncServiceInstance = new DropiSyncService();
  return _syncServiceInstance;
}

// Intervalo de polling del catálogo Dropi (default 30 min). Variable de entorno opcional.
const CATALOG_POLL_MS = parseInt(process.env.DROPI_CATALOG_POLL_MS, 10) || 30 * 60 * 1000;

export class DropiSyncService extends CommerceProvider {
  /**
   * Retrieves and maps a product from the Dropi API.
   * @param {string} externalId 
   * @returns {Promise<Object>} Mapped product contract
   */
  async getProduct(externalId) {
    const raw = await client.getProduct(externalId);
    return DropiMapper.mapProduct(raw);
  }

  /**
   * Imports a product from Dropi, ensuring idempotency.
   * @param {string} externalId 
   * @param {number} storeId 
   * @returns {Promise<Object>} Saved product record
   */
  async importProduct(externalId, storeId) {
    const normalized = await this.getProduct(externalId);

    // 1. Idempotency Check (Epic 1 Phase 3)
    const existing = await db('products')
      .where({ provider_product_id: normalized.provider_product_id, store_id: storeId })
      .first();

    if (existing) {
      // Re-sync instead of duplicating
      return this.syncProduct(existing.id, existing, normalized);
    }

    // 2. Persist Base Product using ProductService to trigger events
    const productData = {
      store_id: storeId,
      name: normalized.name,
      slug: `${normalized.slug}-${Date.now()}`,
      description: normalized.description,
      price: normalized.suggested_retail_price,
      stock: normalized.stock,
      status: 'active',
      provider_product_id: normalized.provider_product_id,
      provider_id: 'dropi',
      provider_last_sync: new Date(),
      sync_status: 'synced',
      weight: normalized.weight
    };

    const product = await productService.create(productData);

    // 3. Persist images and variants inside transaction
    await db.transaction(async (trx) => {
      if (normalized.images && normalized.images.length > 0) {
        const imageRecords = normalized.images.map(img => ({
          product_id: product.id,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order
        }));
        await trx('product_images').insert(imageRecords);
      }

      if (normalized.variants && normalized.variants.length > 0) {
        const variantRecords = normalized.variants.map(v => ({
          product_id: product.id,
          name: v.name,
          sku: v.sku || `VAR-${v.provider_variant_id}`,
          price: v.price,
          stock: v.stock,
          is_active: true
        }));
        await trx('product_variants').insert(variantRecords);
      }
    });

    return product;
  }

  /**
   * Synchronizes an existing product's logistics/stock, preserving custom copies (Data Lock).
   * @param {number} productId 
   * @param {Object} dbProduct 
   * @param {Object} [normalizedData=null] 
   * @returns {Promise<Object>} Updated product record
   */
  async syncProduct(productId, dbProduct, normalizedData = null) {
    const normalized = normalizedData || await this.getProduct(dbProduct.provider_product_id);

    // Update stock, price, status and synchronization timestamps
    const updatedFields = {
      stock: normalized.stock,
      price: normalized.suggested_retail_price,
      provider_last_sync: new Date(),
      sync_status: 'synced'
    };

    // Perform database updates
    await db('products').where({ id: productId }).update(updatedFields);

    await db.transaction(async (trx) => {
      // Sync Variants
      const existingVariants = await trx('product_variants').where({ product_id: productId });
      
      for (const v of normalized.variants) {
        const matching = existingVariants.find(ev => ev.name === v.name);
        if (matching) {
          await trx('product_variants').where({ id: matching.id }).update({
            price: v.price,
            stock: v.stock,
            is_active: true
          });
        } else {
          await trx('product_variants').insert({
            product_id: productId,
            name: v.name,
            sku: v.sku || `VAR-${v.provider_variant_id}`,
            price: v.price,
            stock: v.stock,
            is_active: true
          });
        }
      }

      // Mark obsolete variants as inactive
      const latestVariantNames = normalized.variants.map(v => v.name);
      await trx('product_variants')
        .where({ product_id: productId })
        .whereNotIn('name', latestVariantNames)
        .update({ is_active: false });

      // Refresh product images
      await trx('product_images').where({ product_id: productId }).del();
      if (normalized.images && normalized.images.length > 0) {
        const imageRecords = normalized.images.map(img => ({
          product_id: productId,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order
        }));
        await trx('product_images').insert(imageRecords);
      }
    });

    return db('products').where({ id: productId }).first();
  }

  /**
   * Checks Dropi integration health.
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    const { DropiHealthService } = await import('./health.service.js');
    const health = new DropiHealthService();
    const report = await health.checkHealth();
    return report.reachable;
  }
}

/**
 * Detecta y  importa productos NUEVOS del catálogo Dropi.
 * Recorre el catálogo y, por cada item cuyo provider_product_id aún no
 * exista en la tienda, dispara la importación (que a su vez emite
 * 'product.created' → el worker de LIAM procesa el producto de forma autónoma).
 * @param {number} [storeId=1]
 * @returns {Promise<{imported:number,skipped:number}>}
 */
export async function syncCatalogOnce(storeId = 1) {
  const list = await client.listCatalog({ page: 1, limit: 100 });

  let imported = 0;
  let skipped = 0;

  for (const item of list) {
    const externalId = item?.id ?? item?.product_id ?? item?.external_id;
    if (!externalId) continue;

    const existing = await db('products')
      .where({ provider_product_id: String(externalId), store_id: storeId })
      .first();
    if (existing) { skipped++; continue; }

    try {
      const product = await getSyncService().importProduct(String(externalId), storeId);
      imported++;
      console.info(`[DropiSync] Nuevo producto importado → #${product.id} ${product.name}`);
    } catch (err) {
      console.warn(`[DropiSync] Fallo import ${externalId}:`, err.message);
    }
  }

  return { imported, skipped };
}

/**
 * Inicia el worker programado de sincronización de catálogo Dropi.
 * Corre una vez al arrancar y luego cada CATALOG_POLL_MS.
 * Reutiliza el mismo patrón del ad-sync worker (setInterval + unref).
 * @param {number} [storeId=1]
 * @param {number} [intervalMs=CATALOG_POLL_MS]
 * @returns {Interval}
 */
export function startDropiCatalogSync(storeId = 1, intervalMs = CATALOG_POLL_MS) {
  if (!config.dropiProviderEnabled) {
    console.info('[DropiSync] Proveedor Dropi inactivo (DROPI_PROVIDER_ENABLED != "true"). Worker no iniciado.');
    return null;
  }

  console.info(`[DropiSync] Worker de catálogo iniciado — cada ${Math.round(intervalMs / 60000)} min`);
  syncCatalogOnce(storeId).catch((e) => console.warn('[DropiSync]', e.message));

  const interval = setInterval(() => {
    syncCatalogOnce(storeId).catch((e) => console.warn('[DropiSync]', e.message));
  }, intervalMs);
  interval.unref();
  return interval;
}
