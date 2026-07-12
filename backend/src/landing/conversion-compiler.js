import { LIAMRecommendationEngine } from '../learning/recommendation-engine.js';
import { config } from '../config/index.js';

const MODE = config.liam.recommendationMode;

/**
 * Resuelve una dimensión con prioridad: recommendation → heuristic → default.
 * En modo shadow calcula el ganador pero sirve la heurística.
 */
function resolveDimension({ key, recommendation, heuristicValue, defaultValue, mode }) {
  const winner = recommendation?.winner;
  const hasWinner = winner && recommendation.status === 'winner';

  if (hasWinner && (mode === 'active' || mode === 'shadow')) {
    const recMeta = {
      value: winner,
      source: 'recommendation_engine',
      confidence: recommendation.confidence,
      lift: recommendation.lift,
      sample: recommendation.sample,
      conversions: recommendation.conversions,
      pValue: recommendation.pValue,
      status: recommendation.status,
    };

    if (mode === 'active') {
      return { served: recMeta, shadow: null };
    }

    return {
      served: { value: heuristicValue, source: 'heuristic' },
      shadow: recMeta,
    };
  }

  return {
    served: { value: heuristicValue || defaultValue, source: heuristicValue ? 'heuristic' : 'default' },
    shadow: null,
  };
}

export class LIAMConversionCompiler {
  constructor() {
    this.baseThemeScores = {
      premium: 70,
      minimal: 75,
      pagepilot: 65,
      editorial: 70,
    };

    this.ctaScores = [
      { text: 'Lo quiero hoy', score: 85 },
      { text: 'Comprar ahora', score: 70 },
      { text: 'Aprovechar oferta', score: 80 },
    ];

    this.urgencyScores = [
      { type: 'stock', text: 'quedan pocas unidades al precio de lanzamiento', score: 90 },
      { type: 'countdown', text: 'la oferta termina en pocas horas', score: 75 },
      { type: 'time_limit', text: 'precio especial válido por hoy', score: 80 },
    ];

    this.guaranteeScores = [
      { type: '30_days', text: 'Garantía de 30 días contra defectos de fábrica', score: 80 },
      { type: '60_days', text: 'Garantía extendida de 60 días sin riesgos', score: 90 },
      { type: 'lifetime', text: 'Garantía de satisfacción de por vida', score: 70 },
    ];
  }

