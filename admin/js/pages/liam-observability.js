import { api } from '../lib/api.js';

function metricCard(title, value, subtitle, color = 'var(--brand-primary)') {
  return `
    <div class="card" style="padding: 1.5rem; text-align:center; border-left: 4px solid ${color};">
      <div style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">${title}</div>
      <div style="font-size:2rem; font-weight:700; color:var(--text); font-family:var(--font-display);">${value}</div>
      ${subtitle ? `<div style="color:var(--text-secondary); font-size:0.75rem; margin-top:0.25rem;">${subtitle}</div>` : ''}
    </div>
  `;
}

function funnelBar(label, count, pct, maxCount, color = '#6366f1') {
  const barW = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return `
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem;">
      <div style="width:140px; text-align:right; color:var(--text-secondary); font-size:0.85rem;">${label}</div>
      <div style="flex:1; height:28px; background:rgba(255,255,255,0.05); border-radius:14px; overflow:hidden; position:relative;">
        <div style="height:100%; width:${barW}%; background:${color}; border-radius:14px; transition:width 0.6s ease;"></div>
      </div>
      <div style="width:60px; text-align:right; font-weight:600; color:var(--text); font-family:var(--font-display);">${count}</div>
      <div style="width:60px; text-align:right; color:var(--text-secondary); font-size:0.80rem;">${pct}</div>
    </div>
  `;
}

function timelineSparkline(data, key, color) {
  if (!data || data.length === 0) return '<div style="color:var(--text-secondary); padding:1rem; text-align:center;">Sin datos aún</div>';
  const max = Math.max(...data.map(d => d[key]), 1);
  const barH = 80;
  return `
    <div style="display:flex; align-items:flex-end; gap:2px; height:${barH}px; padding:0.5rem 0;">
      ${data.map(d => {
        const h = Math.round((d[key] / max) * barH);
        return `<div style="flex:1; height:${h}px; background:${color}; border-radius:2px 2px 0 0;" title="${d.hour}: ${d[key]}"></div>`;
      }).join('')}
    </div>
  `;
}

function healthDot(status) {
  return `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${status ? 'var(--brand-accent)' : 'var(--brand-danger)'}; margin-right:6px;"></span>`;
}

