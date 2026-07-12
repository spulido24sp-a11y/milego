import { describe, it, expect } from 'vitest';
import { LaunchEngine } from '../launch-engine/index.js';

const engine = new LaunchEngine();

describe('LIAM Launch Engine Pipeline Tests', () => {
  
  it('should process Dropi raw payload correctly into standardized MIleGo internal contract', async () => {
    const rawDropi = {
      id: 99482,
      nombre: 'Smart Projector Pro',
      sku: 'PROJ-SMART-99',
      descripcion: 'Proyector con resolucion nativa 1080p y WiFi integrado.',
      costo: 120000,
      precio_sugerido: 299900,
      stock: 450,
      bodega: 'Bodega Principal Bogota',
      peso: 1.5,
      imagenes: [
        'https://example.com/proj1.jpg',
        'https://example.com/proj2.jpg',
        'https://example.com/proj3.jpg'
      ],
      variantes: [
        { nombre: 'Negro', sku: 'PROJ-SMART-99-B', stock: 250 },
        { nombre: 'Blanco', sku: 'PROJ-SMART-99-W', stock: 200 }
      ]
    };

    const result = await engine.process('dropi', rawDropi);

    // 1. Normalization Assertions
    expect(result.name).toBe('Smart Projector Pro');
    expect(result.sku_base).toBe('PROJ-SMART-99');
    expect(result.slug).toBe('smart-projector-pro');
    expect(result.supplier_info.wholesale_price).toBe(120000);
    expect(result.supplier_info.suggested_retail_price).toBe(299900);
    expect(result.images).toHaveLength(3);
    expect(result.images[0].is_primary).toBe(true);

    // 2. Triple DNA Assertions
    expect(result.product_dna.opportunity_score).toBe(92);
    expect(result.product_dna.insights.core_problem_solved).toContain('Smart Projector Pro');
    expect(result.market_dna.active_ads_count).toBe(14);
    expect(result.customer_dna.purchase_impulse).toBe('high');

    // 3. Offer Structure Assertions
    expect(result.offer_structure.combo_2x.price).toBe(509830); // 299900 * 2 * 0.85
    expect(result.offer_structure.marketing_kpis.target_cpa).toBe(71960); // (299900 - 120000) * 0.4

    // 4. Brain Integration Assertion
    expect(result.brain_analysis.commerce_confidence_scores.product).toBe(100);
  });

  it('should process Manual UI payload correctly', async () => {
    const rawManual = {
      name: 'Smart Lamp Pro',
      sku: 'LAMP-SMART-01',
      wholesale_price: 25000,
      suggested_retail_price: 69900,
      stock: 100,
      weight: 1.2,
      images: [
        'https://example.com/lamp1.jpg',
        'https://example.com/lamp2.jpg',
        'https://example.com/lamp3.jpg'
      ]
    };

    const result = await engine.process('manual', rawManual);

    expect(result.name).toBe('Smart Lamp Pro');
    expect(result.sku_base).toBe('LAMP-SMART-01');
    expect(result.supplier_info.wholesale_price).toBe(25000);
    expect(result.product_dna.opportunity_score).toBe(92);
  });

  it('should throw validation error if mandatory name is missing', async () => {
    const rawInvalid = {
      nombre: '', // Empty name
      sku: 'SKU-01',
      costo: 10000,
      precio_sugerido: 20000
    };

    await expect(engine.process('dropi', rawInvalid)).rejects.toThrow('Falló la validación del Launch Engine');
  });

  it('should throw validation error if suggested price is lower than cost', async () => {
    const rawInvalid = {
      nombre: 'Regalo',
      sku: 'SKU-01',
      costo: 30000,
      precio_sugerido: 10000 // Price lower than wholesale cost
    };

    await expect(engine.process('dropi', rawInvalid)).rejects.toThrow('El precio sugerido de venta es inferior al costo del proveedor');
  });
});
