import db from '../config/database.js';

const BATCH_SIZE = 500;

export class TelemetryAggregator {
  /**
   * Near real-time: copia eventos recientes a liam_daily_metrics
   * Procesa lotes de eventos no agregados, actualiza KPIs por upsert
   */
  async aggregateRecent() {
    const cutoff = await this.getLastAggregatedAt();
    const raw = await db('liam_events')
      .join('liam_sessions', 'liam_events.session_id', 'liam_sessions.session_id')
      .where('liam_events.created_at', '>', cutoff)
      .whereNotNull('liam_sessions.product_id')
      .limit(BATCH_SIZE)
      .select(
        'liam_events.event_type',
        'liam_events.created_at',
        'liam_sessions.product_id',
        'liam_sessions.landing_version',
        'liam_sessions.theme_key',
        'liam_sessions.cta_key',
        'liam_sessions.bundle_key',
        'liam_sessions.traffic_source',
        'liam_sessions.experiment_variant',
        'liam_sessions.converted',
        'liam_sessions.revenue',
        'liam_sessions.anonymous_visitor_id'
      );

    if (raw.length === 0) return;

    const grouped = {};
    for (const row of raw) {
      const dateStr = row.created_at.toISOString().slice(0, 10);
      const key = `${row.product_id}|${row.landing_version}|${dateStr}|${row.theme_key}|${row.cta_key}|${row.bundle_key}|${row.traffic_source}|${row.experiment_variant}`;

      if (!grouped[key]) {
        grouped[key] = {
          product_id: row.product_id,
          landing_version: row.landing_version,
          date: dateStr,
          theme_key: row.theme_key,
          cta_key: row.cta_key,
          bundle_key: row.bundle_key,
          traffic_source: row.traffic_source,
          experiment_variant: row.experiment_variant,
          page_views: 0, sessions: 0,
          unique_visitors: new Set(),
          scroll_50_count: 0, cta_clicks: 0,
          checkout_starts: 0, checkout_completes: 0,
          purchases: 0, refunds: 0,
          revenue: 0, refund_amount: 0,
        };
      }

      const g = grouped[key];

      if (row.event_type === 'page_view') {
        g.page_views++;
        if (row.anonymous_visitor_id) g.unique_visitors.add(row.anonymous_visitor_id);
      }
      if (row.event_type === 'scroll_50') g.scroll_50_count++;
      if (row.event_type === 'cta_click') g.cta_clicks++;
      if (row.event_type === 'checkout_start') g.checkout_starts++;
      if (row.event_type === 'checkout_complete') g.checkout_completes++;
      if (row.event_type === 'purchase') {
        g.purchases++;
        if (row.revenue) g.revenue += parseFloat(row.revenue);
      }
      if (row.event_type === 'refund') {
        g.refunds++;
        const refundPayload = await this.getRefundAmount(row.event_type, row.product_id);
        if (refundPayload) g.refund_amount += refundPayload;
      }
    }

    for (const key of Object.keys(grouped)) {
      const g = grouped[key];
      const sessionsCount = await db('liam_sessions')
        .where({ product_id: g.product_id })
        .whereRaw('DATE(created_at) = ?', [g.date])
        .count('* as total')
        .first();
      g.sessions = parseInt(sessionsCount?.total || 0, 10);
      g.unique_visitors = g.unique_visitors.size;

      const views = g.page_views || 1;
      g.ctr = views > 0 ? g.cta_clicks / views : 0;
      g.conversion_rate = views > 0 ? g.purchases / views : 0;
      g.aov = g.purchases > 0 ? g.revenue / g.purchases : 0;
      g.refund_rate = g.purchases > 0 ? g.refunds / g.purchases : 0;

      const conflictCols = ['product_id', 'landing_version', 'date', 'theme_key', 'cta_key', 'bundle_key', 'traffic_source'];

      await db('liam_daily_metrics')
        .insert({
          ...g,
          unique_visitors: g.unique_visitors,
          experiment_variant: g.experiment_variant || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(conflictCols)
        .merge({
          page_views: db.raw('liam_daily_metrics.page_views + ?', [g.page_views]),
          sessions: db.raw('GREATEST(liam_daily_metrics.sessions, ?)', [g.sessions]),
          unique_visitors: db.raw('GREATEST(liam_daily_metrics.unique_visitors, ?)', [g.unique_visitors]),
          scroll_50_count: db.raw('liam_daily_metrics.scroll_50_count + ?', [g.scroll_50_count]),
          cta_clicks: db.raw('liam_daily_metrics.cta_clicks + ?', [g.cta_clicks]),
          checkout_starts: db.raw('liam_daily_metrics.checkout_starts + ?', [g.checkout_starts]),
          checkout_completes: db.raw('liam_daily_metrics.checkout_completes + ?', [g.checkout_completes]),
          purchases: db.raw('liam_daily_metrics.purchases + ?', [g.purchases]),
          refunds: db.raw('liam_daily_metrics.refunds + ?', [g.refunds]),
          revenue: db.raw('liam_daily_metrics.revenue + ?', [g.revenue]),
          refund_amount: db.raw('liam_daily_metrics.refund_amount + ?', [g.refund_amount]),
          ctr: db.raw('(liam_daily_metrics.cta_clicks + ?) / NULLIF((liam_daily_metrics.page_views + ?), 0)', [g.cta_clicks, g.page_views]),
          conversion_rate: db.raw('(liam_daily_metrics.purchases + ?) / NULLIF((liam_daily_metrics.page_views + ?), 0)', [g.purchases, g.page_views]),
          aov: db.raw('(liam_daily_metrics.revenue + ?) / NULLIF((liam_daily_metrics.purchases + ?), 0)', [g.revenue, g.purchases]),
          refund_rate: db.raw('(liam_daily_metrics.refunds + ?) / NULLIF((liam_daily_metrics.purchases + ?), 0)', [g.refunds, g.purchases]),
          updated_at: new Date(),
        });
    }

    await this.updateLastAggregatedAt();
    return { processed: raw.length, groups: Object.keys(grouped).length };
  }

  async getRefundAmount(eventType, productId) {
    if (eventType !== 'refund') return 0;
    const latestRefund = await db('liam_events')
      .where({ product_id: productId, event_type: 'refund' })
      .orderBy('created_at', 'desc')
      .first();
    if (latestRefund?.payload?.amount) return parseFloat(latestRefund.payload.amount);
    return 0;
  }

  /**
   * Nightly: recalcula todas las métricas del día anterior desde cero
   */
  async nightlyRebuild(dateStr) {
    const targetDate = dateStr || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    await db('liam_daily_metrics').where({ date: targetDate }).del();

    const sessions = await db('liam_sessions')
      .whereRaw('DATE(created_at) = ?', [targetDate])
      .whereNotNull('product_id');

    const grouped = {};
    for (const s of sessions) {
      const key = `${s.product_id}|${s.landing_version}|${targetDate}|${s.theme_key}|${s.cta_key}|${s.bundle_key}|${s.traffic_source}|${s.experiment_variant}`;
      if (!grouped[key]) {
        grouped[key] = {
          product_id: s.product_id, landing_version: s.landing_version, date: targetDate,
          theme_key: s.theme_key, cta_key: s.cta_key, bundle_key: s.bundle_key,
          traffic_source: s.traffic_source, experiment_variant: s.experiment_variant,
          sessions: 0, unique_visitors: new Set(),
          page_views: 0, scroll_50_count: 0, cta_clicks: 0,
          checkout_starts: 0, checkout_completes: 0,
          purchases: 0, refunds: 0, revenue: 0, refund_amount: 0,
        };
      }
      const g = grouped[key];
      g.sessions++;
      if (s.anonymous_visitor_id) g.unique_visitors.add(s.anonymous_visitor_id);
    }

    const events = await db('liam_events')
      .join('liam_sessions', 'liam_events.session_id', 'liam_sessions.session_id')
      .whereRaw('DATE(liam_events.created_at) = ?', [targetDate])
      .select(
        'liam_events.event_type', 'liam_events.payload',
        'liam_sessions.product_id', 'liam_sessions.landing_version',
        'liam_sessions.theme_key', 'liam_sessions.cta_key', 'liam_sessions.bundle_key',
        'liam_sessions.traffic_source', 'liam_sessions.experiment_variant',
        'liam_sessions.revenue'
      );

    for (const e of events) {
      const key = `${e.product_id}|${e.landing_version}|${targetDate}|${e.theme_key}|${e.cta_key}|${e.bundle_key}|${e.traffic_source}|${e.experiment_variant}`;
      const g = grouped[key];
      if (!g) continue;

      if (e.event_type === 'page_view') g.page_views++;
      else if (e.event_type === 'scroll_50') g.scroll_50_count++;
      else if (e.event_type === 'cta_click') g.cta_clicks++;
      else if (e.event_type === 'checkout_start') g.checkout_starts++;
      else if (e.event_type === 'checkout_complete') g.checkout_completes++;
      else if (e.event_type === 'purchase') { g.purchases++; if (e.revenue) g.revenue += parseFloat(e.revenue); }
      else if (e.event_type === 'refund') {
        g.refunds++;
        if (e.payload?.amount) g.refund_amount += parseFloat(e.payload.amount);
      }
    }

    const batch = Object.values(grouped).map(g => ({
      ...g,
      unique_visitors: g.unique_visitors.size,
      ctr: g.page_views > 0 ? (g.cta_clicks / g.page_views) : 0,
      conversion_rate: g.page_views > 0 ? (g.purchases / g.page_views) : 0,
      aov: g.purchases > 0 ? (g.revenue / g.purchases) : 0,
      refund_rate: g.purchases > 0 ? (g.refunds / g.purchases) : 0,
    }));

    if (batch.length > 0) {
      await db('liam_daily_metrics').insert(batch);
    }

    return { date: targetDate, groups: batch.length };
  }

  async getLastAggregatedAt() {
    const row = await db('settings')
      .where({ key: 'liam.last_aggregated_at' })
      .first();
    if (row?.value) return new Date(row.value);
    return new Date(0);
  }

  async updateLastAggregatedAt() {
    await db('settings')
      .insert({
        key: 'liam.last_aggregated_at',
        value: new Date().toISOString(),
        store_id: 1,
      })
      .onConflict(['key', 'store_id'])
      .merge({ value: new Date().toISOString() });
  }
}
