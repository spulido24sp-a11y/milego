import db from '../config/database.js';
import { evaluateDimension } from './statistics.js';

const DEFAULT_CONFIG = {
  minViews: 300,
  minConversions: 15,
  alpha: 0.05,
  minLift: 5,
};

export class LIAMRecommendationEngine {
  /**
   * Evalúa todas las dimensiones (theme, cta, bundle) para un producto
   * y devuelve winners con confianza estadística.
   */
  static async getRecommendations(productId, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const daysBack = cfg.daysBack || 90;
    const from = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

    // Obtener datos agregados de liam_daily_metrics
    const rows = await db('liam_daily_metrics')
      .where({ product_id: parseInt(productId, 10) })
      .where('date', '>=', from)
      .select(
        'theme_key', 'cta_key', 'bundle_key',
        db.raw('SUM(page_views) as total_views'),
        db.raw('SUM(purchases) as total_purchases'),
        db.raw('SUM(revenue) as total_revenue'),
        db.raw('SUM(refunds) as total_refunds'),
        db.raw('SUM(sessions) as total_sessions')
      )
      .groupBy('theme_key', 'cta_key', 'bundle_key');

    if (rows.length === 0) {
      return { productId, recommendations: {}, summary: { status: 'no_data' } };
    }

    // Agrupar por dimensión
    const byTheme = {};
    const byCta = {};
    const byBundle = {};

    for (const r of rows) {
      const views = parseInt(r.total_views, 10);
      const conversions = parseInt(r.total_purchases, 10);

      if (r.theme_key) {
        if (!byTheme[r.theme_key]) byTheme[r.theme_key] = { key: r.theme_key, views: 0, conversions: 0, revenue: 0, refunds: 0 };
        byTheme[r.theme_key].views += views;
        byTheme[r.theme_key].conversions += conversions;
        byTheme[r.theme_key].revenue += parseFloat(r.total_revenue || 0);
        byTheme[r.theme_key].refunds += parseInt(r.total_refunds || 0, 10);
      }
      if (r.cta_key) {
        if (!byCta[r.cta_key]) byCta[r.cta_key] = { key: r.cta_key, views: 0, conversions: 0, revenue: 0, refunds: 0 };
        byCta[r.cta_key].views += views;
        byCta[r.cta_key].conversions += conversions;
        byCta[r.cta_key].revenue += parseFloat(r.total_revenue || 0);
        byCta[r.cta_key].refunds += parseInt(r.total_refunds || 0, 10);
      }
      if (r.bundle_key) {
        if (!byBundle[r.bundle_key]) byBundle[r.bundle_key] = { key: r.bundle_key, views: 0, conversions: 0, revenue: 0, refunds: 0 };
        byBundle[r.bundle_key].views += views;
        byBundle[r.bundle_key].conversions += conversions;
        byBundle[r.bundle_key].revenue += parseFloat(r.total_revenue || 0);
        byBundle[r.bundle_key].refunds += parseInt(r.total_refunds || 0, 10);
      }
    }

    const themeResult = evaluateDimension(Object.values(byTheme), cfg);
    const ctaResult = evaluateDimension(Object.values(byCta), cfg);
    const bundleResult = evaluateDimension(Object.values(byBundle), cfg);

    const recommendations = {};

    if (themeResult.winner) {
      recommendations.theme = {
        winner: themeResult.winner.key,
        lift: themeResult.winner.lift,
        confidence: 1 - themeResult.winner.pValue,
        sample: themeResult.winner.views,
        conversions: themeResult.winner.conversions,
        conversionRate: Math.round(themeResult.winner.conversionRate * 10000) / 100,
        pValue: themeResult.winner.pValue,
        reason: `Tema "${themeResult.winner.key}" incrementó conversión ${themeResult.winner.lift}% vs otras variantes (${themeResult.winner.views} sesiones, confianza ${Math.round((1 - themeResult.winner.pValue) * 100)}%)`,
        status: themeResult.status,
      };
    }

    if (ctaResult.winner) {
      recommendations.cta = {
        winner: ctaResult.winner.key,
        lift: ctaResult.winner.lift,
        confidence: 1 - ctaResult.winner.pValue,
        sample: ctaResult.winner.views,
        conversions: ctaResult.winner.conversions,
        conversionRate: Math.round(ctaResult.winner.conversionRate * 10000) / 100,
        pValue: ctaResult.winner.pValue,
        reason: `CTA "${ctaResult.winner.key}" incrementó conversión ${ctaResult.winner.lift}% vs otras variantes (${ctaResult.winner.views} sesiones, confianza ${Math.round((1 - ctaResult.winner.pValue) * 100)}%)`,
        status: ctaResult.status,
      };
    }

    if (bundleResult.winner) {
      recommendations.bundle = {
        winner: bundleResult.winner.key,
        lift: bundleResult.winner.lift,
        confidence: 1 - bundleResult.winner.pValue,
        sample: bundleResult.winner.views,
        conversions: bundleResult.winner.conversions,
        conversionRate: Math.round(bundleResult.winner.conversionRate * 10000) / 100,
        pValue: bundleResult.winner.pValue,
        reason: `Bundle "${bundleResult.winner.key}" incrementó conversión ${bundleResult.winner.lift}% vs otras variantes (${bundleResult.winner.views} sesiones, confianza ${Math.round((1 - bundleResult.winner.pValue) * 100)}%)`,
        status: bundleResult.status,
      };
    }

    // Backward compat: getWinnerFeedback para código legacy
    const allHaveData = themeResult.evaluations.length > 0 || ctaResult.evaluations.length > 0 || bundleResult.evaluations.length > 0;

    return {
      productId,
      recommendations,
      summary: {
        status: Object.keys(recommendations).length > 0 ? 'has_winners' : 'insufficient_data',
        totalSessions: rows.reduce((s, r) => s + parseInt(r.total_sessions || 0, 10), 0),
        totalConversions: rows.reduce((s, r) => s + parseInt(r.total_purchases || 0, 10), 0),
        period: `${daysBack}d`,
        evaluations: {
          theme: themeResult.evaluations.map(e => ({ key: e.key, cr: Math.round(e.conversionRate * 10000) / 100, views: e.views, conversions: e.conversions, pValue: e.pValue, lift: e.lift, significant: e.significant })),
          cta: ctaResult.evaluations.map(e => ({ key: e.key, cr: Math.round(e.conversionRate * 10000) / 100, views: e.views, conversions: e.conversions, pValue: e.pValue, lift: e.lift, significant: e.significant })),
          bundle: bundleResult.evaluations.map(e => ({ key: e.key, cr: Math.round(e.conversionRate * 10000) / 100, views: e.views, conversions: e.conversions, pValue: e.pValue, lift: e.lift, significant: e.significant })),
        },
      },
    };
  }