  /**
   * Computes the absolute best CRO configuration for a product landing page.
   * @param {Object} product - Product database record
   * @param {Object} [trafficContext] - Campaigns parameters (source, audience)
   * @returns {Promise<Object>} Structured commercial recipe with audit trail
   */
  async compileCRODecision(product, trafficContext = {}) {
    const source = String(trafficContext.source || 'facebook').toLowerCase();
    const price = parseFloat(product.price || 0);
    const category = String(product.category_name || '').toLowerCase();

    // ── Phase 1: Calcular heurísticas ────────────────────────────
    const themeScores = { ...this.baseThemeScores };

    if (source === 'tiktok') {
      themeScores.pagepilot += 30;
      themeScores.premium += 10;
      themeScores.minimal -= 15;
    } else if (source === 'google') {
      themeScores.minimal += 25;
      themeScores.editorial += 15;
      themeScores.premium -= 10;
    } else if (source === 'facebook') {
      themeScores.premium += 15;
    }

    if (price >= 150000) {
      themeScores.premium += 35;
      themeScores.minimal -= 10;
      themeScores.editorial -= 10;
    } else {
      themeScores.minimal += 15;
      themeScores.premium -= 10;
    }

    if (category.includes('belleza') || category.includes('salud') || category.includes('fitness')) {
      themeScores.pagepilot += 25;
      themeScores.premium += 10;
    } else if (category.includes('hogar') || category.includes('organiza')) {
      themeScores.minimal += 20;
    }

    let bestTheme = 'premium';
    let highestThemeScore = -999;
    Object.keys(themeScores).forEach(theme => {
      if (themeScores[theme] > highestThemeScore) {
        highestThemeScore = themeScores[theme];
        bestTheme = theme;
      }
    });

    // Blocks
    const blockScores = {
      hero: 100,
      problem: 50,
      transformation: 45,
      benefits: 70,
      testimonials: 60,
      offer: 80,
      guarantee: 65,
      faq: 60,
      checkout: 0,
    };

    if (source === 'tiktok') {
      blockScores.testimonials += 35;
      blockScores.benefits += 15;
    } else if (source === 'google') {
      blockScores.faq += 25;
      blockScores.benefits += 20;
    } else if (price >= 150000) {
      blockScores.problem += 35;
      blockScores.transformation += 30;
      blockScores.guarantee += 20;
    }

    const middleBlocks = Object.keys(blockScores)
      .filter(b => b !== 'hero' && b !== 'checkout')
      .sort((a, b) => blockScores[b] - blockScores[a]);

    const blockOrder = ['hero', ...middleBlocks, 'checkout'];

    // CTA heurístico
    let bestCta = this.ctaScores[0];
    if (source === 'google') {
      bestCta = this.ctaScores.find(c => c.text === 'Comprar ahora') || bestCta;
    } else if (price >= 150000) {
      bestCta = this.ctaScores.find(c => c.text === 'Aprovechar oferta') || bestCta;
    }

    // Urgency
    let bestUrgency = this.urgencyScores[0];
    if (source === 'tiktok') {
      bestUrgency = this.urgencyScores.find(u => u.type === 'stock') || bestUrgency;
    } else if (source === 'facebook') {
      bestUrgency = this.urgencyScores.find(u => u.type === 'countdown') || bestUrgency;
    }

    // Guarantee
    let bestGuarantee = this.guaranteeScores[0];
    if (price >= 150000) {
      bestGuarantee = this.guaranteeScores.find(g => g.type === '60_days') || bestGuarantee;
    }

    // Bundle heurístico
    const costPrice = parseFloat(product.cost_price || 0);
    let bestOffer = 'bundle_x1';
    if (costPrice > 0) {
      const marginPct = ((price - costPrice) / price) * 100;
      if (marginPct > 50) {
        bestOffer = 'bundle_x2';
      }
    }

    // ── Phase 2: Recommendation Engine (v2 — estadístico) ────────
    let recommendations = null;
    let v1Feedback = null;
    try {
      const recResult = await LIAMRecommendationEngine.getRecommendations(product.id, {
        minViews: 300,
        minConversions: 15,
        daysBack: 90,
      });
      recommendations = recResult.recommendations || {};
    } catch (_) {
      recommendations = null;
    }

    // Fallback v1 (liam_telemetry) cuando v2 no tiene datos y mode no es active
    if (!recommendations || Object.keys(recommendations).length === 0) {
      try {
        v1Feedback = await LIAMRecommendationEngine.getWinnerFeedback(product.id);
      } catch (_) {
        v1Feedback = null;
      }
    }

    const mode = MODE; // off | shadow | active

    // ── Phase 3: Resolver cada dimensión ─────────────────────────
    // Fallback v1 cuando no hay datos v2 y mode es off
    const hasV2Rec = recommendations && Object.keys(recommendations).length > 0;
    const themeRec = recommendations?.theme || null;
    const ctaRec = recommendations?.cta || null;
    const bundleRec = recommendations?.bundle || null;

    // En modo off sin v2: usar v1 feedback como override directo (backward compat)
    if (!hasV2Rec && mode === 'off' && v1Feedback) {
      if (v1Feedback.themeWinner) bestTheme = v1Feedback.themeWinner;
      if (v1Feedback.ctaWinner) bestCta = { text: v1Feedback.ctaWinner, score: 99 };
    }

    const themeResult = resolveDimension({
      key: 'theme',
      recommendation: themeRec,
      heuristicValue: bestTheme,
      defaultValue: 'premium',
      mode,
    });

    const ctaResult = resolveDimension({
      key: 'cta',
      recommendation: ctaRec,
      heuristicValue: bestCta.text,
      defaultValue: 'Lo quiero hoy',
      mode,
    });

    const bundleResult = resolveDimension({
      key: 'bundle',
      recommendation: bundleRec,
      heuristicValue: bestOffer,
      defaultValue: 'bundle_x1',
      mode,
    });

    // ── Assemble result ──────────────────────────────────────────
    const servedTheme = themeResult.served;
    const servedCta = ctaResult.served;
    const servedBundle = bundleResult.served;

    // Confidence: from recommendation if active, else heuristic
    let confidence;
    if (servedTheme.source === 'recommendation_engine') {
      confidence = Math.min(100, Math.max(50, Math.round(servedTheme.confidence * 100)));
    } else {
      confidence = Math.min(100, Math.max(50, Math.round(highestThemeScore)));
    }

    const croDecision = {
      theme: {
        value: servedTheme.value,
        source: servedTheme.source,
        ...(servedTheme.confidence != null && { confidence: servedTheme.confidence }),
        ...(servedTheme.lift != null && { lift: servedTheme.lift }),
        ...(servedTheme.sample != null && { sample: servedTheme.sample }),
      },
      cta: {
        value: servedCta.value,
        source: servedCta.source,
        ...(servedCta.confidence != null && { confidence: servedCta.confidence }),
        ...(servedCta.lift != null && { lift: servedCta.lift }),
        ...(servedCta.sample != null && { sample: servedCta.sample }),
      },
      bundle: {
        value: servedBundle.value,
        source: servedBundle.source,
        ...(servedBundle.confidence != null && { confidence: servedBundle.confidence }),
        ...(servedBundle.lift != null && { lift: servedBundle.lift }),
        ...(servedBundle.sample != null && { sample: servedBundle.sample }),
      },
      mode,
    };

    // Shadow: attach what IA would have chosen
    if (themeResult.shadow) croDecision.theme.shadow = themeResult.shadow;
    if (ctaResult.shadow) croDecision.cta.shadow = ctaResult.shadow;
    if (bundleResult.shadow) croDecision.bundle.shadow = bundleResult.shadow;

    return {
      theme: servedTheme.value,
      cta: servedCta.value,
      urgency: bestUrgency.text,
      urgencyType: bestUrgency.type,
      guarantee: bestGuarantee.text,
      guaranteeType: bestGuarantee.type,
      offer: servedBundle.value,
      blockOrder,
      confidence,
      themeSource: servedTheme.source,
      ctaSource: servedCta.source,
      offerSource: servedBundle.source,
      croDecision,
    };
  }

  /**
   * Backward compat: getWinnerFeedback original que leía de liam_telemetry.
   */
  async getWinnerFeedback(productId) {
    return LIAMRecommendationEngine.getWinnerFeedback(productId);
  }
}
