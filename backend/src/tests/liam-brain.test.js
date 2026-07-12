import { describe, it, expect } from 'vitest';
import { BrainService } from '../brain/brain.service.js';
import { ProviderRouter } from '../brain/provider-router.js';
import { ProductAnalyzer } from '../brain/modules/analyzer/index.js';
import { OfferEngine } from '../brain/modules/offer/index.js';
import { SeoEngine } from '../brain/modules/seo/index.js';

const brain = new BrainService();
const router = new ProviderRouter();
const analyzer = new ProductAnalyzer();
const offerEngine = new OfferEngine();
const seoEngine = new SeoEngine();

describe('LIAM Brain Execution Tests', () => {

  const sampleProduct = {
    name: 'Smart Lamp Pro',
    sku_base: 'LAMP-SMART-01',
    description: 'Iluminacion RGB inteligente para sala.',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    supplier_info: {
      wholesale_price: 25000,
      suggested_retail_price: 69900,
      stock_available: 150,
      weight: 1.5
    }
  };

  it('should routing and select mock provider successfully', async () => {
    const rawRes = await router.generateText('hello', 'mock');
    const parsed = JSON.parse(rawRes);
    expect(parsed.productScore).toBeDefined();
  });

  it('should fail routing if invalid provider selected', async () => {
    await expect(router.generateText('hello', 'nonexistent')).rejects.toThrow('Proveedor de IA no soportado en enrutamiento');
  });

  it('should analyze product and return structured analysis successfully using Mock Provider', async () => {
    const analysis = await brain.analyzeProduct(sampleProduct, 'mock');
    
    expect(analysis.commerce_confidence_scores.product).toBe(100);
    expect(analysis.commerce_confidence_scores.market).toBe(78);
    expect(analysis.offer.bundle).toBe('combo_x2');
    expect(analysis.seo.slug).toBe('smart-lamp-pro-rgb');
    expect(analysis.seo.keywords).toContain('lampara inteligente');
  });

  it('should block analysis if business rules are broken', async () => {
    const badProduct = {
      name: 'Regalo Inviable',
      supplier_info: {
        wholesale_price: 30000,
        suggested_retail_price: 15000 // Under minimum margin of 40%
      }
    };

    await expect(brain.analyzeProduct(badProduct, 'mock')).rejects.toThrow('Regla comercial rota');
  });

  it('should calculate product score correctly inside analyzer module', () => {
    const score = analyzer.calculateProductScore(sampleProduct);
    expect(score).toBe(90); // Margin >= 60 (25 pts), stock > 100 (15 pts), base score (50 pts) = 90
    // (69900 - 25000) / 69900 = 64.2% margin. Margin >= 60 is true (adds 25).
    // stock is 150. stock > 100 is true (adds 15).
    // Total: 50 + 25 + 15 = 90. Analyzer calculates 90!
  });

  it('should suggest combo_x2 strategy for high margin items inside offer module', () => {
    const strategy = offerEngine.suggestOfferStrategy(sampleProduct);
    expect(strategy.recommendedOffer).toBe('combo_x2');
  });

  it('should generate localized slug and SEO keywords inside SEO module', () => {
    const seo = seoEngine.generateSeoMetadata(sampleProduct);
    expect(seo.slug).toBe('smart-lamp-pro');
    expect(seo.title).toContain('Smart Lamp Pro');
  });
});
