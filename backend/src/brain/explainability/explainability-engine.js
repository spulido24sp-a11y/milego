/**
 * explainability-engine.js
 *
 * Converts Scoring Engine output into human-readable explanations.
 * Every score gets a "why" — visible in the Review Workspace and chat.
 */

export class ExplainabilityEngine {
  /**
   * Explains each dimension score in plain language.
   *
   * @param {Object} scoringResult  - Output from ScoringEngine.score()
   * @param {Object} reasoningResult - Output from ReasoningEngine.reason()
   * @returns {ExplainabilityReport}
   */
  explain(scoringResult, reasoningResult) {
    const { scores, confidence, grade } = scoringResult;
    const { facts, findings, recommendations } = reasoningResult;

    const dimensionExplanations = {
      viabilidad:    this._explainViabilidad(scores.viabilidad, facts),
      logistica:     this._explainLogistica(scores.logistica, facts),
      calidad_datos: this._explainCalidadDatos(scores.calidad_datos, facts),
      seo:           this._explainSeo(scores.seo, facts),
      oferta:        this._explainOferta(scores.oferta, facts)
    };

    const scoreBreakdown = this._buildBreakdown(scores, confidence);
    const executiveSummary = this._buildExecutiveSummary(confidence, grade, findings, recommendations);
    const topActions = recommendations.slice(0, 3).map(r => ({
      action: r.action,
      label:  r.detail,
      gain:   r.expectedConfidenceGain ?? 0,
      roasGain: r.expectedRoasGain ?? null
    }));

    return {
      confidence,
      grade,
      executiveSummary,
      scoreBreakdown,
      dimensionExplanations,
      topActions,
      isLaunchReady: scoringResult.isLaunchReady
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────

  _explainViabilidad(score, facts) {
    const margin = (facts.marginPct ?? 0).toFixed(1);
    const roas   = (facts.expectedRoas ?? 0).toFixed(2);
    if (score >= 80) return `Margen del ${margin}% y ROAS de ${roas}x garantizan rentabilidad con pauta pagada.`;
    if (score >= 60) return `Margen del ${margin}% es aceptable. ROAS de ${roas}x deja poco margen para optimización.`;
    return `Margen del ${margin}% y ROAS de ${roas}x hacen este producto de riesgo alto para escalar con pauta.`;
  }

  _explainLogistica(score, facts) {
    const w = (facts.weightKg ?? 0).toFixed(1);
    if (score === 100) return `Peso de ${w}kg. Ideal para envío COD en Colombia. Costos bajos.`;
    if (score >= 80)   return `Peso de ${w}kg. Envío viable con costo moderado.`;
    if (score >= 55)   return `Peso de ${w}kg. El costo de envío reduce el margen efectivo. Considera ajustar el precio.`;
    return `Peso de ${w}kg. Envío COD posiblemente inviable o muy costoso en algunas rutas.`;
  }

  _explainCalidadDatos(score, facts) {
    const images = facts.imageCount ?? 0;
    const desc   = facts.descLength ?? 0;
    if (score >= 90) return `${images} imágenes y descripción de ${desc} caracteres. LIAM puede generar contenido de alta calidad.`;
    if (score >= 70) return `${images} imágenes y ${desc} caracteres de descripción. Suficiente, pero más imágenes mejorarían el CTR.`;
    if (score >= 50) return `Solo ${images} imagen(es) o descripción muy corta (${desc} chars). La calidad del copy generado se verá afectada.`;
    return `Datos de producto insuficientes (${images} img, ${desc} chars). LIAM no puede generar contenido de calidad con esta información.`;
  }

  _explainSeo(score, facts) {
    if (score >= 80) return `El nombre y la descripción contienen palabras clave de alto valor. Buena base para SEO y anuncios.`;
    if (score >= 60) return `SEO básico presente. Agregar keywords como "envío gratis", "garantía" o "contra entrega" puede mejorar el CTR.`;
    return `El nombre y la descripción carecen de keywords relevantes. Los anuncios y el SEO orgánico pueden tener bajo rendimiento.`;
  }

  _explainOferta(score, facts) {
    const margin = (facts.marginPct ?? 0).toFixed(1);
    if (score >= 80) return `Margen del ${margin}% con tipo de oferta definido. Estructura de venta clara.`;
    if (score >= 60) return `Margen del ${margin}%. Considera definir un tipo de oferta (bundle, unidad, combo) para mejorar el score.`;
    return `Oferta débil. Margen del ${margin}% sin tipo de oferta definido. Define la estrategia de venta.`;
  }

  _buildBreakdown(scores, confidence) {
    return {
      viabilidad:    { score: scores.viabilidad,    weight: '25%', contribution: Math.round(scores.viabilidad    * 0.25) },
      logistica:     { score: scores.logistica,     weight: '20%', contribution: Math.round(scores.logistica     * 0.20) },
      calidad_datos: { score: scores.calidad_datos, weight: '20%', contribution: Math.round(scores.calidad_datos * 0.20) },
      seo:           { score: scores.seo,           weight: '15%', contribution: Math.round(scores.seo           * 0.15) },
      oferta:        { score: scores.oferta,        weight: '20%', contribution: Math.round(scores.oferta        * 0.20) },
      total:         confidence
    };
  }

  _buildExecutiveSummary(confidence, grade, findings, recommendations) {
    const blockers = findings.filter(f => f.severity === 'critical');
    const warnings = findings.filter(f => f.severity === 'high');
    const topRec   = recommendations[0];

    if (blockers.length > 0) {
      return `Este producto tiene ${blockers.length} problema(s) crítico(s) que impiden el lanzamiento: ${blockers.map(b => b.detail).join('; ')}.`;
    }

    if (confidence >= 80) {
      const action = topRec ? ` Para mejorar aún más, ${topRec.detail.toLowerCase()}` : '';
      return `Producto en excelente estado (${grade}, ${confidence}/100). Listo para lanzar.${action}`;
    }

    if (confidence >= 60) {
      const issues = warnings.slice(0, 2).map(w => w.detail).join('; ');
      return `Producto viable (${grade}, ${confidence}/100) pero con áreas de mejora: ${issues || 'revisar datos del producto'}.`;
    }

    return `Producto con oportunidades de mejora importantes (${grade}, ${confidence}/100). Se recomienda resolver los problemas de datos antes de lanzar.`;
  }
}
