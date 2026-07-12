/**
 * reasoning-engine.js (v2)
 *
 * ReasoningResult contract:
 * {
 *   facts:           Object   — raw measurements (margin, roas, weight, images, …)
 *   findings:        Array    — { code, severity, detail } — problems/observations
 *   recommendations: Array    — { action, detail, expectedConfidenceGain, expectedRoasGain? }
 *   recommendation:  string   — PROCEED | PROCEED_WITH_CAUTION | BLOCK
 *   requiresLLM:     boolean
 *   blockers:        string[] — finding codes that block launch
 * }
 */

import { evaluateMargin }      from './rules/margin.rule.js';
import { evaluateLogistics }   from './rules/logistics.rule.js';
import { evaluateDataQuality } from './rules/data-quality.rule.js';
import { evaluateRoas }        from './rules/roas.rule.js';

const CRITICAL_BLOCKER_CODES = new Set([
  'MISSING_RETAIL_PRICE',
  'RETAIL_BELOW_COST',
  'MISSING_NAME',
  'NO_IMAGES',
  'ROAS_NONVIABLE'
]);

export class ReasoningEngine {
  /**
   * Full deterministic analysis of a product.
   * Never calls an LLM. No side effects.
   *
   * @param {Object} product - Normalized product
   * @returns {ReasoningResult}
   */
  reason(product) {
    const allFindings        = [];
    const allRecommendations = [];
    const mergedFacts        = {};

    // ── Run all rules ─────────────────────────────────────────────────
    const rules = [
      evaluateMargin(product),
      evaluateLogistics(product),
      evaluateDataQuality(product),
      evaluateRoas(product)
    ];

    for (const rule of rules) {
      allFindings.push(...rule.findings);
      allRecommendations.push(...rule.recommendations);
      Object.assign(mergedFacts, rule.facts);
    }

    // ── Determine blockers ─────────────────────────────────────────────
    const blockers = allFindings
      .filter(f => CRITICAL_BLOCKER_CODES.has(f.code))
      .map(f => f.code);

    const hasCritical = allFindings.some(f => f.severity === 'critical');
    const hasHigh     = allFindings.some(f => f.severity === 'high');

    // ── Recommendation & LLM gate ──────────────────────────────────────
    let recommendation;
    let requiresLLM;

    if (blockers.length > 0 || hasCritical) {
      recommendation = 'BLOCK';
      requiresLLM    = false;
    } else {
      recommendation = hasHigh ? 'PROCEED_WITH_CAUTION' : 'PROCEED';
      requiresLLM    = true;
    }

    // ── Sort recommendations by expected gain (desc) ───────────────────
    allRecommendations.sort((a, b) => (b.expectedConfidenceGain ?? 0) - (a.expectedConfidenceGain ?? 0));

    return {
      facts:           mergedFacts,
      findings:        allFindings,
      recommendations: allRecommendations,
      recommendation,
      requiresLLM,
      blockers
    };
  }

  /**
   * Human-readable summary (used in chat responses).
   */
  summarize(result) {
    const lines = [];
    const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', ok: '✅', info: 'ℹ️' };

    if (result.recommendation === 'BLOCK') {
      lines.push(`🚫 **Lanzamiento bloqueado** — ${result.blockers.length} problema(s) crítico(s) detectado(s).`);
    } else if (result.recommendation === 'PROCEED_WITH_CAUTION') {
      lines.push(`⚠️ **Proceder con precaución** — Se detectaron riesgos que pueden afectar el rendimiento.`);
    } else {
      lines.push(`✅ **Producto listo para lanzar.**`);
    }

    for (const f of result.findings.filter(f => f.severity !== 'ok')) {
      lines.push(`${icons[f.severity] ?? '⚪'} ${f.detail}`);
    }

    if (result.recommendations.length > 0) {
      lines.push('\n**Acciones recomendadas:**');
      for (const rec of result.recommendations.slice(0, 3)) {
        const gain = rec.expectedConfidenceGain > 0 ? ` (+${rec.expectedConfidenceGain} pts confianza)` : '';
        lines.push(`→ ${rec.detail}${gain}`);
      }
    }

    return lines.join('\n');
  }
}
