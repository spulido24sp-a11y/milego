import { describe, it, expect } from 'vitest';
import { ScoringEngine }    from '../brain/scoring/scoring-engine.js';
import { ReasoningEngine }  from '../brain/reasoning/reasoning-engine.js';
import { scoreViabilidad }  from '../brain/scoring/dimensions/viabilidad.js';
import { scoreLogistica }   from '../brain/scoring/dimensions/logistica.js';
import { scoreCalidadDatos } from '../brain/scoring/dimensions/calidad-datos.js';
import { scoreSeo }         from '../brain/scoring/dimensions/seo.js';

const scoring  = new ScoringEngine();
const reasoning = new ReasoningEngine();

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
const product = (overrides = {}) => ({
  name: 'Auriculares Bluetooth X9 con cancelación de ruido premium',
  description: 'Auriculares inalámbricos con hasta 30 horas de batería, audio de alta definición y micrófono integrado. Perfectos para trabajar desde casa. Garantía de 1 año. Envío gratis con pago contra entrega en Colombia.',
  images: [{ url: 'img1.jpg' }, { url: 'img2.jpg' }, { url: 'img3.jpg' }],
  weight_kg: 0.3,
  supplier_info: {
    wholesale_price: 18000,
    suggested_retail_price: 42000
  },
  launch_blueprint: { offer: { type: 'combo_x2' } },
  ...overrides
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Dimension — Viabilidad
// ─────────────────────────────────────────────────────────────────────────
describe('Scoring — Viabilidad dimension', () => {
  it('should score above 70 for healthy margin + ROAS', () => {
    const { score } = scoreViabilidad({ marginPct: 57, expectedRoas: 2.5 });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('should score below 50 for negative ROAS and low margin', () => {
    const { score } = scoreViabilidad({ marginPct: 10, expectedRoas: 0.8 });
    expect(score).toBeLessThan(50);
  });

  it('should cap at 100', () => {
    const { score } = scoreViabilidad({ marginPct: 80, expectedRoas: 5 });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should produce an explanation for low scores', () => {
    const { explanation } = scoreViabilidad({ marginPct: 10, expectedRoas: 0.5 });
    expect(explanation).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Dimension — Logística
// ─────────────────────────────────────────────────────────────────────────
describe('Scoring — Logística dimension', () => {
  it('should score 100 for weight_optimal', () => {
    const { score } = scoreLogistica({ weightKg: 0.3, facts: ['weight_optimal'] });
    expect(score).toBe(100);
  });

  it('should score 80 for weight_acceptable', () => {
    const { score } = scoreLogistica({ weightKg: 1.8, facts: ['weight_acceptable'] });
    expect(score).toBe(80);
  });

  it('should score 20 for weight_critical', () => {
    const { score } = scoreLogistica({ weightKg: 8, facts: ['weight_critical'] });
    expect(score).toBe(20);
  });

  it('should deduct 15 points for fragile_product', () => {
    const { score } = scoreLogistica({ weightKg: 0.5, facts: ['weight_optimal', 'fragile_product'] });
    expect(score).toBe(85);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Dimension — Calidad de Datos
// ─────────────────────────────────────────────────────────────────────────
describe('Scoring — Calidad de datos dimension', () => {
  it('should score 100 for perfect data', () => {
    const { score } = scoreCalidadDatos({ qualityScore: 100, imageCount: 5, descLength: 200, facts: ['name_ok', 'description_ok', 'images_ok', 'price_present'] });
    expect(score).toBe(100);
  });

  it('should score 0 for missing everything', () => {
    const { score } = scoreCalidadDatos({ qualityScore: 0, imageCount: 0, descLength: 0, facts: ['missing_name', 'no_images', 'missing_description', 'missing_price'] });
    expect(score).toBe(0);
  });

  it('should produce an explanation when images are low', () => {
    const { explanation } = scoreCalidadDatos({ qualityScore: 70, imageCount: 1, descLength: 120, facts: ['name_ok', 'description_ok', 'low_image_count', 'price_present'] });
    expect(explanation).toContain('imagen');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Dimension — SEO
// ─────────────────────────────────────────────────────────────────────────
describe('Scoring — SEO dimension', () => {
  it('should score higher for products with keywords and long description', () => {
    const good = product(); // has 'envío gratis' and 'contra entrega' and 'garantía'
    const { score } = scoreSeo(good);
    expect(score).toBeGreaterThan(60);
  });

  it('should score lower for products with no keywords and short description', () => {
    const bad = product({ name: 'X9', description: 'Producto.' });
    const { score } = scoreSeo(bad);
    expect(score).toBeLessThan(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. ScoringEngine — Full pipeline
// ─────────────────────────────────────────────────────────────────────────
describe('ScoringEngine — Full pipeline', () => {
  it('should return all required dimension scores', () => {
    const r = reasoning.reason(product());
    const s = scoring.score(product(), r);
    expect(s.scores).toHaveProperty('viabilidad');
    expect(s.scores).toHaveProperty('logistica');
    expect(s.scores).toHaveProperty('calidad_datos');
    expect(s.scores).toHaveProperty('seo');
    expect(s.scores).toHaveProperty('oferta');
  });

  it('should produce a confidence between 0 and 100', () => {
    const r = reasoning.reason(product());
    const s = scoring.score(product(), r);
    expect(s.confidence).toBeGreaterThanOrEqual(0);
    expect(s.confidence).toBeLessThanOrEqual(100);
  });

  it('should assign A/B/C/D grade correctly', () => {
    const r = reasoning.reason(product());
    const s = scoring.score(product(), r);
    expect(['A+', 'A', 'B+', 'B', 'C', 'D']).toContain(s.grade);
  });

  it('should mark isLaunchReady true for a healthy product', () => {
    // Use a product with clearly healthy economics: cost=5k, retail=40k, margin=87.5%
    const p = product({ supplier_info: { wholesale_price: 5000, suggested_retail_price: 40000 } });
    const r = reasoning.reason(p);
    const s = scoring.score(p, r);
    expect(r.recommendation).not.toBe('BLOCK');
    expect(s.confidence).toBeGreaterThanOrEqual(60);
    expect(s.isLaunchReady).toBe(true);
  });

  it('should mark isLaunchReady false for a blocked product', () => {
    const bad = product({ images: [] });
    const r = reasoning.reason(bad);
    const s = scoring.score(bad, r);
    expect(s.isLaunchReady).toBe(false);
    expect(s.blockers.length).toBeGreaterThan(0);
  });

  it('should build a non-empty LLM context string for Gemini enrichment', () => {
    const p = product();
    const r = reasoning.reason(p);
    const s = scoring.score(p, r);
    const ctx = scoring.buildLLMContext(p, r, s);
    expect(ctx).toContain('[Producto]');
    expect(ctx).toContain('[Análisis LIAM]');
    expect(ctx).toContain('[Scoring]');
  });
});
