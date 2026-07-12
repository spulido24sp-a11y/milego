/**
 * scenario-simulator.js
 *
 * Pure computation engine — no DB reads, no LLM calls.
 * Applies a ScenarioOverride to a product and recomputes
 * Reasoning + Scoring instantly.
 *
 * Used by:
 *   - POST /api/v1/launches/:id/simulate
 *   - Review Workspace price/bundle sliders (real-time)
 */

import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { ScoringEngine }   from '../scoring/scoring-engine.js';

const reasoning = new ReasoningEngine();
const scoring   = new ScoringEngine();

/**
 * Supported scenario types:
 *   { type: 'price',        value: number }          — override retail price
 *   { type: 'bundle',       quantity: number }        — simulate bundle x2/x3
 *   { type: 'free_shipping', shippingCost: number }   — absorb shipping into price
 *   { type: 'custom',       overrides: Object }       — arbitrary product field overrides
 */
export class ScenarioSimulator {
  /**
   * @param {Object} product   — base product (normalized)
   * @param {Object} scenario  — { type, ...params }
   * @returns {SimulationResult}
   */
  simulate(product, scenario) {
    const modified = this._applyScenario(structuredClone(product), scenario);

    const reasoningResult = reasoning.reason(modified);
    const scoringResult   = scoring.score(modified, reasoningResult);

    return {
      scenario,
      before: this._snapshot(product),
      after:  this._snapshot(modified),
      reasoning: {
        recommendation: reasoningResult.recommendation,
        blockers:       reasoningResult.blockers
      },
      scoring: {
        confidence: scoringResult.confidence,
        grade:      scoringResult.grade,
        scores:     scoringResult.scores,
        isLaunchReady: scoringResult.isLaunchReady
      },
      delta: this._computeDelta(product, modified, scoringResult)
    };
  }

  /**
   * Run multiple scenarios at once and return them ranked by confidence.
   *
   * @param {Object}   product
   * @param {Object[]} scenarios
   * @returns {SimulationResult[]}
   */
  simulateAll(product, scenarios) {
    return scenarios
      .map(s => this.simulate(product, s))
      .sort((a, b) => b.scoring.confidence - a.scoring.confidence);
  }

  /**
   * Run the standard set of optimization scenarios and return the best one.
   */
  optimizeBest(product) {
    const cost   = parseFloat(product.supplier_info?.wholesale_price         ?? 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price  ?? 0);

    const scenarios = [
      { type: 'bundle', quantity: 2 },
      { type: 'bundle', quantity: 3 },
      { type: 'price',  value: Math.ceil(retail * 1.10) },
      { type: 'price',  value: Math.ceil(retail * 1.20) },
      { type: 'price',  value: Math.ceil(retail * 1.30) },
      { type: 'free_shipping', shippingCost: 8000 }
    ].filter(() => cost > 0 && retail > 0);

    const results = this.simulateAll(product, scenarios);
    return {
      best: results[0] ?? null,
      all:  results
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  _applyScenario(product, scenario) {
    const cost   = parseFloat(product.supplier_info?.wholesale_price         ?? 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price  ?? 0);

    switch (scenario.type) {
      case 'price':
        product.supplier_info = { ...product.supplier_info, suggested_retail_price: scenario.value };
        break;

      case 'bundle': {
        const qty = scenario.quantity ?? 2;
        product.supplier_info = {
          ...product.supplier_info,
          wholesale_price:        cost * qty,
          suggested_retail_price: retail * qty
        };
        product._scenarioLabel = `Bundle x${qty}`;
        break;
      }

      case 'free_shipping': {
        // Absorb shipping cost into the retail price to maintain margin
        const shipping = scenario.shippingCost ?? 8000;
        product.supplier_info = {
          ...product.supplier_info,
          suggested_retail_price: retail + shipping
        };
        product._scenarioLabel = 'Envío gratis incluido';
        break;
      }

      case 'custom':
        Object.assign(product, scenario.overrides ?? {});
        break;

      default:
        break;
    }

    return product;
  }

  _snapshot(product) {
    const cost   = parseFloat(product.supplier_info?.wholesale_price         ?? 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price  ?? 0);
    const margin = retail > 0 ? ((retail - cost) / retail) * 100 : 0;
    const adSpend = retail * 0.30;
    const roas    = retail > 0 ? retail / (cost + adSpend) : 0;

    return {
      cost:      Math.round(cost),
      retail:    Math.round(retail),
      marginPct: parseFloat(margin.toFixed(2)),
      roas:      parseFloat(roas.toFixed(2)),
      label:     product._scenarioLabel ?? 'Actual'
    };
  }

  _computeDelta(originalProduct, modifiedProduct, scoringResult) {
    const before = this._snapshot(originalProduct);
    const after  = this._snapshot(modifiedProduct);

    return {
      retailDiff:    after.retail - before.retail,
      marginDiff:    parseFloat((after.marginPct - before.marginPct).toFixed(2)),
      roasDiff:      parseFloat((after.roas - before.roas).toFixed(2)),
      confidenceDiff: null // Caller should diff before/after confidence externally
    };
  }
}
