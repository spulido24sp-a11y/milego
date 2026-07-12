import { api } from '../lib/api.js';

function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function getGrade(confidence) {
  if (confidence >= 90) return { grade: 'A+', cls: 'grade-a-plus' };
  if (confidence >= 80) return { grade: 'A', cls: 'grade-a' };
  if (confidence >= 70) return { grade: 'B+', cls: 'grade-b-plus' };
  if (confidence >= 60) return { grade: 'B', cls: 'grade-b' };
  if (confidence >= 40) return { grade: 'C', cls: 'grade-c' };
  return { grade: 'D', cls: 'grade-d' };
}

function getConfColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return '#f59e0b';
  return 'var(--danger)';
}

function statusBadge(status) {
  const map = { active: 'badge-success', draft: 'badge-warning', blocked: 'badge-danger', analyzing: 'badge-info' };
  return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
}

export function render() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      <div>
        <h2 style="font-size:1.5rem;font-weight:800;display:flex;align-items:center;gap:8px;">
          <span>🧠</span> Products Intelligence
        </h2>
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px;">
          Catálogo analizado por LIAM. Cada producto tiene score de confianza, margen y recomendación.
        </p>
      </div>
      <div style="display:flex;gap:8px;">
        <a href="#/product-radar" class="btn btn-outline">📡 Radar</a>
        <a href="#/launch" class="btn btn-primary">🚀 Nuevo Lanzamiento</a>
      </div>
    </div>

    <div id="products-error" style="display:none;"></div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
        <div style="font-size:0.85rem;color:var(--text-secondary);" id="products-count">Cargando productos...</div>
        <div style="display:flex;gap:8px;">
          <select id="products-filter" style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:6px 12px;color:var(--text);font-size:0.8rem;">
            <option value="all">Todos</option>
            <option value="analyzed">Analizados</option>
            <option value="unanalyzed">Sin analizar</option>
            <option value="top">Top confianza</option>
          </select>
        </div>
      </div>
      <div id="products-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">
        <div style="text-align:center;padding:3rem;color:var(--text-secondary);">Cargando...</div>
      </div>
    </div>
  `;
}

let allProducts = [];

export async function init() {
  document.getElementById('products-filter')?.addEventListener('change', applyFilter);
  await loadProducts();
}

async function loadProducts() {
  try {
    const result = await api.get('/products?per_page=200');
    if (!result.success) throw new Error('Error cargando productos');

    allProducts = (result.data || []).map(p => {
      const bp = p.launch_blueprint || {};
      const scores = bp.commerce_confidence_scores || {};
      const totalScore = scores.total || null;
      const offer = bp.offer || {};
      const priceCost = parseFloat(offer.price_cost) || parseFloat(p.cost_price) || 0;
      const priceUnit = parseFloat(offer.price_unit) || parseFloat(p.price) || 0;
      const margin = priceUnit > 0 ? Math.round(((priceUnit - priceCost) / priceUnit) * 100) : null;
      const decision = bp.decision || null;
      const risks = scores.competition && scores.competition < 50 ? ['Competencia alta'] : [];

      return {
        ...p,
        _confidence: totalScore,
        _grade: totalScore ? getGrade(totalScore) : null,
        _margin: margin,
        _analyzed: !!p.launch_blueprint,
        _decision: decision,
        _risks: risks,
      };
    });

    document.getElementById('products-count').textContent =
      `${allProducts.length} productos · ${allProducts.filter(p => p._analyzed).length} analizados`;

    renderProducts(allProducts);
  } catch (err) {
    console.error('Products error:', err);
    document.getElementById('products-grid').innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--danger);grid-column:1/-1;">
        Error cargando productos: ${err.message}
      </div>
    `;
  }
}

function applyFilter() {
  const filter = document.getElementById('products-filter').value;
  let filtered = allProducts;
  if (filter === 'analyzed') filtered = allProducts.filter(p => p._analyzed);
  if (filter === 'unanalyzed') filtered = allProducts.filter(p => !p._analyzed);
  if (filter === 'top') filtered = [...allProducts].filter(p => p._confidence).sort((a, b) => b._confidence - a._confidence).slice(0, 12);
  renderProducts(filtered);
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');

  if (products.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-secondary);grid-column:1/-1;">No hay productos para mostrar.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const g = p._grade;
    const conf = p._confidence;

    return `
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:16px;padding:1.25rem;transition:all 0.2s;position:relative;${conf && conf >= 80 ? 'box-shadow:0 0 20px rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.2);' : ''}"
        onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(139,92,246,0.3)';"
        onmouseout="this.style.transform='';this.style.borderColor=''">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
            ${p.sku ? `<div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">SKU: ${p.sku}</div>` : ''}
          </div>
          ${p._analyzed ? statusBadge('analyzed') : statusBadge(p.status)}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${conf ? `
            <span class="badge ${g.cls}" style="font-size:0.8rem;font-weight:800;padding:4px 10px;">
              ${g.grade} · ${conf}%
            </span>
          ` : `
            <span class="badge badge-warning">Sin score</span>
          `}
          ${p._margin !== null ? `
            <span class="badge badge-success" style="font-weight:700;">${p._margin}% margen</span>
          ` : ''}
          <span style="font-size:0.8rem;font-weight:700;color:var(--text);padding:4px 8px;">
            ${formatCOP(p.price)}
          </span>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px;">
          <span>Stock: <strong style="color:${p.stock < 10 ? 'var(--danger)' : 'var(--text)'};">${p.stock}</strong></span>
          ${p._margin !== null ? `<span>ROAS est: <strong style="color:var(--success);">${(p._margin * 0.06).toFixed(1)}x</strong></span>` : ''}
        </div>

        ${p._risks.length > 0 ? `
          <div style="font-size:0.75rem;color:var(--danger);margin-bottom:10px;display:flex;align-items:center;gap:4px;">
            ⚠️ ${p._risks.join(', ')}
          </div>
        ` : ''}

        <div style="display:flex;gap:6px;margin-top:auto;">
          <a href="#/review?id=${p.id}" class="btn btn-primary btn-sm" style="flex:1;justify-content:center;">
            🔍 Revisar
          </a>
          ${!p._analyzed ? `
            <button class="btn btn-outline btn-sm" onclick="alert('LIAM analizará este producto. Esta funcionalidad estará disponible en el próximo sprint.')" style="flex:1;">
              ⚡ Analizar
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}
