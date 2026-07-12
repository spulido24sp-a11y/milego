import { describe, it, expect } from 'vitest';
import { ProductAnalyzer } from '../brain/sales-engine/analyzer.js';
import { CopyGenerator } from '../brain/sales-engine/copy-generator.js';
import { BlockSelector } from '../brain/sales-engine/block-selector.js';
import { BlueprintGenerator } from '../brain/sales-engine/blueprint-generator.js';

describe('ProductAnalyzer', () => {
  const analyzer = new ProductAnalyzer();

  it('should detect health archetype from product name', () => {
    const product = { name: 'Colágeno Natural', description: 'Suplemento para la salud y bienestar', price: 65000, cost_price: 25000 };
    const result = analyzer.analyze(product);
    expect(result.archetype).toBe('health');
    expect(result.audience.length).toBeGreaterThanOrEqual(1);
    expect(result.painPoints.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect tech archetype from description', () => {
    const product = { name: 'Smart Watch Pro', description: 'Tecnología bluetooth con cargador inteligente', price: 120000, cost_price: 50000 };
    const result = analyzer.analyze(product);
    expect(result.archetype).toBe('tech');
  });

  it('should fallback to general when no keywords match', () => {
    const product = { name: 'Caja Sorpresa', description: 'Un producto único para ti', price: 35000, cost_price: 15000 };
    const result = analyzer.analyze(product);
    expect(result.archetype).toBe('general');
  });

  it('should classify impulse price tier correctly', () => {
    const product = { name: 'Accesorio', description: 'Pequeño accesorio', price: 15000, cost_price: 5000 };
    const result = analyzer.analyze(product);
    expect(result.priceTier).toBe('impulse');
  });

  it('should classify premium price tier correctly', () => {
    const product = { name: 'Producto Premium', description: 'Artículo de alta gama', price: 200000, cost_price: 80000 };
    const result = analyzer.analyze(product);
    expect(result.priceTier).toBe('premium');
  });

  it('should calculate margin correctly', () => {
    const product = { name: 'Test', description: 'Test', price: 100000, cost_price: 40000 };
    const result = analyzer.analyze(product);
    expect(result.margin).toBe(60);
  });

  it('should return margin 0 when cost_price is 0', () => {
    const product = { name: 'Test', description: 'Test', price: 100000, cost_price: 0 };
    const result = analyzer.analyze(product);
    expect(result.margin).toBe(0);
  });
});

describe('CopyGenerator', () => {
  const copyGen = new CopyGenerator();

  it('should generate hooks for health archetype with product name', () => {
    const analysis = { archetype: 'health' };
    const product = { name: 'Colágeno Natural' };
    const hooks = copyGen.generateHooks(analysis, product);
    expect(hooks.headline).toContain('Colágeno Natural');
    expect(hooks.subheadline).toBeTruthy();
    expect(hooks.cta).toBeTruthy();
  });

  it('should generate hooks for general archetype', () => {
    const analysis = { archetype: 'general' };
    const product = { name: 'Caja Sorpresa' };
    const hooks = copyGen.generateHooks(analysis, product);
    expect(hooks.headline).toContain('Caja Sorpresa');
    expect(hooks.cta).toBe('Comprar ahora');
  });

  it('should calculate bundle pricing based on margin', () => {
    const analysis = { margin: 60, archetype: 'home' };
    const product = { name: 'Organizador', price: 79900, cost_price: 30000 };
    const pricing = copyGen.generatePricing(analysis, product);
    expect(pricing.price_unit).toBe(79900);
    expect(pricing.bundle_x2_price).toBeLessThan(pricing.price_unit * 2);
    expect(pricing.has_free_shipping).toBe(true);
  });

  it('should generate SEO metadata with slug', () => {
    const analysis = { archetype: 'home', audience: ['Dueños de casa'], painPoints: ['Espacio desordenado'], margin: 50 };
    const product = { name: 'Organizador de Clóset' };
    const seo = copyGen.generateSeo(analysis, product);
    expect(seo.title).toContain('Organizador de Clóset');
    expect(seo.slug).toBe('organizador-de-closet');
    expect(seo.keywords.length).toBeGreaterThanOrEqual(3);
  });

  it('should generate FAQ array with questions and answers', () => {
    const analysis = { archetype: 'home' };
    const faqs = copyGen.generateFaqs(analysis);
    expect(faqs.length).toBeGreaterThanOrEqual(4);
    expect(faqs[0].question).toBeTruthy();
    expect(faqs[0].answer).toBeTruthy();
  });

  it('should include archetype-specific FAQs for health', () => {
    const faqs = copyGen.generateFaqs({ archetype: 'health', name: 'Omega 3' });
    expect(faqs.some(f => f.question.includes('efectos secundarios'))).toBe(true);
  });

  it('should include archetype-specific FAQs for beauty', () => {
    const faqs = copyGen.generateFaqs({ archetype: 'beauty', name: 'Crema Facial' });
    expect(faqs.some(f => f.question.includes('todo tipo de piel'))).toBe(true);
  });
});

describe('BlockSelector', () => {
  const selector = new BlockSelector();

  it('should return 10 blocks for health archetype', () => {
    const blocks = selector.selectBlocks('health');
    expect(blocks).toHaveLength(10);
    expect(blocks[0]).toBe('hero');
    expect(blocks).toContain('enemy');
    expect(blocks).toContain('transformation');
  });

  it('should return 9 blocks for beauty archetype (no enemy)', () => {
    const blocks = selector.selectBlocks('beauty');
    expect(blocks).toHaveLength(9);
    expect(blocks).not.toContain('enemy');
    expect(blocks).toContain('transformation');
  });

  it('should return blocks for home archetype', () => {
    const blocks = selector.selectBlocks('home');
    expect(blocks.length).toBeGreaterThanOrEqual(8);
    expect(blocks).not.toContain('enemy');
  });

  it('should return minimal blocks for tech archetype', () => {
    const blocks = selector.selectBlocks('tech');
    expect(blocks).toHaveLength(7);
    expect(blocks).not.toContain('problem');
  });

  it('should return general blocks for unknown archetype', () => {
    const blocks = selector.selectBlocks('unknown');
    expect(blocks).toEqual(['hero', 'benefits', 'testimonials', 'offer', 'guarantee', 'faq', 'cta']);
  });
});

describe('BlueprintGenerator', () => {
  const generator = new BlueprintGenerator();

  it('should generate a complete blueprint for a health product', () => {
    const product = { id: 1, name: 'Colágeno Natural', description: 'Suplemento para la salud y bienestar', price: 79000, cost_price: 25000, stock: 100, images: [{ url: 'img.jpg' }] };
    const { blueprint, analysis } = generator.generate(product);
    expect(blueprint.customer.archetype).toBe('health');
    expect(blueprint.offer.price_unit).toBe(79000);
    expect(blueprint.marketing.hooks).toHaveLength(3);
    expect(blueprint.content.benefits.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.content.faq.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.seo.slug).toBeTruthy();
    expect(blueprint.blocks.length).toBeGreaterThanOrEqual(6);
    expect(blueprint.confidence).toBeGreaterThanOrEqual(50);
  });

  it('should generate lower bundle discounts for low margin products', () => {
    const product = { id: 2, name: 'Gadget', description: 'Accesorio tecnológico', price: 50000, cost_price: 40000, stock: 10 };
    const { blueprint } = generator.generate(product);
    expect(blueprint.offer.bundle_x2_price).toBeGreaterThan(0);
    expect(blueprint.offer.price_cost).toBe(40000);
  });

  it('should include all content sections in blueprint', () => {
    const product = { id: 3, name: 'Organizador', description: 'Organizador de hogar', price: 69900, cost_price: 20000, stock: 50, images: [{ url: 'img.jpg' }] };
    const { blueprint } = generator.generate(product);
    expect(blueprint.customer).toHaveProperty('archetype');
    expect(blueprint.customer).toHaveProperty('audience');
    expect(blueprint.customer).toHaveProperty('priceTier');
    expect(blueprint.customer).toHaveProperty('pain_points');
    expect(blueprint.customer).toHaveProperty('levers');
    expect(blueprint.offer).toHaveProperty('price_unit');
    expect(blueprint.offer).toHaveProperty('bundle_x2_price');
    expect(blueprint.offer).toHaveProperty('bundle_x3_price');
    expect(blueprint.offer).toHaveProperty('has_free_shipping');
    expect(blueprint.content).toHaveProperty('benefits');
    expect(blueprint.content).toHaveProperty('faq');
    expect(blueprint.content).toHaveProperty('features');
    expect(blueprint.seo).toHaveProperty('title');
    expect(blueprint.seo).toHaveProperty('description');
    expect(blueprint.seo).toHaveProperty('keywords');
    expect(blueprint.seo).toHaveProperty('slug');
  });

  it('should generate different blueprints for different products', () => {
    const product1 = { id: 4, name: 'Crema Facial', description: 'Cosmético para el cuidado de la piel', price: 45000, cost_price: 15000, stock: 30 };
    const product2 = { id: 5, name: 'Audífonos Bluetooth', description: 'Tecnología inalámbrica', price: 89000, cost_price: 35000, stock: 20 };

    const { blueprint: bp1 } = generator.generate(product1);
    const { blueprint: bp2 } = generator.generate(product2);

    expect(bp1.customer.archetype).toBe('beauty');
    expect(bp2.customer.archetype).toBe('tech');
    expect(bp1.blocks).not.toEqual(bp2.blocks);
  });

  it('should calculate confidence based on product quality signals', () => {
    const good = { id: 6, name: 'Premium', description: 'A'.repeat(100), price: 150000, cost_price: 50000, stock: 200, images: [{ url: 'a.jpg' }, { url: 'b.jpg' }] };
    const poor = { id: 7, name: 'Basico', description: '', price: 10000, cost_price: 8000, stock: 1, images: [] };

    const { blueprint: bpGood } = generator.generate(good);
    const { blueprint: bpPoor } = generator.generate(poor);

    expect(bpGood.confidence).toBeGreaterThan(bpPoor.confidence);
  });
});