  /**
   * Backward compat: getWinnerFeedback original que leía de liam_telemetry.
   */
  static async getWinnerFeedback(productId) {
    const telemetry = await db('liam_telemetry').where({ product_id: parseInt(productId, 10) });
    if (telemetry.length === 0) return { ctaWinner: null, themeWinner: null };

    const ctas = [...new Set(telemetry.map(t => t.cta_text).filter(Boolean))];
    let bestCta = null;
    let highestCtaCr = 0;

    ctas.forEach(cta => {
      const ctaViews = telemetry.filter(t => t.cta_text === cta && t.event_type === 'pageview').length;
      const ctaSales = telemetry.filter(t => t.cta_text === cta && t.event_type === 'purchase').length;
      const cr = ctaViews > 0 ? (ctaSales / ctaViews) : 0;
      if (ctaSales >= 3 && cr > highestCtaCr) {
        highestCtaCr = cr;
        bestCta = cta;
      }
    });

    const themes = [...new Set(telemetry.map(t => t.theme_used).filter(Boolean))];
    let bestTheme = null;
    let highestThemeCr = 0;

    themes.forEach(theme => {
      const themeViews = telemetry.filter(t => t.theme_used === theme && t.event_type === 'pageview').length;
      const themeSales = telemetry.filter(t => t.theme_used === theme && t.event_type === 'purchase').length;
      const cr = themeViews > 0 ? (themeSales / themeViews) : 0;
      if (themeSales >= 3 && cr > highestThemeCr) {
        highestThemeCr = cr;
        bestTheme = theme;
      }
    });

    return {
      ctaWinner: bestCta,
      themeWinner: bestTheme,
      highestCtaCr: (highestCtaCr * 100).toFixed(2) + '%',
      highestThemeCr: (highestThemeCr * 100).toFixed(2) + '%',
    };
  }
}