export function render() {
  return `
    <div style="animation: fadeIn 0.4s ease forwards; padding: 2rem 2rem 4rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div>
          <h1 style="font-family:var(--font-display); font-size:1.5rem; font-weight:700; margin:0; color:var(--text);">🔍 LIAM Observability</h1>
          <p style="color:var(--text-secondary); margin:0.25rem 0 0; font-size:0.9rem;">Telemetría en vivo — <span id="o11y-updated-at">cargando...</span></p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="document.querySelector('#o11y-root').__refresh()">↻ Refrescar</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:1rem; margin-bottom:2rem;" id="o11y-summary">
        ${metricCard('Sesiones', '...', 'hoy')}
        ${metricCard('Visitantes', '...', 'únicos hoy')}
        ${metricCard('Eventos', '...', 'hoy')}
        ${metricCard('Conversiones', '...', 'hoy')}
        ${metricCard('Revenue', '...', 'hoy')}
        ${metricCard('Reembolsos', '...', 'hoy')}
      </div>

      <div style="display:grid; grid-template-columns:3fr 2fr; gap:1.5rem; margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;">
          <h3 style="margin:0 0 1.25rem; font-family:var(--font-display); font-size:1rem; color:var(--text);">Embudo (7 días)</h3>
          <div id="o11y-funnel"><div style="color:var(--text-secondary); text-align:center; padding:2rem;">Cargando...</div></div>
        </div>
        <div class="card" style="padding:1.5rem;">
          <h3 style="margin:0 0 1.25rem; font-family:var(--font-display); font-size:1rem; color:var(--text);">Rendimiento</h3>
          <div id="o11y-performance" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            ${['CR', 'CTR', 'AOV', 'Refund Rate'].map(m => `
              <div style="text-align:center;">
                <div style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase;">${m}</div>
                <div style="font-size:1.4rem; font-weight:700; color:var(--text); font-family:var(--font-display);" class="o11y-perf-value">...</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.06); display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div><span style="color:var(--text-secondary);">Sesiones 7d:</span> <span id="o11y-sessions7d" style="font-weight:600;">...</span></div>
            <div><span style="color:var(--text-secondary);">Visitantes únicos:</span> <span id="o11y-visitors7d" style="font-weight:600;">...</span></div>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1.5rem; margin-bottom:2rem;">
        <div class="card" style="padding:1.25rem;">
          <h3 style="margin:0 0 0.75rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">🏆 Theme</h3>
          <div id="o11y-winner-theme" style="color:var(--text-secondary);">Sin datos</div>
        </div>
        <div class="card" style="padding:1.25rem;">
          <h3 style="margin:0 0 0.75rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">🏆 CTA</h3>
          <div id="o11y-winner-cta" style="color:var(--text-secondary);">Sin datos</div>
        </div>
        <div class="card" style="padding:1.25rem;">
          <h3 style="margin:0 0 0.75rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">🏆 Bundle</h3>
          <div id="o11y-winner-bundle" style="color:var(--text-secondary);">Sin datos</div>
        </div>
      </div>

      <div class="card" style="padding:1.5rem; margin-bottom:2rem;">
        <h3 style="margin:0 0 1rem; font-family:var(--font-display); font-size:1rem; color:var(--text);">Timeline (48h)</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.5rem;">
          <div>
            <div style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; margin-bottom:0.5rem;">Page Views</div>
            <div id="o11y-timeline-pv"></div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; margin-bottom:0.5rem;">CTA Clicks</div>
            <div id="o11y-timeline-cta"></div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; margin-bottom:0.5rem;">Conversiones</div>
            <div id="o11y-timeline-purchases"></div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:1.5rem;">
        <h3 style="margin:0 0 1rem; font-family:var(--font-display); font-size:1rem; color:var(--text);">Health ⚡</h3>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem;">
          <div id="o11y-health-events">${metricCard('Eventos/min', '...', '', 'var(--brand-accent)')}</div>
          <div id="o11y-health-sessions">${metricCard('Sesiones activas', '...', 'última hora', 'var(--brand-secondary)')}</div>
          <div id="o11y-health-errors" style="grid-column:span 2;">
            <div class="card" style="padding:1rem;">
              <div style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; margin-bottom:0.5rem;">Errores de tracking (última hora)</div>
              <div id="o11y-health-errors-list" style="color:var(--text-secondary); font-size:0.85rem;">Sin errores</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  const root = document.getElementById('o11y-root') || document.querySelector('#app > div');
  root.__refresh = refresh;
  await refresh();
}

