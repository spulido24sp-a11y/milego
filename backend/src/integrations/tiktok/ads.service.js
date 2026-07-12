/**
 * TikTokAdsService — TikTok Marketing API v1.3
 *
 * Fetches campaign performance and persists to ad_performance_snapshots.
 * Falls back to simulation mode if credentials are not configured.
 *
 * Credentials required in settings table:
 *   tiktok_ads_access_token   → TikTok Marketing API access token
 *   tiktok_ads_advertiser_id  → Advertiser ID from TikTok Business Center
 */
import db from '../../config/database.js';

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

export class TikTokAdsService {
  constructor() {
    this.accessToken = null;
    this.advertiserId = null;
    this.storeId = null;
    this.simulated = false;
  }

  async initialize(storeId = 1) {
    this.storeId = storeId;
    const settings = await db('settings')
      .where('store_id', storeId)
      .whereIn('key', ['tiktok_ads_access_token', 'tiktok_ads_advertiser_id'])
      .select('key', 'value');

    for (const s of settings) {
      const val = s.value ? JSON.parse(s.value) : null;
      if (s.key === 'tiktok_ads_access_token') this.accessToken = val;
      if (s.key === 'tiktok_ads_advertiser_id') this.advertiserId = val;
    }

    if (!this.accessToken || !this.advertiserId) {
      console.info('[TikTokAds] Credentials not configured — operating in SIMULATION mode.');
      this.simulated = true;
    }
  }

  // ── Fetch insights from TikTok Marketing API ─────────────────────────────
  async fetchInsights(dateRange) {
    if (this.simulated) return this._generateSimulatedInsights();

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];

    const body = {
      advertiser_id: this.advertiserId,
      service_type: 'AUCTION',
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: ['campaign_id', 'stat_time_day'],
      metrics: ['campaign_name', 'spend', 'impressions', 'clicks', 'reach',
                'frequency', 'ctr', 'cpm', 'cpc', 'conversion', 'value_per_conversion',
                'real_time_conversion', 'real_time_cost_per_conversion'],
      start_date: weekAgo,
      end_date: today,
      page_size: 50,
    };

    const res = await fetch(`${TIKTOK_API_BASE}/report/integrated/get/`, {
      method: 'POST',
      headers: {
        'Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn('[TikTokAds] API error — falling back to simulation');
      return this._generateSimulatedInsights();
    }

    const json = await res.json();
    const rows = json?.data?.list || [];
    return rows.map(r => this._parseRow(r, weekAgo, today));
  }

  _parseRow(row, dateStart, dateStop) {
    const metrics = row.metrics || {};
    const spend = parseFloat(metrics.spend || 0);
    const purchases = parseInt(metrics.conversion || 0);
    const purchaseValue = parseFloat(metrics.value_per_conversion || 0) * purchases;
    const roas = spend > 0 ? purchaseValue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;

    return {
      platform: 'tiktok',
      campaign_id: row.dimensions?.campaign_id,
      campaign_name: metrics.campaign_name || 'Campaña TikTok',
      adset_id: null,
      adset_name: null,
      ad_id: null,
      ad_name: null,
      date_start: dateStart,
      date_stop: dateStop,
      impressions: parseInt(metrics.impressions || 0),
      clicks: parseInt(metrics.clicks || 0),
      reach: parseInt(metrics.reach || 0),
      frequency: parseFloat(metrics.frequency || 0),
      ctr: parseFloat(metrics.ctr || 0),
      cpm: parseFloat(metrics.cpm || 0),
      cpc: parseFloat(metrics.cpc || 0),
      spend,
      purchases,
      purchase_value: purchaseValue,
      roas: Math.round(roas * 100) / 100,
      cpa: Math.round(cpa),
      is_simulated: false,
    };
  }

  // ── Sync to database ─────────────────────────────────────────────────────
  async syncToDb(storeId) {
    await this.initialize(storeId);
    const insights = await this.fetchInsights();

    if (!insights.length) return { synced: 0, platform: 'tiktok' };

    const today = new Date().toISOString().split('T')[0];
    await db('ad_performance_snapshots')
      .where({ store_id: storeId, platform: 'tiktok', date_stop: today })
      .del();

    const rows = insights.map(i => ({
      store_id: storeId,
      platform: 'tiktok',
      ...i,
      synced_at: new Date(),
    }));

    await db('ad_performance_snapshots').insert(rows);
    console.info(`[TikTokAds] Synced ${rows.length} snapshots (simulated: ${this.simulated})`);
    return { synced: rows.length, platform: 'tiktok', simulated: this.simulated };
  }

  // ── High-fidelity simulation for Colombian TikTok ───────────────────────
  _generateSimulatedInsights() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];

    const campaigns = [
      { name: 'OrganiMax | UGC Creativo | Prospecting', spend: 45000, purchases: 7, revenue: 559300, ctr: 3.4, reach: 28000, freq: 1.6 },
      { name: 'OrganiMax | Hook Transformación | In-Feed', spend: 28000, purchases: 4, revenue: 319600, ctr: 2.9, reach: 19500, freq: 1.4 },
      { name: 'Retargeting | Viewers 75% Video', spend: 12000, purchases: 3, revenue: 239700, ctr: 6.2, reach: 4200, freq: 3.8 },
    ];

    return campaigns.map((c, i) => {
      const spend = c.spend;
      const clicks = Math.round(c.reach * c.ctr / 100);
      const impressions = Math.round(c.reach * c.freq);
      return {
        platform: 'tiktok',
        campaign_id: `SIM_TT_${i + 1}`,
        campaign_name: c.name,
        adset_id: null,
        adset_name: null,
        ad_id: null,
        ad_name: null,
        date_start: weekAgo,
        date_stop: today,
        impressions,
        clicks,
        reach: c.reach,
        frequency: c.freq,
        ctr: c.ctr,
        cpm: Math.round(spend / impressions * 1000),
        cpc: Math.round(spend / clicks),
        spend,
        purchases: c.purchases,
        purchase_value: c.revenue,
        roas: Math.round((c.revenue / spend) * 100) / 100,
        cpa: Math.round(spend / c.purchases),
        is_simulated: true,
      };
    });
  }
}
