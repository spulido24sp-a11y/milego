/**
 * recommendation-engine.js
 *
 * Takes ReasoningResult + ScoringResult and produces prioritized,
 * quantified action recommendations.
 *
 * Each recommendation includes:
 *   action                - machine-readable action code
 *   label                 - human-readable description
 *   expectedConfidenceGain - how many points it adds to the Confidence Score
 *   expectedRoasGain       - estimated ROAS improvement
 *   simulationKey          - key for ScenarioSimulator to run the scenario
 */

export class RecommendationEngine {
  /**
   * @param {Object} product
   * @param {Object} reasoningResult
   * @param {Object} scoringResult
   * @returns {RecommendationResult}
   */
  recommend(product, reasoningResult, scoringResult) {
    const { facts, findings } = reasoningResult;
    const { scores, confidence } = scoringResult;

    const recommendations = [];

    // ── Pull already-computed recs from rules (sorted by gain) ────────
    const ruleRecs = reasoningResult.recommendations ?? [];

    for (const rec of ruleRecs) {
      recommendations.push({
        source: 'rule',
        action: rec.action,
        label:  rec.detail,
        expectedConfidenceGain: rec.expectedConfidenceGain ?? 0,
        expectedRoasGain:       rec.expectedRoasGain ?? null,
        simulationKey: this._mapActionToSimulation(rec.action, facts)
      });
    }

    // ── Generate higher-level strategic recommendations ────────────────

    // Bundle x2 if ROAS is between 1.5–2.0 (not yet critical)
    if ((facts.expectedRoas ?? 0) >= 1.5 && (facts.expectedRoas ?? 0) < 2.0 && !this._hasAction(recommendations, 'create_bundle_x2')) {
      const bundleRoas = this._estimateBundleRoas(facts, 2);
      recommendations.push({
        source: 'strategic',
        action: 'create_bundle_x2',
        label:  `Crea un bundle x2 para subir el ticket promedio. ROAS estimado: ${bundleRoas.toFixed(2)}x.`,
        expectedConfidenceGain: 10,
        expectedRoasGain: parseFloat((bundleRoas - (facts.expectedRoas ?? 0)).toFixed(2)),
        simulationKey: { type: 'bundle', quantity: 2 }
      });
    }

    // More images if score is low
    if (scores.calidad_datos < 70 && !this._hasAction(recommendations, 'add_more_images') && !this._hasAction(recommendations, 'add_product_images')) {
      const gain = Math.min(20, (3 - Math.min((facts.imageCount ?? 0), 3)) * 7);
      recommendations.push({
        source: 'strategic',
        action: 'add_product_images',
        label:  `Agregar ${Math.max(1, 3 - (facts.imageCount ?? 0))} imagen(es) más puede aumentar el CTR en anuncios en un 15–25%.`,
        expectedConfidenceGain: gain,
        expectedRoasGain: null,
        simulationKey: null
      });
    }

    // Price optimization if SEO + viability are misaligned
    if (scores.viabilidad < 65 && scores.seo >= 70 && !this._hasAction(recommendations, 'increase_retail_price')) {
      const currentRetail = facts.retail ?? 0;
      const optimizedPrice = Math.ceil(currentRetail * 1.12);
      recommendations.push({
        source: 'strategic',
        action: 'optimize_price',
        label:  `Sube el precio de $${currentRetail.toLocaleString()} a $${optimizedPrice.toLocaleString()} (+12%). El SEO es fuerte, el mercado puede absorberlo.`,
        expectedConfidenceGain: 8,
        expectedRoasGain: 0.25,
        simulationKey: { type: 'price', value: optimizedPrice }
      });
    }

    // Sort by confidence gain descending
    recommendations.sort((a, b) => b.expectedConfidenceGain - a.expectedConfidenceGain);

    // Max projected confidence after all recommendations
    const totalGain = recommendations.reduce((s, r) => s + r.expectedConfidenceGain, 0);
    const projectedConfidence = Math.min(100, confidence + totalGain);

    return {
      recommendations: recommendations.slice(0, 5), // top 5
      currentConfidence: confidence,
      projectedConfidence,
      projectedConfidenceGain: projectedConfidence - confidence
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  _estimateBundleRoas(facts, qty) {
    const cost          = (facts.cost ?? 0) * qty;
    const retail        = (facts.retail ?? 0) * qty;
    const adSpend       = retail * 0.25; // lower % for bundles
    return retail / (cost + adSpend);
  }

  _hasAction(recs, action) {
    return recs.some(r => r.action === action);
  }

  _mapActionToSimulation(action, facts) {
    const map = {
      'create_bundle_x2':      { type: 'bundle', quantity: 2 },
      'create_bundle_x3':      { type: 'bundle', quantity: 3 },
      'increase_retail_price': { type: 'price',  value: Math.ceil((facts.retail ?? 0) * 1.15) },
      'optimize_price':        { type: 'price',  value: Math.ceil((facts.retail ?? 0) * 1.12) }
    };
    return map[action] ?? null;
  }
}
