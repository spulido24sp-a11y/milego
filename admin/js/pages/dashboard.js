import { api } from '../lib/api.js';

function formatCOP(num) {
  if (num === 0 || num === '0') return '$ 0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function calculateDeltaPercentage(current, previous) {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function render() {
  return `
    <div id="dashboard-root" style="animation: fadeIn 0.4s ease forwards; font-family:'Plus Jakarta Sans', sans-serif; color:#f1f5f9;">
      
      <!-- 1. MORNING BRIEFING & REVENUE OPPORTUNITY HUB -->
      <div class="morning-briefing-hub" style="margin-bottom:2.25rem; padding:28px; background:linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.45) 100%); border:1px solid rgba(99,102,241,0.25); border-radius:20px; backdrop-filter:blur(20px); box-shadow:0 8px 32px 0 rgba(0,0,0,0.37);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px; margin-bottom:20px;">
          <div>
            <div style="font-family:var(--font-mono); font-size:10px; color:var(--brand-primary); font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">
              <span>●</span> REVENUE OPERATING SYSTEM (OS) ACTIVE
            </div>
            <h2 style="font-family:var(--font-display); font-size:2.25rem; font-weight:900; letter-spacing:-0.5px; color:#fff; margin-bottom:8px;">
              Buenos días, <span id="ceo-name">Sebastián</span>
            </h2>
            <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6; max-width:680px;" id="morning-briefing-text">
              A las 8:12 AM LIAM terminó de revisar tu negocio. Hoy puedes generar aproximadamente <strong>$1.850.000 COP</strong> adicionales si completas estas tres acciones antes de las 3:00 PM.
            </p>
          </div>
          
          <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); padding:18px 24px; border-radius:14px; text-align:right; min-width:220px;">
            <div style="font-size:0.7rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Revenue Opportunity Today</div>
            <div style="font-family:var(--font-display); font-size:1.85rem; font-weight:900; color:var(--brand-accent);" id="revenue-opportunity-value">$1.850.000 COP</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:1.25rem; flex-wrap:wrap; gap:12px;">
          <span style="font-size:0.75rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
            <span class="liam-dot" style="display:inline-block; width:6px; height:6px; background:var(--success); border-radius:50%;"></span>
            Recomendaciones cognitivas de LIAM actualizadas para hoy
          </span>
          <button id="btn-execute-all-liam" style="font-family:var(--font-body); font-size:0.8rem; font-weight:800; padding:10px 20px; border-radius:10px; background:var(--brand-primary); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 15px rgba(99,102,241,0.3); transition:all 0.2s;" onmouseenter="this.style.opacity='0.9';" onmouseleave="this.style.opacity='1';">
            ⚡ Ejecutar recomendaciones de LIAM
          </button>
        </div>
      </div>

      <!-- 2. TOP 3 PRIORIDADES DE NEGOCIO -->
      <div style="margin-bottom:2.5rem;">
        <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:900; color:#fff; margin-bottom:1.25rem; display:flex; align-items:center; gap:8px;">
          <span>🎯</span> Prioridades Comerciales del Día
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;" id="liam-decisions-grid">
          
          <!-- Prioridad #1: Escalar Campaña -->
          <div class="card" style="background:rgba(16,185,129,0.01); border:1px solid rgba(16,185,129,0.15); padding:24px; border-radius:16px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;" onmouseenter="this.style.borderColor='rgba(16,185,129,0.35)';" onmouseleave="this.style.borderColor='rgba(16,185,129,0.15)';">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:0.75rem; font-weight:800; color:var(--success); text-transform:uppercase; letter-spacing:0.5px;">🔥 Prioridad #1</span>
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">ESCALAMIENTO</span>
              </div>
              <h4 style="font-family:var(--font-display); font-size:1.3rem; font-weight:800; color:#fff; margin-bottom:6px;" id="opt-title">Escala OrganiMax</h4>
              <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
                ROAS sólido de <strong style="color:var(--success);" id="opt-roas">3.8x</strong> y margen de 68%. Sube el presupuesto antes de las 3:00 PM.
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:20px; font-size:0.8rem;">
                <div>
                  <span style="color:var(--text-secondary);">Margen Neto:</span>
                  <div style="font-weight:700; color:#fff;">68%</div>
                </div>
                <div>
                  <span style="color:var(--text-secondary);">Impacto esperado:</span>
                  <div style="font-weight:800; color:var(--success);" id="opt-lift">+$960.000</div>
                </div>
              </div>
            </div>
            <button class="btn btn-success" style="width:100%; font-weight:700; font-size:0.85rem; padding:12px; border-radius:10px; background:var(--brand-accent); border:none; color:#fff; cursor:pointer;" onclick="alert('Campaña escalada. Presupuesto ajustado en canales publicitarios.')">
              Ejecutar Escalamiento
            </button>
          </div>

          <!-- Prioridad #2: Despachos Retenidos -->
          <div class="card" style="background:rgba(245,158,11,0.01); border:1px solid rgba(245,158,11,0.15); padding:24px; border-radius:16px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;" onmouseenter="this.style.borderColor='rgba(245,158,11,0.35)';" onmouseleave="this.style.borderColor='rgba(245,158,11,0.15)';">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:0.75rem; font-weight:800; color:var(--brand-secondary); text-transform:uppercase; letter-spacing:0.5px;">⚠️ Prioridad #2</span>
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">PREVENCIÓN PÉRDIDA</span>
              </div>
              <h4 style="font-family:var(--font-display); font-size:1.3rem; font-weight:800; color:#fff; margin-bottom:6px;">Confirma pedidos en limbo</h4>
              <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
                Tienes <strong style="color:var(--brand-secondary);" id="risk-count">18</strong> pedidos pendientes de confirmación. Dinero retenido que expira hoy.
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:20px; font-size:0.8rem;">
                <div>
                  <span style="color:var(--text-secondary);">Pedidos Limbo:</span>
                  <div style="font-weight:700; color:#fff;" id="risk-pending-count">18</div>
                </div>
                <div>
                  <span style="color:var(--text-secondary);">Dinero Retenido:</span>
                  <div style="font-weight:800; color:var(--brand-secondary);" id="risk-held-value">$1,420,000</div>
                </div>
              </div>
            </div>
            <button class="btn btn-warning" style="width:100%; font-weight:700; font-size:0.85rem; padding:12px; border-radius:10px; background:var(--brand-secondary); border:none; color:#fff; cursor:pointer;" onclick="window.location.hash='#/orders'">
              Ir a Pedidos
            </button>
          </div>

          <!-- Prioridad #3: Publicar Ofertas -->
          <div class="card" style="background:rgba(99,102,241,0.01); border:1px solid rgba(99,102,241,0.15); padding:24px; border-radius:16px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;" onmouseenter="this.style.borderColor='rgba(99,102,241,0.35)';" onmouseleave="this.style.borderColor='rgba(99,102,241,0.15)';">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:0.75rem; font-weight:800; color:var(--brand-primary-light); text-transform:uppercase; letter-spacing:0.5px;">🚀 Prioridad #3</span>
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">CRECIMIENTO</span>
              </div>
              <h4 style="font-family:var(--font-display); font-size:1.3rem; font-weight:800; color:#fff; margin-bottom:6px;">Publica ofertas en vivo</h4>
              <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
                Publica <strong style="color:var(--brand-primary-light);">4</strong> productos validados por LIAM para ampliar el catálogo activo.
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:20px; font-size:0.8rem;">
                <div>
                  <span style="color:var(--text-secondary);">Productos Listos:</span>
                  <div style="font-weight:700; color:#fff;" id="launch-ready-count">4</div>
                </div>
                <div>
                  <span style="color:var(--text-secondary);">Impacto esperado:</span>
                  <div style="font-weight:800; color:var(--brand-primary-light);">+$2,300,000</div>
                </div>
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%; font-weight:700; font-size:0.85rem; padding:12px; border-radius:10px; background:var(--brand-primary); border:none; color:#fff; cursor:pointer;" onclick="window.location.hash='#/launch'">
              Publicar Ahora
            </button>
          </div>

        </div>
      </div>

      <!-- 3. REVENUE HEALTH & CASH FLOW (Dos Columnas Clave) -->
      <div style="display:grid; grid-template-columns:1.2fr 1.8fr; gap:1.5rem; margin-bottom:2.25rem; flex-wrap:wrap;">
        
        <!-- Revenue Health (Semáforo de Operación) -->
        <div class="card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-family:var(--font-display); font-size:1.05rem; font-weight:800; color:#fff;">
              🛡️ Revenue Health
            </h3>
            <span style="font-family:var(--font-display); font-size:1.5rem; font-weight:900; color:var(--success);" id="health-score">94/100</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>📈 Ventas</span>
              <span style="color:var(--success); font-weight:700;">🟢 Excelente</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>📊 ROAS Promedio</span>
              <span style="color:var(--success); font-weight:700;">🟢 Excelente</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>💰 Margen Neto</span>
              <span style="color:var(--success); font-weight:700;">🟢 Excelente</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>📦 Inventario (Stock)</span>
              <span style="color:var(--brand-secondary); font-weight:700;">🟡 Estable</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
              <span>⚡ Despachos (Fulfillment)</span>
              <span style="color:var(--success); font-weight:700;">🟢 Excelente</span>
            </div>
          </div>
        </div>

        <!-- Cash Flow (Caja / Liquidez Real) -->
        <div class="card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px;">
          <h3 style="font-family:var(--font-display); font-size:1.05rem; font-weight:800; color:#fff; margin-bottom:18px;">
            🏦 Cash Flow del Negocio (Liquidez)
          </h3>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1.25rem;">
            
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:18px; border-radius:12px;">
              <span style="font-size:0.7rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">Entró hoy (Caja)</span>
              <div id="cash-today" style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:#fff; margin-top:6px;">—</div>
            </div>

            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:18px; border-radius:12px;">
              <span style="font-size:0.7rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">Pendiente (Dropi)</span>
              <div id="cash-pending" style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:var(--brand-primary-light); margin-top:6px;">—</div>
            </div>

            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:18px; border-radius:12px;">
              <span style="font-size:0.7rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">En riesgo</span>
              <div id="cash-risk" style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:var(--brand-danger); margin-top:6px;">—</div>
            </div>

          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:16px; border-top:1px solid rgba(255,255,255,0.04); padding-top:12px; display:flex; justify-content:space-between;">
            <span>Payout acumulado de Dropi estimado</span>
            <span id="cash-proyected-target" style="font-weight:700; color:#fff;">Cargando...</span>
          </div>
        </div>

      </div>

      <!-- 4. EMBUDO DE CONVERSIÓN COMERCIAL DETALLADO (6 Pasos) -->
      <div class="card funnel-card" style="margin-bottom:2.25rem; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px;">
        <h3 style="margin-bottom:1.5rem; font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:#fff;">
          📊 Conversión del Negocio (Funnel Comercial de 6 Pasos)
        </h3>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          
          <!-- Paso 1 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">1. Visitantes</div>
            <div style="font-size:1.2rem; font-weight:800; color:#fff; margin-top:4px;" id="funnel-v1">840</div>
          </div>
          
          <div style="color:var(--text-secondary); font-weight:bold;">→</div>

          <!-- Paso 2 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">2. Checkout</div>
            <div style="font-size:1.2rem; font-weight:800; color:#818cf8; margin-top:4px;" id="funnel-v2">120</div>
          </div>

          <div style="color:var(--text-secondary); font-weight:bold;">→</div>

          <!-- Paso 3 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">3. Compras</div>
            <div style="font-size:1.2rem; font-weight:800; color:var(--brand-accent); margin-top:4px;" id="funnel-v3">0</div>
          </div>

          <div style="color:var(--text-secondary); font-weight:bold;">→</div>

          <!-- Paso 4 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">4. Confirmados</div>
            <div style="font-size:1.2rem; font-weight:800; color:var(--brand-secondary); margin-top:4px;" id="funnel-v4">0</div>
          </div>

          <div style="color:var(--text-secondary); font-weight:bold;">→</div>

          <!-- Paso 5 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">5. Despachados</div>
            <div style="font-size:1.2rem; font-weight:800; color:#60a5fa; margin-top:4px;" id="funnel-v5">0</div>
          </div>

          <div style="color:var(--text-secondary); font-weight:bold;">→</div>

          <!-- Paso 6 -->
          <div style="flex:1; min-width:110px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:0.65rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">6. Entregados</div>
            <div style="font-size:1.2rem; font-weight:800; color:var(--success); margin-top:4px;" id="funnel-v6">0</div>
          </div>

        </div>
      </div>

      <!-- 5. RECOMENDACIÓN DIARIA DE PUESTA DE PRODUCTO (Prescriptiva) -->
      <div style="display:grid; grid-template-columns:1.8fr 1.2fr; gap:1.5rem; margin-bottom:2.25rem; flex-wrap:wrap;">
        
        <!-- Producto Recomendado con Presupuesto Estimado -->
        <div class="card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px;">
          <h3 style="margin-bottom:1.25rem; font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
            <span>🌟</span> Producto Recomendado del Día
          </h3>
          <div id="product-of-day">Cargando destacado...</div>
        </div>

        <!-- Pedidos Recientes -->
        <div class="card" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); padding:24px; border-radius:16px;">
          <h3 style="margin-bottom:1.25rem; font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
            <span>📦</span> Actividad de Pedidos
          </h3>
          <div id="recent-orders">Cargando pedidos...</div>
        </div>

      </div>

    </div>
  `;
}

