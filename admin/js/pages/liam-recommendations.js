import { api } from '../lib/api.js';

async function loadProducts() {
  const res = await api.get('/products');
  return res.success ? res.data : [];
}

function statusBadge(status) {
  const colors = { has_winners: '#10b981', insufficient_data: '#f59e0b', no_data: '#6b7280' };
  const labels = { has_winners: 'Con datos', insufficient_data: 'Insuficiente', no_data: 'Sin datos' };
  return `<span style="display:inline-block; padding:0.15rem 0.5rem; border-radius:999px; font-size:0.75rem; background:${colors[status] || '#6b7280'}22; color:${colors[status] || '#6b7280'}; font-weight:500;">${labels[status] || status}</span>`;
}

function confidenceBar(pct) {
  const p = Math.min(Math.max(Math.round(parseFloat(pct) * 100) || 0, 0), 100);
  const color = p >= 95 ? '#10b981' : p >= 90 ? '#f59e0b' : '#6b7280';
  return `<div style="width:100%; height:6px; background:#1e293b; border-radius:3px; margin-top:0.25rem;">
    <div style="width:${p}%; height:6px; background:${color}; border-radius:3px; transition:width 0.5s;"></div>
  </div>`;
}

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">LIAM Recommendations</h1>
        <p style="color:var(--text-secondary); font-size:0.85rem;">Recomendaciones estadísticas por producto — basadas en telemetría agregada</p>
      </div>
      <button id="recs-refresh" class="btn btn-primary" style="display:flex; align-items:center; gap:0.5rem;">
        <span>⟳</span> Actualizar
      </button>
    </div>

    <div id="recs-controls" style="display:flex; gap:1rem; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap;">
      <label style="color:var(--text-secondary); font-size:0.85rem;">
        Producto
        <select id="recs-product-select" class="form-input" style="margin-left:0.5rem; min-width:200px;">
          <option value="">— Seleccionar producto —</option>
        </select>
      </label>
      <label style="color:var(--text-secondary); font-size:0.85rem;">
        Días
        <select id="recs-days" class="form-input" style="margin-left:0.5rem; width:80px;">
          <option value="30">30</option>
          <option value="60">60</option>
          <option value="90" selected>90</option>
          <option value="180">180</option>
        </select>
      </label>
      <label style="color:var(--text-secondary); font-size:0.85rem;">
        Min. vistas
        <input id="recs-min-views" type="number" value="300" class="form-input" style="margin-left:0.5rem; width:80px;">
      </label>
      <button id="recs-analyze" class="btn btn-secondary">Analizar</button>
    </div>

    <div id="recs-results">
      <div class="card" style="padding:2rem; text-align:center;">
        <div style="color:var(--text-secondary); font-size:1.1rem; margin-bottom:0.5rem;">Selecciona un producto y haz clic en "Analizar"</div>
        <div style="color:var(--text-secondary); font-size:0.85rem;">Las recomendaciones usan test Z de dos proporciones con control agregado</div>
      </div>
    </div>
  `;
}

export async function init() {
  const products = await loadProducts();
  const select = document.getElementById('recs-product-select');
  if (products.length > 0) {
    select.innerHTML = '<option value="">— Seleccionar producto —</option>' +
      products.map(p => `<option value="${p.id}">${p.name || p.title || p.id}</option>`).join('');
  }

  document.getElementById('recs-refresh').addEventListener('click', () => loadRecs());
  document.getElementById('recs-analyze').addEventListener('click', () => loadRecs());

  async function loadRecs() {
    const productId = document.getElementById('recs-product-select').value;
    if (!productId) { document.getElementById('recs-product-select').focus(); return; }

    const days = document.getElementById('recs-days').value;
    const minViews = document.getElementById('recs-min-views').value;

    const container = document.getElementById('recs-results');
    container.innerHTML = '<div class="card" style="padding:2rem; text-align:center; color:var(--text-secondary);">⏳ Analizando...</div>';

    try {
      const res = await api.get(`/admin/products/${productId}/recommendations?days=${days}&minViews=${minViews}`);
      if (!res.success) throw new Error(res.error?.message || 'API error');
      renderResults(container, res.data);
    } catch (err) {
      container.innerHTML = `<div class="card" style="padding:2rem; text-align:center;">
        <div style="color:var(--brand-danger); font-size:1.1rem; margin-bottom:0.5rem;">Error</div>
        <div style="color:var(--text-secondary); font-size:0.85rem;">${err.message}</div>
      </div>`;
    }
  }
}

function renderResults(container, data) {
  const recs = data.recommendations || {};
  const summary = data.summary || {};
  const hasWinners = Object.keys(recs).length > 0;

  let html = `<div class="card" style="margin-bottom:1rem; padding:1rem;">
    <div style="display:flex; gap:2rem; flex-wrap:wrap;">
      <div><span style="color:var(--text-secondary);">Estado:</span> ${statusBadge(summary.status)}</div>
      <div><span style="color:var(--text-secondary);">Sesiones:</span> <strong>${(summary.totalSessions || 0).toLocaleString('es-CO')}</strong></div>
      <div><span style="color:var(--text-secondary);">Conversiones:</span> <strong>${(summary.totalConversions || 0).toLocaleString('es-CO')}</strong></div>
      <div><span style="color:var(--text-secondary);">Período:</span> <strong>${summary.period || '-'}</strong></div>
    </div>
  </div>`;

  if (!hasWinners) {
    html += `<div class="card" style="padding:2rem; text-align:center;">
      <div style="color:var(--text-secondary); font-size:1.1rem; margin-bottom:0.5rem;">📊 Datos insuficientes</div>
      <div style="color:var(--text-secondary); font-size:0.85rem;">Se requieren ≥${summary.evaluations?.theme?.[0]?.views || 300} vistas y ≥${summary.evaluations?.theme?.[0]?.conversions || 15} conversiones por variante para obtener significancia estadística.</div>
    </div>`;
  } else {
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1rem;">';

    for (const [dim, r] of Object.entries(recs)) {
      const dimLabel = { theme: 'Tema', cta: 'CTA', bundle: 'Bundle' }[dim] || dim;
      html += `<div class="card" style="padding:1.25rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
          <span style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">${dimLabel}</span>
          <span style="margin-left:auto;">${r.status === 'winner' ? '🏆' : '📊'}</span>
        </div>
        <div style="font-size:1.3rem; font-weight:700; font-family:var(--font-display); color:var(--text); margin-bottom:0.5rem;">${r.winner}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.85rem;">
          <div><span style="color:var(--text-secondary);">CR:</span> <span style="font-weight:600;">${r.conversionRate}%</span></div>
          <div><span style="color:var(--text-secondary);">Lift:</span> <span style="font-weight:600; color:var(--brand-success);">+${r.lift}%</span></div>
          <div><span style="color:var(--text-secondary);">Confianza:</span> <span style="font-weight:600;">${Math.round(r.confidence * 100)}%</span></div>
          <div><span style="color:var(--text-secondary);">Sesiones:</span> <span style="font-weight:600;">${r.sample.toLocaleString('es-CO')}</span></div>
          <div><span style="color:var(--text-secondary);">Conversiones:</span> <span style="font-weight:600;">${r.conversions}</span></div>
          <div><span style="color:var(--text-secondary);">p-value:</span> <span style="font-weight:600;">${r.pValue.toFixed(4)}</span></div>
        </div>
        ${confidenceBar(r.confidence)}
        <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">${r.reason}</div>
      </div>`;
    }
    html += '</div>';
  }

  // Evaluations table
  const evals = summary.evaluations || {};
  const allEvals = [...(evals.theme || []), ...(evals.cta || []), ...(evals.bundle || [])];
  if (allEvals.length > 0) {
    html += '<h3 style="margin:1.5rem 0 0.75rem; font-size:1rem;">Todas las variantes evaluadas</h3>';
    html += '<div class="table-container" style="overflow-x:auto;"><table class="data-table" style="width:100%;"><thead><tr>' +
      '<th>Dimensión</th><th>Variante</th><th>CR</th><th>Vistas</th><th>Conversiones</th><th>p-value</th><th>Lift</th><th>Significativo</th>' +
      '</tr></thead><tbody>';
    for (const e of evals.theme || []) {
      html += `<tr><td>Tema</td><td>${e.key || '-'}</td><td>${e.cr || 0}%</td><td>${e.views.toLocaleString('es-CO')}</td><td>${e.conversions}</td><td>${e.pValue.toFixed(4)}</td><td>${e.lift != null ? (e.lift > 0 ? '+' : '') + e.lift + '%' : '-'}</td><td>${e.significant ? '✅' : '❌'}</td></tr>`;
    }
    for (const e of evals.cta || []) {
      html += `<tr><td>CTA</td><td>${e.key || '-'}</td><td>${e.cr || 0}%</td><td>${e.views.toLocaleString('es-CO')}</td><td>${e.conversions}</td><td>${e.pValue.toFixed(4)}</td><td>${e.lift != null ? (e.lift > 0 ? '+' : '') + e.lift + '%' : '-'}</td><td>${e.significant ? '✅' : '❌'}</td></tr>`;
    }
    for (const e of evals.bundle || []) {
      html += `<tr><td>Bundle</td><td>${e.key || '-'}</td><td>${e.cr || 0}%</td><td>${e.views.toLocaleString('es-CO')}</td><td>${e.conversions}</td><td>${e.pValue.toFixed(4)}</td><td>${e.lift != null ? (e.lift > 0 ? '+' : '') + e.lift + '%' : '-'}</td><td>${e.significant ? '✅' : '❌'}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}
