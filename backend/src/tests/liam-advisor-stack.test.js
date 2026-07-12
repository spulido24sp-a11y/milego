import { describe, it, expect } from 'vitest';
import { ExplainabilityEngine }  from '../brain/explainability/explainability-engine.js';
import { RecommendationEngine }  from '../brain/recommendations/recommendation-engine.js';
import { ScenarioSimulator }     from '../brain/simulator/scenario-simulator.js';
import { ReasoningEngine }       from '../brain/reasoning/reasoning-engine.js';
import { ScoringEngine }         from '../brain/scoring/scoring-engine.js';

const reasoning = new ReasoningEngine();
const scoring   = new ScoringEngine();
const explain   = new ExplainabilityEngine();
const recommend = new RecommendationEngine();
const simulator = new ScenarioSimulator();

// ─────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────
const goodProduct = (overrides = {}) => ({
  name: 'Auriculares Bluetooth X9 cancelación ruido premium envío gratis',
  description: 'Auriculares inalámbricos con hasta 30 horas de batería y micrófono integrado. Perfectos para trabajo y entretenimiento. Garantía 1 año. Contra entrega en todo Colombia.',
  images: [{ url: 'img1.jpg' }, { url: 'img2.jpg' }, { url: 'img3.jpg' }],
  weight_kg: 0.3,
  supplier_info: { wholesale_price: 8000, suggested_retail_price: 45000 },
  launch_blueprint: { offer: { type: 'combo_x2' } },
  ...overrides
});

const analyze = (product) => {
  const r = reasoning.reason(product);
  const s = scoring.score(product, r);
  return { r, s };
};

