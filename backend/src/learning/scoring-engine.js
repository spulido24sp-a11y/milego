import db from '../config/database.js';

export class LIAMScoringEngine {
  /**
   * Calculates the comprehensive CRO investment score for a product asset.
   * Formula: Score = 0.25 * ConversionRate + 0.20 * ROAS + 0.15 * Margin - 0.10 * RefundRate
   * @param {Object} product - Database product record
   * @returns {Promise<Object>} Pondered score output
   */
  static async computeAssetScore(product) {
    const productId = parseInt(product.id, 10);
    const price = parseFloat(product.price || 0);
    const cost = parseFloat(product.cost_price || 0);

    // Initial Margin Score component (0-100)
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const marginScore = Math.min(100, Math.max(0, margin));

    // Consult telemetry logs
    const telemetry = await db('liam_telemetry').where({ product_id: productId });
    
    // PageViews (Visits) & Purchases (Conversions) counts
    const visits = telemetry.filter(t => t.event_type === 'pageview').length;
    const sales = telemetry.filter(t => t.event_type === 'purchase').length;
    const refunds = telemetry.filter(t => t.event_type === 'refund').length;

    // 1. Conversion component (normalized: 1.5% - 5% scale mapped to 0-100 score)
    const cr = visits > 0 ? (sales / visits) * 100 : 0.02; // Fallback: 2% base
    const conversionScore = Math.min(100, Math.max(20, Math.round(cr * 20)));

    // 2. Refund component
    const refundRate = sales > 0 ? (refunds / sales) * 100 : 0;
    const refundPenalty = Math.min(50, Math.round(refundRate * 2.5));

    // 3. ROAS (Return On Ad Spend) component (normalized 1.5x - 4.5x scaled to 0-100)
    // In e-commerce mock context we infer ROAS from AOV / margins or set a realistic baseline
    const baseRoas = product.launch_blueprint?.roi?.roas_target || 3.2;
    const roasScore = Math.min(100, Math.max(30, Math.round(baseRoas * 20)));

    // Final Pondered Score Calculation
    // score = (0.25*conv + 0.20*roas + 0.15*margin) / 0.60 - (0.10 * refundRate)
    const WEIGHT_CR = 0.25;
    const WEIGHT_ROAS = 0.20;
    const WEIGHT_MARGIN = 0.15;
    const WEIGHT_SUM = WEIGHT_CR + WEIGHT_ROAS + WEIGHT_MARGIN;

    let finalScore = (
      (WEIGHT_CR * conversionScore) +
      (WEIGHT_ROAS * roasScore) +
      (WEIGHT_MARGIN * marginScore)
    ) / WEIGHT_SUM;

    finalScore = finalScore - (0.10 * refundRate);
    finalScore = Math.max(10, Math.min(100, Math.round(finalScore)));

    // Determine risk status based on score boundaries
    let status = 'estable';
    if (finalScore >= 75) status = 'escalable';
    else if (finalScore < 60 || refundRate > 15) status = 'riesgo';

    return {
      productId,
      assetName: product.name,
      score: finalScore,
      conversionRate: cr.toFixed(2) + '%',
      margin: margin.toFixed(1) + '%',
      refundRate: refundRate.toFixed(1) + '%',
      status,
      recommendation: status === 'escalable' ? 'Escalar pauta' : (status === 'riesgo' ? 'Ajustar oferta' : 'Mantener inversión')
    };
  }
}
