/**
 * AdIntelligenceService — LIAM's Ad Performance Brain
 *
 * Analyzes stored ad_performance_snapshots to surface:
 *   - Top performing products by ROAS
 *   - Burnt / fatigued ads (high frequency, low CTR)
 *   - Daily KPI summary per platform
 *   - Enriched LIAM context string for Gemini prompts
 */
import db from '../config/database.js';

export class AdIntelligenceService {
  // ── Daily KPIs summary ───────────────────────────────────────────────────
  async getDailyKPIs(storeId = 1, days = 7) {
    const since = new Date(Date.now() - days * 864e5).toISOString().split('T')[0];

    const rows = await db('ad_performance_snapshots')
      .where('store_id', storeId)
      .where('date_stop', '>=', since)
      .select('platform',
        db.raw('SUM(spend) as total_spend'),
        db.raw('SUM(purchases) as total_purchases'),
        db.raw('SUM(purchase_value) as total_revenue'),
        db.raw('SUM(impressions) as total_impressions'),
        db.raw('SUM(clicks) as total_clicks'),
        db.raw('AVG(roas) as avg_roas'),
        db.raw('AVG(cpa) as avg_cpa'),
        db.raw('AVG(ctr) as avg_ctr'),
        db.raw('bool_or(is_simulated) as is_simulated')
      )
      .groupBy('platform');

    const kpis = {};
    for (const r of rows) {
      kpis[r.platform] = {
        spend:        Math.round(parseFloat(r.total_spend || 0)),
        purchases:    parseInt(r.total_purchases || 0),
        revenue:      Math.round(parseFloat(r.total_revenue || 0)),
        impressions:  parseInt(r.total_impressions || 0),
        clicks:       parseInt(r.total_clicks || 0),
        roas:         Math.round(parseFloat(r.avg_roas || 0) * 100) / 100,
        cpa:          Math.round(parseFloat(r.avg_cpa || 0)),
        ctr:          Math.round(parseFloat(r.avg_ctr || 0) * 100) / 100,
        isSimulated:  r.is_simulated,
      };
    }

    // Totals across platforms
    const all = Object.values(kpis);
    kpis.total = {
      spend:     all.reduce((s, p) => s + p.spend, 0),
      purchases: all.reduce((s, p) => s + p.purchases, 0),
      revenue:   all.reduce((s, p) => s + p.revenue, 0),
      roas:      kpis.total?.roas || (all.length
        ? Math.round(all.reduce((s, p) => s + p.roas, 0) / all.length * 100) / 100
        : 0),
    };

    return kpis;
  }

  // ── Top products by ROAS ─────────────────────────────────────────────────
  async getTopProducts(storeId = 1, limit = 5) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];

    // Aggregate by campaign name (proxy for product when product_id not linked)
    const rows = await db('ad_performance_snapshots')
      .where('store_id', storeId)
      .where('date_stop', '>=', since)
      .select(
        'campaign_name',
        'platform',
        db.raw('SUM(spend) as spend'),
        db.raw('SUM(purchases) as purchases'),
        db.raw('SUM(purchase_value) as revenue'),
        db.raw('AVG(roas) as roas'),
        db.raw('AVG(cpa) as cpa'),
      )
      .groupByRaw('campaign_name, platform')
      .orderBy('roas', 'desc')
      .limit(limit);

    return rows.map(r => ({
      name:      r.campaign_name,
      platform:  r.platform,
      spend:     Math.round(parseFloat(r.spend || 0)),
      purchases: parseInt(r.purchases || 0),
      revenue:   Math.round(parseFloat(r.revenue || 0)),
      roas:      Math.round(parseFloat(r.roas || 0) * 100) / 100,
      cpa:       Math.round(parseFloat(r.cpa || 0)),
    }));
  }

  // ── Burnt / fatigued ads (freq > 3.5 or CTR declining) ──────────────────
  async getBurntAds(storeId = 1) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];

    const rows = await db('ad_performance_snapshots')
      .where('store_id', storeId)
      .where('date_stop', '>=', since)
      .where('frequency', '>', 3.5)
      .orderBy('frequency', 'desc')
      .limit(10);

    return rows.map(r => ({
      adName:    r.ad_name || r.campaign_name,
      platform:  r.platform,
      frequency: parseFloat(r.frequency),
      ctr:       parseFloat(r.ctr),
      spend:     parseFloat(r.spend),
      roas:      parseFloat(r.roas),
      alert:     r.frequency > 4.5 ? 'CRÍTICO — Cambiar creativo inmediatamente' : 'ADVERTENCIA — Creativo próximo a saturarse',
    }));
  }

  // ── Build LIAM context string for Gemini prompt injection ────────────────
  async buildLIAMContext(storeId = 1) {
    const [kpis, topProducts, burntAds] = await Promise.all([
      this.getDailyKPIs(storeId),
      this.getTopProducts(storeId, 3),
      this.getBurntAds(storeId),
    ]);

    const simNote = (kpis.meta?.isSimulated || kpis.tiktok?.isSimulated)
      ? '\n⚠️ DATOS EN MODO SIMULACIÓN — Conecta tus credenciales reales de Meta/TikTok en Settings para ver datos reales.'
      : '';

    const metaStr = kpis.meta
      ? `Meta Ads (últimos 7 días): Gasto=$${(kpis.meta.spend/1000).toFixed(0)}K COP | ROAS=${kpis.meta.roas}x | CPA=$${(kpis.meta.cpa/1000).toFixed(0)}K COP | Compras=${kpis.meta.purchases} | CTR=${kpis.meta.ctr}%`
      : 'Meta Ads: Sin datos disponibles.';

    const tiktokStr = kpis.tiktok
      ? `TikTok Ads (últimos 7 días): Gasto=$${(kpis.tiktok.spend/1000).toFixed(0)}K COP | ROAS=${kpis.tiktok.roas}x | CPA=$${(kpis.tiktok.cpa/1000).toFixed(0)}K COP | Compras=${kpis.tiktok.purchases}`
      : 'TikTok Ads: Sin datos disponibles.';

    const topStr = topProducts.length
      ? `TOP CAMPAÑAS POR ROAS:\n${topProducts.map((p, i) => `  ${i+1}. [${p.platform.toUpperCase()}] ${p.name} → ROAS ${p.roas}x | CPA $${(p.cpa/1000).toFixed(0)}K | ${p.purchases} compras`).join('\n')}`
      : 'Sin campañas activas registradas.';

    const burntStr = burntAds.length
      ? `ALERTAS DE CREATIVOS:\n${burntAds.map(a => `  ⚠️ ${a.adName} → Frecuencia ${a.frequency.toFixed(1)} — ${a.alert}`).join('\n')}`
      : 'No hay creativos quemados detectados.';

    return `=== CONTEXTO DE PAUTA PUBLICITARIA ===\n${metaStr}\n${tiktokStr}\n\n${topStr}\n\n${burntStr}${simNote}\n=== FIN CONTEXTO PAUTA ===`;
  }
}
