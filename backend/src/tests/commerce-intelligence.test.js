import { describe, it, expect } from 'vitest';
import { DecisionEngine } from '../brain/decision-engine.js';
import { ProductService } from '../services/product.service.js';
import { processNextJob } from '../jobs/worker.js';
import { registerEventHandlers } from '../events/register.js';
import db from '../config/database.js';

registerEventHandlers();

const decisionEngine = new DecisionEngine();
const productService = new ProductService();

import { beforeAll } from 'vitest';

describe('Sprint 4 - AI Commerce Intelligence Integration Tests', () => {

  beforeAll(async () => {
    await db('ai_requests_log').del();
    await db('ai_cache').del();
  });

  const sampleProduct = {
    name: 'Smart Lamp Pro Version 2',
    sku_base: 'LAMP-SMART-V2',
    description: 'Iluminacion RGB para sala.',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    supplier_info: {
      wholesale_price: 25000,
      suggested_retail_price: 69900,
      stock_available: 150,
      weight: 1.5
    }
  };

  it('should generate a full structured Launch Blueprint in decision engine', async () => {
    const blueprint = await decisionEngine.processDecision(sampleProduct, 'mock');

    expect(blueprint.decision).toBe('launch');
    expect(blueprint.confidence).toBe(86);
    expect(blueprint.commerce_confidence_scores.total).toBe(86);
    expect(blueprint.explanation).toContain('Recomiendo el lanzamiento con Combo x2.');
    expect(blueprint.seo.slug).toBe('smart-lamp-pro-rgb');
    expect(blueprint.market.competition).toBe('medium');
    expect(blueprint.customer.pain_points).toContain('Temor a fraudes en tiendas desconocidas');
  });

  it('should trigger copilot mode with need_info if images count is less than 3', async () => {
    const incompleteProduct = {
      ...sampleProduct,
      images: ['https://example.com/1.jpg'] // only 1 image
    };

    const blueprint = await decisionEngine.processDecision(incompleteProduct, 'mock');

    expect(blueprint.decision).toBe('need_info');
    expect(blueprint.missing_details[0]).toContain('suficientes imágenes');
  });

  it('should trigger copilot mode with need_info if weight is missing', async () => {
    const incompleteProduct = {
      ...sampleProduct,
      supplier_info: {
        ...sampleProduct.supplier_info,
        weight: undefined // missing weight
      }
    };

    const blueprint = await decisionEngine.processDecision(incompleteProduct, 'mock');

    expect(blueprint.decision).toBe('need_info');
    expect(blueprint.missing_details[0]).toContain('peso del empaque');
  });

  it('should persist AI logs into ai_requests_log after prompt generation', async () => {
    await db('ai_requests_log').del();
    await db('ai_cache').del();

    const blueprint = await decisionEngine.processDecision(sampleProduct, 'mock');

    const logs = await db('ai_requests_log').select('*');
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].provider).toBe('mock');
    expect(logs[0].prompt_template).toBe('analyzer.md');
    expect(parseFloat(logs[0].cost_usd)).toBeGreaterThan(0);
  });

  it('should automatically compute and persist launch blueprint on ProductService.create', async () => {
    const uniqueSlug = 'smart-projector-ultra-max-' + Date.now();
    const newProductData = {
      store_id: 1,
      name: 'Smart Projector Ultra Max',
      slug: uniqueSlug,
      price: 180000,
      stock: 50,
      status: 'active'
    };

    // Clear previous jobs to guarantee processing of this specific product's blueprinting
    await db('jobs').del();

    const product = await productService.create(newProductData);
    
    // Find the exact enqueued job for this product (with retry polling for async event bus ticks)
    let job;
    for (let attempts = 0; attempts < 10; attempts++) {
      job = await db('jobs')
        .where({ type: 'process_launch_blueprint', status: 'pending' })
        .orderBy('created_at', 'desc')
        .first();
      if (job) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
      
    expect(job).toBeDefined();
    
    // Synchronously process the specific enqueued job
    await processNextJob(job.id);
    
    // Fetch product from DB to verify persistence of launch_blueprint
    const persisted = await db('products').where({ id: product.id }).first();
    
    expect(persisted.launch_blueprint).toBeDefined();
    expect(persisted.launch_blueprint.decision).toBe('launch');
    expect(persisted.launch_blueprint.commerce_confidence_scores.total).toBe(81);
  });
});
