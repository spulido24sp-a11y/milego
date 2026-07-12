/**
 * scoring-engine.js
 * 
 * Converts Reasoning Engine facts/metrics into quantified, explainable scores.
 * Produces a Confidence Score (0–100) and letter grade for the Review Workspace.
 * 
 * All scoring is deterministic — no LLM needed.
 */

import { scoreViabilidad }    from './dimensions/viabilidad.js';
import { scoreLogistica }     from './dimensions/logistica.js';
import { scoreCalidadDatos }  from './dimensions/calidad-datos.js';
import { scoreSeo }           from './dimensions/seo.js';

/**
 * Dimension weights (must sum to 1.0)
 * These are tuned for COD dropshipping in Colombia.
 */
const WEIGHTS = {
  viabilidad:    0.25,  // margin + ROAS — business survival
  logistica:     0.20,  // shipping weight/fragility — operational risk
  calidad_datos: 0.20,  // data completeness — LLM output quality ceiling
  seo:           0.15,  // organic + paid search readiness
  oferta:        0.20   // offer type + pricing attractiveness (computed inline)
};

function gradeFromScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export class ScoringEngine {
  /**
   * @param {Object} product         - Normalized product object
   * @param {Object} reasoningResult - Output from ReasoningEngine.reason()
   * @returns {ScoringResult}
   */
  score(product, reasoningResult) {
    const { facts, findings = [], recommendations = [] } = reasoningResult;

    // --- Compute each dimension using structured facts ---
    const viabilidad   = scoreViabilidad({ marginPct: facts.marginPct ?? 0, expectedRoas: facts.expectedRoas ?? 0 });
    const logistica    = scoreLogistica({ weightKg: facts.weightKg ?? 0, facts: findings.map(f => f.code) });
    const calidadDatos = scoreCalidadDatos({ qualityScore: facts.qualityScore ?? 0, imageCount: facts.imageCount ?? 0, descLength: facts.descLength ?? 0, facts: findings.map(f => f.code) });
    const seo          = scoreSeo(product);

    // Offer score
    const hasOfferType = !!(product.launch_blueprint?.offer?.type);
    const ofertaScore  = Math.round(Math.min(100, ((facts.marginPct ?? 0) / 55) * 80 + (hasOfferType ? 20 : 0)));

    const dimensionScores = {
      viabilidad:    viabilidad.score,
      logistica:     logistica.score,
      calidad_datos: calidadDatos.score,
      seo:           seo.score,
      oferta:        ofertaScore
    };

    // --- Weighted confidence ---
    const confidence = Math.round(
      dimensionScores.viabilidad    * WEIGHTS.viabilidad    +
      dimensionScores.logistica     * WEIGHTS.logistica     +
      dimensionScores.calidad_datos * WEIGHTS.calidad_datos +
      dimensionScores.seo           * WEIGHTS.seo           +
      dimensionScores.oferta        * WEIGHTS.oferta
    );

    // --- Gather explanations (only for low-scoring dimensions) ---
    const explanations = {};
    if (viabilidad.explanation)   explanations.viabilidad    = viabilidad.explanation;
    if (logistica.explanation)    explanations.logistica     = logistica.explanation;
    if (calidadDatos.explanation) explanations.calidad_datos = calidadDatos.explanation;
    if (seo.explanation)          explanations.seo           = seo.explanation;

    const blockers = reasoningResult.blockers ?? [];

    return {
      scores: dimensionScores,
      confidence,
      grade: gradeFromScore(confidence),
      explanations,
      blockers,
      isLaunchReady: confidence >= 60 && blockers.length === 0
    };
  }

  /**
   * Builds the structured context string injected into the Gemini prompt.
   * Keeps the LLM focused — it receives analysis, not raw data.
   */
  buildLLMContext(product, reasoningResult, scoringResult) {
    const f  = reasoningResult.facts        ?? {};
    const fi = reasoningResult.findings     ?? [];
    const re = reasoningResult.recommendations ?? [];
    const s  = scoringResult;

    const problemLines = fi
      .filter(x => x.severity !== 'ok')
      .map(x => `  - ${x.detail}`)
      .join('\n');

    const topRecs = re.slice(0, 2).map(r => `  - ${r.detail}`).join('\n');

    return `[Producto]
Nombre: ${product.name ?? 'Sin nombre'}
Costo: $${(f.cost ?? 0).toLocaleString()} | Retail: $${(f.retail ?? 0).toLocaleString()} | Margen: ${(f.marginPct ?? 0).toFixed(1)}%

[Análisis LIAM]
Recomendación: ${reasoningResult.recommendation}
Problemas detectados:
${problemLines || '  - Ninguno'}

[Scoring]
Confianza: ${s.confidence}/100 (${s.grade})
Viabilidad: ${s.scores.viabilidad} | Logística: ${s.scores.logistica} | Calidad datos: ${s.scores.calidad_datos} | SEO: ${s.scores.seo} | Oferta: ${s.scores.oferta}
ROAS esperado: ${(f.expectedRoas ?? 0).toFixed(2)}x

[Acciones sugeridas]
${topRecs || '  - Ninguna'}`;
  }
}
