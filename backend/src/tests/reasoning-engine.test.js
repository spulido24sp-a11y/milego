/**
 * reasoning-engine.test.js (v2)
 * Tests updated for the new facts/findings/recommendations contract.
 */
import { describe, it, expect } from 'vitest';
import { ReasoningEngine }       from '../brain/reasoning/reasoning-engine.js';
import { evaluateMargin }        from '../brain/reasoning/rules/margin.rule.js';
import { evaluateLogistics }     from '../brain/reasoning/rules/logistics.rule.js';
import { evaluateDataQuality }   from '../brain/reasoning/rules/data-quality.rule.js';
import { evaluateRoas }          from '../brain/reasoning/rules/roas.rule.js';

const engine = new ReasoningEngine();

// ─────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────
const product = (overrides = {}) => ({
  name: 'Auriculares Bluetooth X9 con cancelación de ruido',
  description: 'Auriculares inalámbricos con hasta 30 horas de batería, audio de alta definición y micrófono integrado. Perfectos para trabajar desde casa.',
  images: [{ url: 'img1.jpg' }, { url: 'img2.jpg' }, { url: 'img3.jpg' }],
  weight_kg: 0.3,
  supplier_info: {
    wholesale_price: 5000,
    suggested_retail_price: 40000
  },
  ...overrides
});

const hasCode = (findings, code) => findings.some(f => f.code === code);
const severityOf = (findings, code) => findings.find(f => f.code === code)?.severity;

