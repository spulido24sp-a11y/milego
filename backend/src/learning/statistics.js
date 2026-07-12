/**
 * Funciones estadísticas para el Recommendation Engine.
 * Implementa z-test de dos proporciones y normalización.
 */

/**
 * Aproximación racional de la función Phi (CDF normal estándar)
 * utilizando la expansión de Hastings. Error máximo < 7.5e-8.
 */
function phi(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1 + sign * y);
}

/**
 * Two-proportion z-test.
 * Compara si la tasa de conversión de A es significativamente mayor que la de B.
 *
 * @param {number} viewsA  - Visitas de la variante A
 * @param {number} convA   - Conversiones de A
 * @param {number} viewsB  - Visitas de la variante B (control)
 * @param {number} convB   - Conversiones de B
 * @returns {{ z: number, pValue: number, lift: number }}
 */
export function twoProportionZTest(viewsA, convA, viewsB, convB) {
  if (viewsA <= 0 || viewsB <= 0) {
    return { z: 0, pValue: 1, lift: 0 };
  }

  const pA = convA / viewsA;
  const pB = convB / viewsB;
  const pPooled = (convA + convB) / (viewsA + viewsB);

  // Si no hay varianza, no se puede calcular
  if (pPooled === 0 || pPooled === 1) {
    return { z: 0, pValue: 1, lift: 0 };
  }

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / viewsA + 1 / viewsB));
  if (se === 0) {
    return { z: 0, pValue: 1, lift: 0 };
  }

  const z = (pA - pB) / se;
  const pValue = 1 - phi(z); // one-tailed: A > B
  const lift = pB > 0 ? ((pA - pB) / pB) * 100 : 0;

  return { z, pValue, lift };
}

/**
 * Determina si un resultado es estadísticamente significativo.
 */
export function isSignificant({ pValue, lift, views, conversions }, config = {}) {
  const {
    minViews = 300,
    minConversions = 15,
    alpha = 0.05,
    minLift = 5,
  } = config;

  if (views < minViews) return false;
  if (conversions < minConversions) return false;
  if (pValue > alpha) return false;
  if (lift < minLift) return false;
  return true;
}

/**
 * Evalúa una dimensión (theme, cta, bundle) contra el resto (control agregado).
 */
export function evaluateDimension(items, config = {}) {
  if (!items || items.length < 2) {
    return { winner: null, evaluations: [], status: 'insufficient_data' };
  }

  const totalViews = items.reduce((s, i) => s + i.views, 0);
  const totalConv = items.reduce((s, i) => s + i.conversions, 0);

  const evaluations = items.map(variant => {
    const controlViews = totalViews - variant.views;
    const controlConv = totalConv - variant.conversions;

    const { z, pValue, lift } = twoProportionZTest(
      variant.views, variant.conversions,
      controlViews, controlConv
    );

    const significant = isSignificant(
      { pValue, lift, views: variant.views, conversions: variant.conversions },
      config
    );

    return {
      key: variant.key,
      views: variant.views,
      conversions: variant.conversions,
      conversionRate: variant.views > 0 ? (variant.conversions / variant.views) : 0,
      revenue: variant.revenue || 0,
      refunds: variant.refunds || 0,
      zScore: Math.round(z * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      lift: Math.round(lift * 10) / 10,
      significant,
      status: significant ? 'winner' : (variant.views < config.minViews || variant.conversions < config.minConversions ? 'insufficient_data' : 'not_significant'),
    };
  });

  const winners = evaluations.filter(e => e.significant).sort((a, b) => b.lift - a.lift);
  const winner = winners.length > 0 ? winners[0] : null;

  return {
    winner,
    evaluations: evaluations.sort((a, b) => b.conversionRate - a.conversionRate),
    status: winner ? 'winner' : 'insufficient_data',
  };
}