// ─────────────────────────────────────────────────────────────────────────
// 1. Reasoning Engine v2 contract
// ─────────────────────────────────────────────────────────────────────────
describe('ReasoningEngine v2 — structured contract', () => {
  it('should return facts as an object (not array)', () => {
    const { r } = analyze(goodProduct());
    expect(typeof r.facts).toBe('object');
    expect(Array.isArray(r.facts)).toBe(false);
    expect(r.facts).toHaveProperty('marginPct');
    expect(r.facts).toHaveProperty('expectedRoas');
    expect(r.facts).toHaveProperty('weightKg');
  });

  it('should return findings as array of { code, severity, detail }', () => {
    const { r } = analyze(goodProduct());
    expect(Array.isArray(r.findings)).toBe(true);
    for (const f of r.findings) {
      expect(f).toHaveProperty('code');
      expect(f).toHaveProperty('severity');
      expect(f).toHaveProperty('detail');
    }
  });

  it('should return recommendations as array of { action, detail, expectedConfidenceGain }', () => {
    const { r } = analyze(goodProduct());
    expect(Array.isArray(r.recommendations)).toBe(true);
    for (const rec of r.recommendations) {
      expect(rec).toHaveProperty('action');
      expect(rec).toHaveProperty('detail');
      expect(rec).toHaveProperty('expectedConfidenceGain');
    }
  });

  it('should sort recommendations by expectedConfidenceGain descending', () => {
    const { r } = analyze(goodProduct({ supplier_info: { wholesale_price: 18000, suggested_retail_price: 25000 } }));
    for (let i = 0; i < r.recommendations.length - 1; i++) {
      expect(r.recommendations[i].expectedConfidenceGain).toBeGreaterThanOrEqual(r.recommendations[i + 1].expectedConfidenceGain);
    }
  });

  it('should BLOCK product with ROAS_NONVIABLE blocker code', () => {
    const bad = goodProduct({ supplier_info: { wholesale_price: 40000, suggested_retail_price: 45000 } });
    const { r } = analyze(bad);
    expect(r.recommendation).toBe('BLOCK');
    expect(r.blockers).toContain('ROAS_NONVIABLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Explainability Engine
// ─────────────────────────────────────────────────────────────────────────
describe('ExplainabilityEngine', () => {
  it('should return all required fields', () => {
    const { r, s } = analyze(goodProduct());
    const report = explain.explain(s, r);
    expect(report).toHaveProperty('confidence');
    expect(report).toHaveProperty('grade');
    expect(report).toHaveProperty('executiveSummary');
    expect(report).toHaveProperty('scoreBreakdown');
    expect(report).toHaveProperty('dimensionExplanations');
    expect(report).toHaveProperty('topActions');
    expect(report).toHaveProperty('isLaunchReady');
  });

  it('should produce dimension explanations for all 5 dimensions', () => {
    const { r, s } = analyze(goodProduct());
    const report = explain.explain(s, r);
    const dims = Object.keys(report.dimensionExplanations);
    expect(dims).toContain('viabilidad');
    expect(dims).toContain('logistica');
    expect(dims).toContain('calidad_datos');
    expect(dims).toContain('seo');
    expect(dims).toContain('oferta');
  });

  it('scoreBreakdown contributions should sum close to confidence', () => {
    const { r, s } = analyze(goodProduct());
    const report = explain.explain(s, r);
    const total = Object.values(report.scoreBreakdown)
      .filter(d => typeof d === 'object' && d.contribution !== undefined)
      .reduce((acc, d) => acc + d.contribution, 0);
    expect(Math.abs(total - report.confidence)).toBeLessThanOrEqual(5); // rounding tolerance
  });

  it('should emit a BLOCK summary for a critically bad product', () => {
    const bad = goodProduct({ images: [], supplier_info: { wholesale_price: 40000, suggested_retail_price: 45000 } });
    const { r, s } = analyze(bad);
    const report = explain.explain(s, r);
    expect(report.executiveSummary).toMatch(/bloqueador|crítico|bloqueo|impiden|BLOCK/i);
  });

  it('should produce topActions with gain for an imperfect product', () => {
    const { r, s } = analyze(goodProduct({ images: [{ url: 'x.jpg' }] }));
    const report = explain.explain(s, r);
    expect(Array.isArray(report.topActions)).toBe(true);
    expect(report.topActions.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Recommendation Engine
// ─────────────────────────────────────────────────────────────────────────
describe('RecommendationEngine', () => {
  it('should return currentConfidence and projectedConfidence', () => {
    const { r, s } = analyze(goodProduct({ supplier_info: { wholesale_price: 8000, suggested_retail_price: 45000 }, images: [{ url: 'x.jpg' }] }));
    const result = recommend.recommend(goodProduct({ supplier_info: { wholesale_price: 8000, suggested_retail_price: 45000 }, images: [{ url: 'x.jpg' }] }), r, s);
    expect(result.currentConfidence).toBeGreaterThanOrEqual(0);
    expect(result.projectedConfidence).toBeGreaterThanOrEqual(result.currentConfidence);
  });

  it('should return at most 5 recommendations', () => {
    const p = goodProduct({ images: [{ url: 'x.jpg' }], supplier_info: { wholesale_price: 30000, suggested_retail_price: 45000 } });
    const { r, s } = analyze(p);
    const result = recommend.recommend(p, r, s);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
  });

  it('each recommendation should have an action and label', () => {
    const p = goodProduct({ images: [{ url: 'x.jpg' }], supplier_info: { wholesale_price: 8000, suggested_retail_price: 45000 } });
    const { r, s } = analyze(p);
    const result = recommend.recommend(p, r, s);
    for (const rec of result.recommendations) {
      expect(rec).toHaveProperty('action');
      expect(rec).toHaveProperty('label');
      expect(typeof rec.expectedConfidenceGain).toBe('number');
    }
  });

  it('should suggest bundle_x2 when ROAS is marginal', () => {
    const p = goodProduct({ supplier_info: { wholesale_price: 25000, suggested_retail_price: 45000 } });
    const { r, s } = analyze(p);
    const result = recommend.recommend(p, r, s);
    // ROAS = 45000 / (25000 + 13500) = 1.17 → nonviable, rule should suggest bundle
    const hasBundle = result.recommendations.some(rec => rec.action.includes('bundle'));
    expect(hasBundle).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Scenario Simulator
// ─────────────────────────────────────────────────────────────────────────
describe('ScenarioSimulator', () => {
  it('should increase retail and roas for a price scenario', () => {
    const p = goodProduct();
    const result = simulator.simulate(p, { type: 'price', value: 55000 });
    expect(result.after.retail).toBe(55000);
    expect(result.after.roas).toBeGreaterThan(result.before.roas);
    expect(result.delta.retailDiff).toBe(55000 - 45000);
  });

  it('should double cost and retail for bundle x2', () => {
    const p = goodProduct();
    const result = simulator.simulate(p, { type: 'bundle', quantity: 2 });
    expect(result.after.retail).toBe(90000);   // 45000 * 2
    // ROAS of bundle is >= base (ad spend scales but at lower %)
    expect(result.after.roas).toBeGreaterThanOrEqual(result.before.roas);
    expect(result.delta.retailDiff).toBe(45000);
  });

  it('bundle x3 should have retail = 3x base', () => {
    const p = goodProduct();
    const result = simulator.simulate(p, { type: 'bundle', quantity: 3 });
    expect(result.after.retail).toBe(45000 * 3);
    expect(result.after.roas).toBeGreaterThanOrEqual(result.before.roas);
  });

  it('free_shipping scenario should increase retail', () => {
    const p = goodProduct();
    const result = simulator.simulate(p, { type: 'free_shipping', shippingCost: 8000 });
    expect(result.after.retail).toBe(45000 + 8000);
  });

  it('simulateAll should return results sorted by confidence desc', () => {
    const p = goodProduct();
    const results = simulator.simulateAll(p, [
      { type: 'price', value: 42000 },
      { type: 'price', value: 55000 },
      { type: 'bundle', quantity: 2 }
    ]);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].scoring.confidence).toBeGreaterThanOrEqual(results[i + 1].scoring.confidence);
    }
  });

  it('optimizeBest should return a best result with scoring', () => {
    const p = goodProduct();
    const { best } = simulator.optimizeBest(p);
    expect(best).not.toBeNull();
    expect(best.scoring).toHaveProperty('confidence');
    expect(best.scoring).toHaveProperty('grade');
  });

  it('simulation result should include before/after/delta snapshots', () => {
    const p = goodProduct();
    const result = simulator.simulate(p, { type: 'bundle', quantity: 2 });
    expect(result).toHaveProperty('before');
    expect(result).toHaveProperty('after');
    expect(result).toHaveProperty('delta');
    expect(result.before.retail).toBe(45000);
    expect(result.delta.retailDiff).toBe(45000);
  });
});