async function refresh() {
  try {
    const res = await api.get('/admin/liam-observability');
    if (!res.success) throw new Error('API error');
    const d = res.data;

    document.getElementById('o11y-updated-at').textContent = new Date().toLocaleString('es-CO');

    // ── Summary ──
    const summaryCards = document.querySelectorAll('#o11y-summary > div');
    const summary = d.summary;
    const summaryData = [
      { v: summary.sessionsToday.toLocaleString('es-CO'), s: 'hoy' },
      { v: summary.uniqueVisitorsToday.toLocaleString('es-CO'), s: 'únicos hoy' },
      { v: summary.eventsToday.toLocaleString('es-CO'), s: 'hoy' },
      { v: summary.purchasesToday.toLocaleString('es-CO'), s: 'hoy' },
      { v: '$' + Math.round(summary.revenueToday).toLocaleString('es-CO'), s: 'hoy' },
      { v: summary.refundsToday.toLocaleString('es-CO'), s: 'hoy' },
    ];
    summaryCards.forEach((card, i) => {
      const vEl = card.querySelector('div:nth-child(2)');
      const sEl = card.querySelector('div:nth-child(3)');
      if (vEl) vEl.textContent = summaryData[i].v;
      if (sEl) sEl.textContent = summaryData[i].s;
    });

    // ── Funnel ──
    const funnel = d.funnel;
    const maxCount = Math.max(...funnel.map(f => f.count), 1);
    const funnelColors = ['#6366f1', '#8b5cf6', '#a855f7', '#10b981'];
    document.getElementById('o11y-funnel').innerHTML = funnel.map((f, i) =>
      funnelBar(
        f.event.replace(/_/g, ' '),
        f.count,
        f.conversion + '%',
        maxCount,
        funnelColors[i]
      )
    ).join('');

    // ── Performance ──
    const perf = d.performance;
    const perfEls = document.querySelectorAll('.o11y-perf-value');
    const perfValues = [perf.cr, perf.ctr, perf.aov, perf.refundRate];
    perfEls.forEach((el, i) => { el.textContent = perfValues[i]; });
    document.getElementById('o11y-sessions7d').textContent = perf.sessions7d.toLocaleString('es-CO');
    document.getElementById('o11y-visitors7d').textContent = perf.uniqueVisitors7d.toLocaleString('es-CO');

    // ── Winners ──
    function renderWinner(el, data, label) {
      if (data) {
        let extra = `<div style="color:var(--brand-accent); font-size:0.85rem;">CR ${data.cr} (${data.purchases || '?'} compras)</div>`;
        if (data.lift) extra += `<div style="font-size:0.85rem;">Lift <span style="color:var(--brand-success); font-weight:600;">+${data.lift}</span></div>`;
        if (data.confidence) extra += `<div style="font-size:0.85rem;">Confianza <span style="font-weight:600;">${data.confidence}</span></div>`;
        if (data.sample) extra += `<div style="font-size:0.8rem; color:var(--text-secondary);">${data.sample.toLocaleString('es-CO')} sesiones</div>`;
        el.innerHTML = `<div style="font-weight:600; color:var(--text); font-family:var(--font-display); font-size:1.1rem;">${data.key}</div>${extra}`;
      } else {
        el.textContent = 'Sin datos suficientes';
      }
    }
    renderWinner(document.getElementById('o11y-winner-theme'), d.winners.theme);
    renderWinner(document.getElementById('o11y-winner-cta'), d.winners.cta);
    renderWinner(document.getElementById('o11y-winner-bundle'), d.winners.bundle);

    // ── Timeline ──
    const tl = d.timeline || [];
    document.getElementById('o11y-timeline-pv').innerHTML = timelineSparkline(tl, 'pageViews', '#6366f1');
    document.getElementById('o11y-timeline-cta').innerHTML = timelineSparkline(tl, 'ctaClicks', '#8b5cf6');
    document.getElementById('o11y-timeline-purchases').innerHTML = timelineSparkline(tl, 'purchases', '#10b981');

    // ── Health ──
    const health = d.health;
    const eventsMinEl = document.querySelector('#o11y-health-events .card div:nth-child(2)');
    if (eventsMinEl) eventsMinEl.textContent = health.eventsPerMin;
    const activeEl = document.querySelector('#o11y-health-sessions .card div:nth-child(2)');
    if (activeEl) activeEl.textContent = health.activeSessions;

    const errorsList = document.getElementById('o11y-health-errors-list');
    if (health.trackingErrors && health.trackingErrors.length > 0) {
      errorsList.innerHTML = health.trackingErrors.map(e =>
        `<div style="display:flex; gap:0.5rem; margin-bottom:0.25rem;">
          <span style="color:var(--brand-danger);">✕</span>
          <span style="flex:1;">${e.event}: ${e.error}</span>
          <span style="color:var(--text-secondary); font-size:0.75rem;">${new Date(e.time).toLocaleTimeString('es-CO')}</span>
        </div>`
      ).join('');
    }

  } catch (err) {
    document.getElementById('o11y-summary').innerHTML =
      `<div class="card" style="padding:2rem; text-align:center; grid-column:1/-1;">
        <div style="color:var(--brand-danger); font-size:1.2rem; margin-bottom:0.5rem;">⚠️ Error cargando datos</div>
        <div style="color:var(--text-secondary); font-size:0.85rem;">${err.message}</div>
      </div>`;
  }
}
