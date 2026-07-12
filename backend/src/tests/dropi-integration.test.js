import { describe, it, expect, beforeAll, vi } from 'vitest';
import { DropiSyncService } from '../integrations/dropi/sync.service.js';
import { DropiClient } from '../integrations/dropi/client.js';
import { registerEventHandlers } from '../events/register.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

registerEventHandlers();
const syncService = new DropiSyncService();
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rawSample = JSON.parse(readFileSync(`${__dirname}../integrations/dropi/samples/dropi-product.json`, 'utf8'));

// Mock DropiClient for local database flow verification
vi.spyOn(DropiClient.prototype, 'getProduct').mockImplementation(async (externalId) => {
  if (externalId === '14166') {
    return rawSample;
  }
  throw new Error('Not found');
});

describe('Dropi Sync and Integration Engine Tests', () => {

  beforeAll(async () => {
    // Enable Dropi provider for testing
    process.env.DROPI_PROVIDER_ENABLED = 'true';
    process.env.DROPI_INTEGRATION_KEY = 'mock-integration-key';
  });

  it('should import a Dropi product, its variants, and images successfully', async () => {
    // Clean up with referential integrity in mind
    await db('inventory_movements').del();
    await db('order_items').del();
    await db('orders').del();
    await db('product_variants').del();
    await db('product_images').del();
    await db('products').where({ provider_product_id: '14166' }).del();

    const product = await syncService.importProduct('14166', 1);

    expect(product).toBeDefined();
    expect(product.provider_product_id).toBe('14166');
    expect(product.name).toBe('Corrector de Postura Inteligente');
    expect(parseFloat(product.price)).toBe(79900.00);

    // Fetch details
    const variants = await db('product_variants').where({ product_id: product.id });
    expect(variants).toHaveLength(2);
    expect(variants[0].name).toBe('Talla M');
    expect(variants[0].sku).toBe('CORRECT-M');

    const images = await db('product_images').where({ product_id: product.id });
    expect(images).toHaveLength(3);
    expect(images[0].url).toContain('1.jpg');
  });

  it('should guarantee idempotency when importing the same product multiple times', async () => {
    // Count existing products
    const initialCount = await db('products').where({ provider_product_id: '14166', store_id: 1 }).count();
    
    // Import again
    const product = await syncService.importProduct('14166', 1);
    
    const postCount = await db('products').where({ provider_product_id: '14166', store_id: 1 }).count();
    expect(parseInt(postCount[0].count, 10)).toBe(1); // Still exactly 1 product record
  });

  it('should protect custom copywriting and launch blueprints from sync overwrites (Data Lock)', async () => {
    // Retrieve product
    const product = await db('products').where({ provider_product_id: '14166', store_id: 1 }).first();
    
    // Manually inject custom user modification simulation (Data Lock)
    const customBlueprint = {
      decision: 'launch',
      explanation: ['Usuario aprobo el plan manualmente.'],
      commerce_confidence_scores: { total: 100 }
    };

    const customDescription = 'Esta es una descripcion redactada por el usuario.';

    await db('products').where({ id: product.id }).update({
      launch_blueprint: customBlueprint,
      description: customDescription
    });

    // Execute synchronization from Dropi API
    const synced = await syncService.syncProduct(product.id, product);

    // Assert that stock and status are updated but custom texts are locked/preserved!
    expect(synced.sync_status).toBe('synced');
    expect(synced.description).toBe(customDescription); // Description locked!
    expect(synced.launch_blueprint).toEqual(customBlueprint); // Blueprint locked!
  });
});