// ─────────────────────────────────────────────────────────────────────────
// 1. Margin Rule (v2)
// ─────────────────────────────────────────────────────────────────────────
describe('Reasoning — Margin Rule (v2)', () => {
  it('should emit EXCELLENT_MARGIN finding for margin >= 55%', () => {
    // margin = (40000-5000)/40000 = 87.5%
    const { findings, facts } = evaluateMargin(product());
    expect(hasCode(findings, 'EXCELLENT_MARGIN')).toBe(true);
    expect(facts.marginPct).toBeGreaterThan(55);
  });

  it('should emit ACCEPTABLE_MARGIN finding for margin between 40-55%', () => {
    // margin = (40000-22000)/40000 = 45%
    const { findings } = evaluateMargin(product({ supplier_info: { wholesale_price: 22000, suggested_retail_price: 40000 } }));
    expect(hasCode(findings, 'ACCEPTABLE_MARGIN')).toBe(true);
  });

  it('should emit LOW_MARGIN finding and HIGH severity for margin < 40%', () => {
    // margin = (40000-28000)/40000 = 30%
    const { findings } = evaluateMargin(product({ supplier_info: { wholesale_price: 28000, suggested_retail_price: 40000 } }));
    expect(hasCode(findings, 'LOW_MARGIN')).toBe(true);
    expect(severityOf(findings, 'LOW_MARGIN')).toBe('high');
  });

  it('should emit RETAIL_BELOW_COST finding when retail < cost', () => {
    const { findings } = evaluateMargin(product({ supplier_info: { wholesale_price: 50000, suggested_retail_price: 30000 } }));
    expect(hasCode(findings, 'RETAIL_BELOW_COST')).toBe(true);
    expect(severityOf(findings, 'RETAIL_BELOW_COST')).toBe('critical');
  });

  it('should emit MISSING_RETAIL_PRICE when retail is 0', () => {
    const { findings } = evaluateMargin(product({ supplier_info: { wholesale_price: 5000, suggested_retail_price: 0 } }));
    expect(hasCode(findings, 'MISSING_RETAIL_PRICE')).toBe(true);
  });

  it('should produce a recommendation when margin is low', () => {
    const { recommendations } = evaluateMargin(product({ supplier_info: { wholesale_price: 28000, suggested_retail_price: 40000 } }));
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('action');
    expect(recommendations[0]).toHaveProperty('expectedConfidenceGain');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Logistics Rule (v2)
// ─────────────────────────────────────────────────────────────────────────
describe('Reasoning — Logistics Rule (v2)', () => {
  it('should emit WEIGHT_OPTIMAL for <= 1kg', () => {
    const { findings, facts } = evaluateLogistics(product({ weight_kg: 0.5 }));
    expect(hasCode(findings, 'WEIGHT_OPTIMAL')).toBe(true);
    expect(facts.weightKg).toBe(0.5);
  });

  it('should emit WEIGHT_ACCEPTABLE for 1–2.5kg', () => {
    const { findings } = evaluateLogistics(product({ weight_kg: 1.8 }));
    expect(hasCode(findings, 'WEIGHT_ACCEPTABLE')).toBe(true);
  });

  it('should emit WEIGHT_HIGH for 2.5–5kg with medium severity', () => {
    const { findings } = evaluateLogistics(product({ weight_kg: 3.5 }));
    expect(hasCode(findings, 'WEIGHT_HIGH')).toBe(true);
    expect(severityOf(findings, 'WEIGHT_HIGH')).toBe('medium');
  });

  it('should emit WEIGHT_CRITICAL for > 5kg', () => {
    const { findings } = evaluateLogistics(product({ weight_kg: 8 }));
    expect(hasCode(findings, 'WEIGHT_CRITICAL')).toBe(true);
    expect(severityOf(findings, 'WEIGHT_CRITICAL')).toBe('high');
  });

  it('should flag FRAGILE_PRODUCT for glass/cristal products', () => {
    const { findings, facts } = evaluateLogistics(product({ name: 'Espejo decorativo de cristal para baño', weight_kg: 0.8 }));
    expect(hasCode(findings, 'FRAGILE_PRODUCT')).toBe(true);
    expect(facts.isFragile).toBe(true);
  });

  it('should emit WEIGHT_UNKNOWN when weight is 0', () => {
    const { findings } = evaluateLogistics(product({ weight_kg: 0 }));
    expect(hasCode(findings, 'WEIGHT_UNKNOWN')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Data Quality Rule (v2)
// ─────────────────────────────────────────────────────────────────────────
describe('Reasoning — Data Quality Rule (v2)', () => {
  it('should produce a high qualityScore (>= 80) for a well-formed product', () => {
    const { facts, findings } = evaluateDataQuality(product());
    expect(facts.qualityScore).toBeGreaterThanOrEqual(80);
    expect(hasCode(findings, 'NAME_OK')).toBe(true);
    expect(hasCode(findings, 'DESCRIPTION_OK')).toBe(true);
    expect(hasCode(findings, 'IMAGES_OK')).toBe(true);
  });

  it('should penalize NO_IMAGES heavily', () => {
    const { facts, findings } = evaluateDataQuality(product({ images: [] }));
    expect(facts.qualityScore).toBeLessThan(75);
    expect(hasCode(findings, 'NO_IMAGES')).toBe(true);
    expect(severityOf(findings, 'NO_IMAGES')).toBe('critical');
  });

  it('should emit MISSING_DESCRIPTION when description is empty', () => {
    const { findings } = evaluateDataQuality(product({ description: '' }));
    expect(hasCode(findings, 'MISSING_DESCRIPTION')).toBe(true);
    expect(severityOf(findings, 'MISSING_DESCRIPTION')).toBe('high');
  });

  it('should emit SHORT_DESCRIPTION for very short descriptions', () => {
    const { findings } = evaluateDataQuality(product({ description: 'Producto.' }));
    expect(hasCode(findings, 'SHORT_DESCRIPTION')).toBe(true);
  });

  it('should strip HTML before evaluating description length', () => {
    const htmlDesc = '<p>' + 'Buena descripción de auric '.repeat(5) + '</p>';
    const { findings } = evaluateDataQuality(product({ description: htmlDesc }));
    expect(hasCode(findings, 'DESCRIPTION_OK')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. ROAS Rule (v2)
// ─────────────────────────────────────────────────────────────────────────
describe('Reasoning — ROAS Rule (v2)', () => {
  it('should compute ROAS_EXCELLENT for very high-margin products', () => {
    // cost=1k, retail=42k: total=1k+12.6k=13.6k, roas=3.09 → excellent
    const { findings, facts } = evaluateRoas(product({ supplier_info: { wholesale_price: 1000, suggested_retail_price: 42000 } }));
    expect(facts.expectedRoas).toBeGreaterThan(3);
    expect(hasCode(findings, 'ROAS_EXCELLENT')).toBe(true);
  });

  it('should emit ROAS_GOOD for ROAS between 2x and 3x', () => {
    // cost=8k, retail=45k: total=8k+13.5k=21.5k, roas=2.09 → good
    const { findings } = evaluateRoas(product({ supplier_info: { wholesale_price: 8000, suggested_retail_price: 45000 } }));
    expect(hasCode(findings, 'ROAS_GOOD')).toBe(true);
  });

  it('should emit ROAS_NONVIABLE for ROAS < 1.5x', () => {
    // cost=35k, retail=42k: total=35k+12.6k=47.6k, roas=0.88 → nonviable
    const { findings } = evaluateRoas(product({ supplier_info: { wholesale_price: 35000, suggested_retail_price: 42000 } }));
    expect(hasCode(findings, 'ROAS_NONVIABLE')).toBe(true);
    expect(severityOf(findings, 'ROAS_NONVIABLE')).toBe('critical');
  });

  it('should emit ROAS_UNCOMPUTABLE when price is 0', () => {
    const { findings } = evaluateRoas(product({ supplier_info: { wholesale_price: 0, suggested_retail_price: 0 } }));
    expect(hasCode(findings, 'ROAS_UNCOMPUTABLE')).toBe(true);
  });

  it('should produce at least one recommendation when ROAS is nonviable', () => {
    const { recommendations } = evaluateRoas(product({ supplier_info: { wholesale_price: 35000, suggested_retail_price: 42000 } }));
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.expectedRoasGain)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. ReasoningEngine — Full orchestration (v2)
// ─────────────────────────────────────────────────────────────────────────
describe('ReasoningEngine — Full orchestration (v2)', () => {
  it('should recommend PROCEED or PROCEED_WITH_CAUTION for a healthy product', () => {
    const result = engine.reason(product());
    expect(result.recommendation).not.toBe('BLOCK');
    expect(result.requiresLLM).toBe(true);
  });

  it('should BLOCK a product with RETAIL_BELOW_COST blocker', () => {
    const bad = product({ supplier_info: { wholesale_price: 50000, suggested_retail_price: 30000 } });
    const result = engine.reason(bad);
    expect(result.recommendation).toBe('BLOCK');
    expect(result.requiresLLM).toBe(false);
    expect(result.blockers).toContain('RETAIL_BELOW_COST');
  });

  it('should BLOCK a product with NO_IMAGES blocker', () => {
    const bad = product({ images: [] });
    const result = engine.reason(bad);
    expect(result.recommendation).toBe('BLOCK');
    expect(result.blockers).toContain('NO_IMAGES');
  });

  it('facts should be an object with numeric properties (not an array)', () => {
    const result = engine.reason(product());
    expect(typeof result.facts).toBe('object');
    expect(Array.isArray(result.facts)).toBe(false);
    expect(typeof result.facts.marginPct).toBe('number');
    expect(typeof result.facts.expectedRoas).toBe('number');
  });

  it('should produce marginPct in facts', () => {
    const result = engine.reason(product());
    expect(result.facts.marginPct).toBeGreaterThan(0);
    expect(result.facts.expectedRoas).toBeGreaterThan(0);
  });

  it('should produce a human-readable summary string', () => {
    const result = engine.reason(product());
    const summary = engine.summarize(result);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(10);
  });
});
