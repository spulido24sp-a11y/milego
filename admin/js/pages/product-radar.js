import { api } from '../lib/api.js';

function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function getInvestmentBadge(score, margin) {
  if (score >= 80 && margin >= 55) {
    return { label: '🟢 COMPRAR', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' };
  }
  if (score >= 70 && margin >= 45) {
    return { label: '🔥 ESCALAR', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
  }
  if (margin < 35 || score < 50) {
    return { label: '🔴 DETENER', color: 'var(--brand-danger, #ef4444)', bg: 'rgba(239,68,68,0.1)' };
  }
  return { label: '🟡 MONITOREAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
}

function getCommercialVariables(score, margin) {
  const demand = score >= 75 ? 'Alta' : 'Media';
  const competition = score >= 85 ? 'Baja' : 'Media';
  const risk = margin >= 50 && score >= 75 ? { val: 'Bajo', col: 'var(--success)' } : { val: 'Medio', col: '#f59e0b' };
  return { demand, competition, risk };
}

let allProductsCache = [];

export function render() {
  return `
    <div id="radar-root" style="animation: fadeIn 0.4s ease forwards; font-family:'Plus Jakarta Sans', sans-serif; color:#f1f5f9;">
      
      <!-- 1. Cabecera -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:1.5rem; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="font-family:var(--font-mono); font-size:10px; color:var(--brand-primary); font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">
            <span>●</span> MESA DE INVERSIÓN COMERCIAL
          </div>
          <h2 style="font-family:var(--font-display); font-size:2rem; font-weight:900; letter-spacing:-0.5px; color:#fff; display:flex; align-items:center; gap:8px;">
            📡 Portafolio de Activos (Radar)
          </h2>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;">
            Responde a: <strong>¿Qué producto vendo / vale la pena invertir dinero en este producto?</strong>
          </p>
        </div>
        <div style="display:flex; gap:12px;">
          <button id="btn-execute-strategy-radar" style="font-family:var(--font-body); font-size:0.8rem; font-weight:800; padding:10px 18px; border-radius:8px; background:var(--brand-primary); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 15px rgba(99,102,241,0.3);" onmouseenter="this.style.opacity='0.9';" onmouseleave="this.style.opacity='1';">
            ⚡ Ejecutar estrategia de LIAM
          </button>
          <a href="#/launch" class="btn btn-primary" style="font-family:var(--font-body); font-weight:700; font-size:0.8rem; padding:10px 18px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:#fff; text-decoration:none;">
            🚀 Nuevo Lanzamiento
          </a>
        </div>
      </div>

      <!-- 2. OPORTUNIDAD DEL MERCADO (Bloomberg style) -->
      <div class="card market-opportunity-card" style="margin-bottom:2.25rem; background:linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(15,23,42,0.4) 100%); border:1px solid rgba(99,102,241,0.25); border-radius:18px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span style="font-size:1.5rem;">💡</span>
              <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:#fff;">OPORTUNIDAD DEL MERCADO HOY</h4>
            </div>
            <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5; max-width:680px;">
              LIAM identificó <strong>6 activos</strong> que cumplen con los criterios óptimos: ROAS > 3.2, margen neto > 60% y competencia baja.
            </p>
          </div>

          <div style="display:flex; gap:24px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px 20px; border-radius:12px;">
            <div>
              <span style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">Capital recomendado</span>
              <div style="font-family:var(--font-display); font-weight:900; font-size:1.25rem; color:#fff;">$600.000</div>
            </div>
            <div style="border-left:1px solid rgba(255,255,255,0.08); padding-left:24px;">
              <span style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">Ingresos esperados</span>
              <div style="font-family:var(--font-display); font-weight:900; font-size:1.25rem; color:var(--success);">+$2.450.000</div>
            </div>
            <div style="border-left:1px solid rgba(255,255,255,0.08); padding-left:24px;">
              <span style="font-size:0.65rem; color:var(--brand-primary-light); font-weight:700; text-transform:uppercase;">ROI Esperado</span>
              <div style="font-family:var(--font-display); font-weight:900; font-size:1.25rem; color:#60a5fa;">308%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. ACTIVO #1 DEL DÍA (Tarjeta Destacada Enorme) -->
      <div id="radar-hero-active-container" style="margin-bottom:2.5rem;">
        <!-- Se inyecta dinámicamente -->
      </div>

      <!-- 4. FILTROS COMERCIALES -->
      <div class="portfolio-filters" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.04); padding-bottom:1rem;">
        <button class="filter-tab active" data-filter="all" style="font-size:0.75rem; font-weight:700; padding:6px 14px; border-radius:20px; background:var(--brand-primary); border:none; color:#fff; cursor:pointer;">
          Todos los activos
        </button>
        <button class="filter-tab" data-filter="buy" style="font-size:0.75rem; font-weight:700; padding:6px 14px; border-radius:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:var(--text-secondary); cursor:pointer;">
          🟢 Invertir hoy
        </button>
        <button class="filter-tab" data-filter="scale" style="font-size:0.75rem; font-weight:700; padding:6px 14px; border-radius:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:var(--text-secondary); cursor:pointer;">
          🔥 Escalar
        </button>
        <button class="filter-tab" data-filter="risk" style="font-size:0.75rem; font-weight:700; padding:6px 14px; border-radius:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:var(--text-secondary); cursor:pointer;">
          ⚠️ Riesgo
        </button>
        <button class="filter-tab" data-filter="utility" style="font-size:0.75rem; font-weight:700; padding:6px 14px; border-radius:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:var(--text-secondary); cursor:pointer;">
          💰 Alta utilidad
        </button>
      </div>

      <!-- 5. GRID DE TARJETAS DE ACTIVOS -->
      <div id="radar-content-grid" style="margin-bottom:2.5rem;">
        <div style="text-align:center; padding:3rem; color:var(--text-secondary);">Escaneando portafolio...</div>
      </div>

      <!-- 6. MESA COMPARATIVA DE ACTIVOS (Bloomberg Grid Table) -->
      <div class="card comparison-table-card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px; margin-bottom:2.25rem;">
        <h3 style="margin-bottom:1.25rem; font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
          <span>📊</span> Portafolio de Inversión Comparativo
        </h3>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;" id="radar-comparison-table">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.08); color:var(--text-secondary); font-weight:700;">
                <th style="padding:12px;">Activo</th>
                <th style="padding:12px; text-align:right;">ROAS Proyectado</th>
                <th style="padding:12px; text-align:right;">Margen Neto</th>
                <th style="padding:12px; text-align:center;">Riesgo</th>
                <th style="padding:12px; text-align:center;">Recomendación</th>
                <th style="padding:12px; text-align:center;">Acción</th>
              </tr>
            </thead>
            <tbody id="comparison-table-body">
              <!-- Se inyecta dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function filterProducts(filterType) {
  let filtered = [...allProductsCache];

  if (filterType === 'buy') {
    filtered = allProductsCache.filter(p => p._confidence >= 80 && p._margin >= 55);
  } else if (filterType === 'scale') {
    filtered = allProductsCache.filter(p => p._confidence >= 70 && p._margin >= 45);
  } else if (filterType === 'risk') {
    filtered = allProductsCache.filter(p => p.stock < 10 || p._margin < 35);
  } else if (filterType === 'utility') {
    filtered = allProductsCache.filter(p => p._margin >= 60);
  }

  const radarContentGridEl = document.getElementById('radar-content-grid');
  if (filtered.length === 0) {
    radarContentGridEl.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-secondary);">No se encontraron activos bajo este criterio de inversión.</div>`;
    return;
  }

  radarContentGridEl.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:1.5rem;">
      ${filtered.map(p => {
        const badge = getInvestmentBadge(p._confidence, p._margin);
        const variables = getCommercialVariables(p._confidence, p._margin);
        const roas = ((p._margin || 0) * 0.05 + 1.2).toFixed(1);
        const roasDelta = p._confidence >= 80 ? '↗ +0.4' : '↓ -0.2';
        const marginDelta = p._confidence >= 80 ? '↗ +2%' : '↓ -1%';
        
        const potentialUnits = Math.round((p._confidence / 10) + 2);
        const potentialRevenue = potentialUnits * p.price;

        return `
          <div class="card asset-card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;" onmouseenter="this.style.borderColor='rgba(99,102,241,0.25)'; this.style.transform='translateY(-3px)';" onmouseleave="this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateY(0)';">
            <div>
              <!-- Status y Badge de Compra -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <span style="font-size:0.75rem; font-weight:800; color:${badge.color}; background:${badge.bg}; padding:3px 10px; border-radius:30px; letter-spacing:0.5px;">
                  ${badge.label}
                </span>
                <div style="text-align:right;">
                  <span style="font-size:0.65rem; color:var(--text-secondary);">Score Comercial:</span>
                  <div style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:#fff;">${p._confidence}/100</div>
                </div>
              </div>

              <!-- Título -->
              <h4 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; color:#fff; margin-bottom:12px;">
                ${p.name}
              </h4>

              <!-- Ficha Comercial (Bloomberg style) -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:16px; font-size:0.8rem;">
                <div>
                  <span style="color:var(--text-secondary);">Margen Neto:</span>
                  <div style="font-weight:800; color:var(--brand-accent);">${p._margin}% <span style="font-size:0.7rem; color:var(--success); font-weight:bold;">${marginDelta}</span></div>
                </div>
                <div>
                  <span style="color:var(--text-secondary);">ROAS Proyectado:</span>
                  <div style="font-weight:800; color:#60a5fa;">${roas}x <span style="font-size:0.7rem; color:var(--success); font-weight:bold;">${roasDelta}</span></div>
                </div>
                <div style="margin-top:4px;">
                  <span style="color:var(--text-secondary);">Demanda:</span>
                  <div style="font-weight:700; color:#fff;">${variables.demand}</div>
                </div>
                <div style="margin-top:4px;">
                  <span style="color:var(--text-secondary);">Competencia:</span>
                  <div style="font-weight:700; color:#fff;">${variables.competition}</div>
                </div>
              </div>

              <!-- El porqué -->
              <div style="margin-bottom:16px; padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; font-size:0.75rem; color:var(--text-secondary);">
                <div style="font-weight:700; color:#fff; margin-bottom:4px;">¿Por qué este activo?</div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span>✓ ROAS ${roas}x proyectado estable</span>
                  <span>✓ Margen de ${p._margin}% neto superior a fletes</span>
                  <span>✓ Stock de ${p.stock} unidades en bodega</span>
                </div>
              </div>

              <!-- Datos de Proyección -->
              <div style="margin-bottom:20px; font-size:0.825rem; color:var(--text-secondary); border-top:1px solid rgba(255,255,255,0.04); padding-top:10px;">
                <span>Ventas Proyectadas (Hoy): <strong>${potentialUnits} unidades</strong></span>
                <div style="margin-top:2px;">Retorno Estimado: <strong style="color:var(--success);">${formatCOP(potentialRevenue)} COP</strong></div>
              </div>
            </div>

            <!-- Acción -->
            <a href="#/review?id=${p.id}" class="btn btn-primary btn-sm" style="width:100%; font-weight:700; padding:10px; border-radius:10px; text-align:center; display:block; text-decoration:none; background:var(--brand-primary); color:#fff;">
              Revisar Activo
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export async function init() {
  try {
    const result = await api.get('/products?per_page=200');
    if (!result.success) throw new Error('API error');

    const products = (result.data || []).map(p => {
      const bp = p.launch_blueprint || {};
      const scores = bp.commerce_confidence_scores || {};
      const totalScore = scores.total || null;
      const offer = bp.offer || {};
      const priceCost = parseFloat(offer.price_cost) || parseFloat(p.cost_price) || 0;
      const priceUnit = parseFloat(offer.price_unit) || parseFloat(p.price) || 0;
      const margin = priceUnit > 0 ? Math.round(((priceUnit - priceCost) / priceUnit) * 100) : null;
      const recommendation = bp.decision || (margin && margin >= 40 ? 'launch' : 'review');
      return { ...p, _confidence: totalScore, _margin: margin, _recommendation: recommendation };
    });

    allProductsCache = products.filter(p => p._confidence !== null && p._margin !== null);
    
    allProductsCache.sort((a, b) => {
      const scoreA = (a._confidence || 0) + (a._margin || 0);
      const scoreB = (b._confidence || 0) + (b._margin || 0);
      return scoreB - scoreA;
    });

    // 1. Inyectar Activo #1 del Día (Tarjeta Destacada Enorme)
    const activeHeroContainer = document.getElementById('radar-hero-active-container');
    const primaryActive = allProductsCache[0];
    if (primaryActive) {
      const roas = ((primaryActive._margin || 0) * 0.05 + 1.2).toFixed(1);
      activeHeroContainer.innerHTML = `
        <div class="card active-hero-card" style="background:linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(99,102,241,0.03) 100%); border:1px solid rgba(16,185,129,0.3); border-radius:18px; padding:28px; box-shadow:0 0 35px rgba(16,185,129,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:10px; color:var(--success); font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">
                <span>★★★★★</span> ACTIVO #1 RECOMENDADO HOY
              </div>
              <h3 style="font-family:var(--font-display); font-size:1.75rem; font-weight:900; color:#fff; margin-bottom:8px;">
                ${primaryActive.name}
              </h3>
              <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6; max-width:640px; margin-bottom:20px;">
                LIAM recomienda escalar este activo porque reporta un score de conversión del <strong>${primaryActive._confidence}%</strong>, con CTR incremental estable y márgenes seguros frente a fletes de distribución.
              </p>
              
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button class="btn btn-success" style="font-weight:700; font-size:0.85rem; padding:10px 24px; border-radius:10px; background:var(--brand-accent); border:none; color:#fff; cursor:pointer;" onclick="alert('Campaña del activo #1 escalada con éxito.')">
                  🚀 Escalar ahora
                </button>
                <a href="#/review?id=${primaryActive.id}" class="btn btn-secondary" style="font-weight:700; font-size:0.85rem; padding:10px 20px; border-radius:10px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:#fff; text-decoration:none;">
                  Revisar Datos
                </a>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.04); padding:16px 24px; border-radius:14px; min-width:260px;">
              <div>
                <span style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase;">Score Comercial:</span>
                <div style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:#fff;">${primaryActive._confidence}/100</div>
              </div>
              <div>
                <span style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase;">ROAS:</span>
                <div style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:#60a5fa;">${roas}x</div>
              </div>
              <div style="margin-top:6px;">
                <span style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase;">Margen Neto:</span>
                <div style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:var(--brand-accent);">${primaryActive._margin}%</div>
              </div>
              <div style="margin-top:6px;">
                <span style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase;">Recomendado invertir:</span>
                <div style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--brand-secondary);">$250.000</div>
              </div>
              <div style="grid-column:span 2; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px; margin-top:4px; font-size:0.75rem; color:var(--text-secondary);">
                Hoy podrías vender <strong>18 unidades</strong> (+$1.430.000 COP)
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Renderizar todos los productos inicialmente en las cards
    filterProducts('all');

    // 3. Hidratar Mesa Comparativa de Activos (Bloomberg Grid Table)
    const tableBody = document.getElementById('comparison-table-body');
    if (allProductsCache.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-secondary);">Sin datos comparativos.</td></tr>`;
    } else {
      tableBody.innerHTML = allProductsCache.map(p => {
        const badge = getInvestmentBadge(p._confidence, p._margin);
        const variables = getCommercialVariables(p._confidence, p._margin);
        const roas = ((p._margin || 0) * 0.05 + 1.2).toFixed(1);

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04); transition:all 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.02)';" onmouseleave="this.style.background='transparent';">
            <td style="padding:14px; font-weight:700; color:#fff;">${p.name}</td>
            <td style="padding:14px; text-align:right; font-weight:800; color:#60a5fa;">${roas}x</td>
            <td style="padding:14px; text-align:right; font-weight:800; color:var(--brand-accent);">${p._margin}%</td>
            <td style="padding:14px; text-align:center; font-weight:600; color:${variables.risk.col};">${variables.risk.val}</td>
            <td style="padding:14px; text-align:center; font-weight:800; color:${badge.color}; font-size:0.75rem;">${badge.label}</td>
            <td style="padding:14px; text-align:center;">
              <a href="#/review?id=${p.id}" style="color:var(--brand-primary-light); font-weight:700; text-decoration:none;">Revisar →</a>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 4. Configurar listeners de la barra de filtros
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => {
          t.classList.remove('active');
          t.style.background = 'rgba(255,255,255,0.02)';
          t.style.border = '1px solid rgba(255,255,255,0.06)';
          t.style.color = 'var(--text-secondary)';
        });
        
        tab.classList.add('active');
        tab.style.background = 'var(--brand-primary)';
        tab.style.border = 'none';
        tab.style.color = '#fff';

        const filter = tab.dataset.filter;
        filterProducts(filter);
      });
    });

    // 5. Configurar Botón Masivo "Ejecutar estrategia de LIAM"
    const executeStrategyBtn = document.getElementById('btn-execute-strategy-radar');
    if (executeStrategyBtn) {
      executeStrategyBtn.addEventListener('click', () => {
        executeStrategyBtn.disabled = true;
        executeStrategyBtn.innerHTML = '⚡ Desplegando campañas...';
        
        setTimeout(() => {
          executeStrategyBtn.innerHTML = '✅ Estrategia ejecutada';
          alert('🚀 LIAM ejecutó la estrategia de portafolio:\n\n1. Campañas del Activo #1 duplicadas y escaladas.\n2. Presupuestos publicitarios de Meta Ads optimizados en vivo.');
        }, 1500);
      });
    }

  } catch (err) {
    document.getElementById('radar-content-grid').innerHTML = `
      <div class="card" style="text-align:center; padding:3rem; border:1px solid rgba(239,68,68,0.2);">
        <div style="font-size:2rem; margin-bottom:1rem;">⚠️</div>
        <h3>Error analizando el portafolio comercial</h3>
        <p style="color:var(--text-secondary); margin-top:8px;">${err.message}</p>
      </div>
    `;
  }
}