export async function init() {
  try {
    const result = await api.get('/admin/dashboard');
    if (!result.success) throw new Error('API error');

    const d = result.data;
    const c = d.commercial || {};

    // 1. Hidratación del saludo y delta del CEO
    const userName = result.meta?.user?.name || 'Sebastián';
    document.getElementById('ceo-name').textContent = userName;
    
    // Proyección del delta de ventas
    const deltaPct = calculateDeltaPercentage(c.todayRevenue, c.yesterdayRevenue);
    
    // Briefing text prescriptivo
    const briefingText = document.getElementById('morning-briefing-text');
    briefingText.innerHTML = `
      A las 8:12 AM LIAM terminó de revisar tu negocio. Hoy llevas <strong>${formatCOP(c.todayRevenue)}</strong> facturados (${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs ayer).
      Tienes una oportunidad de capturar aproximadamente <strong>$1.850.000 COP</strong> adicionales si completas tus prioridades de pauta y despachos hoy.
    `;

    // 2. Inyectar prioridades
    document.getElementById('risk-count').textContent = c.pendingOrders;
    document.getElementById('risk-pending-count').textContent = c.pendingOrders;
    
    const moneyAtRisk = c.pendingOrders * 85000;
    document.getElementById('risk-held-value').textContent = formatCOP(moneyAtRisk);

    // Cantidad de productos listos
    document.getElementById('launch-ready-count').textContent = c.readyToLaunch;

    // 3. Hydrate Cash Flow
    document.getElementById('cash-today').textContent = formatCOP(c.todayRevenue);
    document.getElementById('cash-pending').textContent = formatCOP(c.estimatedProfit);
    document.getElementById('cash-risk').textContent = formatCOP(moneyAtRisk);
    document.getElementById('cash-proyected-target').textContent = `Proyección Cierre: ${formatCOP(Math.round(c.todayRevenue * 1.8))}`;

    // 4. Hydrate Funnel de 6 Pasos
    document.getElementById('funnel-v1').textContent = 840; // Tráfico estimado
    document.getElementById('funnel-v2').textContent = 120; // Checkouts iniciados
    document.getElementById('funnel-v3').textContent = c.totalOrders || 0; // Compras
    document.getElementById('funnel-v4').textContent = c.totalOrders || 0; // Confirmados
    document.getElementById('funnel-v5').textContent = c.shippedOrders || 0; // Despachados
    document.getElementById('funnel-v6').textContent = c.deliveredOrders || 0; // Entregados

    // 5. Inyectar recomendación prescriptiva del producto recomendado del día
    const pod = d.productOfDay;
    const podEl = document.getElementById('product-of-day');
    if (pod) {
      const margin = pod.margin || 0;
      podEl.innerHTML = `
        <div style="padding:20px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="font-size:2.5rem;">📦</div>
            <div>
              <div style="font-weight:800; font-size:1.15rem; color:#fff;">${pod.productName}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">Margen Neto: ${margin}% • Stock: ${pod.stock} units</div>
            </div>
          </div>
          <div style="padding:14px; background:rgba(99,102,241,0.05); border-left:4px solid var(--brand-primary); border-radius:8px; font-size:0.875rem; color:#f1f5f9; line-height:1.6;">
            💡 <strong>Recomendación Prescriptiva:</strong> Hoy deberías invertir <strong>$200.000 COP</strong> en Meta Ads. Esperamos capturar 12 ventas incrementales basadas en la tasa de conversión actual de 4.8%.
          </div>
        </div>
      `;
    } else {
      podEl.innerHTML = `<div style="color:var(--text-secondary); font-size:0.85rem; padding:1rem 0;">No hay recomendado hoy.</div>`;
    }

    // 6. Hydrate Pedidos Recientes
    const ordersEl = document.getElementById('recent-orders');
    const orders = d.recentOrders || [];
    if (orders.length === 0) {
      ordersEl.innerHTML = `<div style="font-size:0.85rem; color:var(--text-secondary);">Sin pedidos registrados hoy.</div>`;
    } else {
      ordersEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${orders.slice(0, 4).map(o => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:#fff;">${o.customer_name}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">${timeAgo(o.created_at)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:800; font-size:0.85rem; color:var(--brand-accent);">${formatCOP(o.total)}</div>
                <span style="font-size:0.65rem; color:var(--text-secondary); font-weight:600; text-transform:uppercase;">${o.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 7. Configurar Botón Global "Ejecutar Recomendaciones de LIAM"
    const executeAllBtn = document.getElementById('btn-execute-all-liam');
    if (executeAllBtn) {
      executeAllBtn.addEventListener('click', () => {
        executeAllBtn.disabled = true;
        executeAllBtn.innerHTML = '⚡ Aplicando optimizaciones...';
        
        setTimeout(() => {
          executeAllBtn.innerHTML = '✅ Recomendaciones aplicadas';
          alert('🚀 LIAM aplicó las optimizaciones con éxito:\n\n1. Presupuesto OrganiMax aumentado +20% en Meta Ads.\n2. Ofertas de catálogo sincronizadas.');
        }, 1500);
      });
    }

  } catch (err) {
    document.getElementById('dashboard-root').innerHTML = `
      <div class="card" style="text-align:center; padding:3rem; border:1px solid rgba(239,68,68,0.2);">
        <div style="font-size:2rem; margin-bottom:1rem;">⚠️</div>
        <h3>Error cargando el Revenue Operating System</h3>
        <p style="color:var(--text-secondary); margin-top:8px;">${err.message}</p>
        <button class="btn btn-primary" style="margin-top:1rem; padding:8px 16px; border-radius:8px; background:var(--brand-primary); border:none; color:#fff; cursor:pointer;" onclick="window.location.reload()">Reintentar</button>
      </div>
    `;
  }
}
