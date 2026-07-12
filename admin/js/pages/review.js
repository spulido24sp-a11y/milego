import { api } from '../lib/api.js';
import {
  renderConfidenceHeader,
  renderExecutiveSummary,
  renderFindings,
  renderRecommendations,
  renderScoreBreakdown,
  renderLeaderboard,
  detectWhatIf,
  buildWhatIfResponse
} from '../components/advisor-panel.js';

let currentProduct  = null;
let currentHistory  = [];
let advisorData     = null;   // { base, simulation } from /simulate
let chatHistory     = [];

export function render() {
  return `
    <div id="review-root" style="animation: fadeIn 0.4s ease forwards; font-family:'Plus Jakarta Sans', sans-serif; color:#f1f5f9; max-width:1600px; margin:0 auto; padding:1rem 0;">
      
      <!-- Loading State -->
      <div id="workspace-loading" class="card" style="text-align:center; padding:3rem;">
        <div class="spinner" style="margin:0 auto 1.5rem;"></div>
        <p style="color:var(--text-secondary);">Cargando Centro de Comando LIAM...</p>
      </div>

      <!-- Error State -->
      <div id="workspace-error" class="card" style="display:none; text-align:center; border-color:var(--brand-danger, #ef4444); padding:3rem;">
        <span style="font-size:3rem;">⚠️</span>
        <h3 style="margin-top:1rem; font-weight:700;">No se pudo cargar el lanzamiento</h3>
        <p id="workspace-error-msg" style="color:var(--text-secondary); margin-top:.5rem;"></p>
        <button class="btn btn-outline" style="margin-top:1.5rem;" onclick="window.location.hash='#/products'">Volver a Productos</button>
      </div>

      <!-- Workspace Content -->
      <div id="workspace-content" style="display:none;">

        <!-- HEADER DE COMANDO (Notion Premium Style) -->
        <div class="card" style="margin-bottom:1.5rem; background:linear-gradient(135deg, rgba(15,23,42,0.65) 0%, rgba(30,41,59,0.3) 100%); border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1.5rem;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span id="provider-badge" style="background:rgba(59,130,246,0.15); color:#60a5fa; font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px;">Dropi</span>
              <span id="status-badge" style="font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">REVIEW</span>
            </div>
            <h2 id="product-title" style="font-family:var(--font-display); font-weight:900; font-size:1.85rem; color:#fff; margin:0; letter-spacing:-0.5px;"></h2>
            <p id="last-sync-time" style="color:var(--text-secondary); font-size:0.8rem; margin-top:4px;"></p>
          </div>

          <div style="display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;">
            <button class="btn btn-outline" id="btn-reject-launch" style="border-color:rgba(239,68,68,0.4); color:#f87171; font-weight:700; font-size:0.8rem; padding:10px 18px; border-radius:8px;">Borrador</button>
            <button class="btn btn-primary" id="btn-approve-launch" style="background:var(--success); border-color:var(--success); color:white; font-weight:800; font-size:0.8rem; padding:10px 20px; border-radius:8px;">🚀 Aprobar Lanzamiento</button>
          </div>
        </div>

        <!-- 3-COLUMN WORKSPACE GRID (Notion Style) -->
        <div style="display:grid; grid-template-columns:310px 1fr 350px; gap:1.5rem; align-items:start;" id="workspace-layout">

          <!-- ==================== COLUMNA 1: ACTIVO & PROVEEDOR (IZQUIERDA) ==================== -->
          <div style="display:flex; flex-direction:column; gap:1.25rem;">
            
            <!-- Ficha del Activo -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>📦</span> Datos del Activo
              </h3>
              <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:8px;">
                <div>
                  <span style="color:var(--text-muted);">Nombre original:</span>
                  <div style="font-weight:700; color:#fff; margin-top:2px;" id="asset-original-name">—</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">SKU Proveedor:</span>
                  <div style="font-weight:700; color:#fff; margin-top:2px;" id="asset-sku">—</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Categoría sugerida:</span>
                  <div style="font-weight:700; color:#fff; margin-top:2px;" id="asset-category">—</div>
                </div>
              </div>
            </div>

            <!-- Galería e Imágenes -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>🖼️</span> Galería Multimedia
              </h3>
              <div id="product-images-carousel" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:12px;">
                <!-- Se inyecta dinámicamente -->
              </div>
            </div>

            <!-- Proveedor (Fulfillment & Reputación) -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>🚚</span> Proveedor & Logística
              </h3>
              <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:8px;">
                <div>
                  <span style="color:var(--text-muted);">Reputación Dropi:</span>
                  <div style="font-weight:800; color:var(--success); margin-top:2px;">🟢 4.9/5 (Excelente)</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Tiempo promedio despacho:</span>
                  <div style="font-weight:700; color:#fff; margin-top:2px;">14 horas hábiles</div>
                </div>
                <div>
                  <span style="color:var(--text-muted);">Stock físico bodega:</span>
                  <div style="font-weight:700; color:#fff; margin-top:2px;" id="asset-stock-value">—</div>
                </div>
              </div>
            </div>

            <!-- Competencia & UGC -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>🎯</span> Competencia & UGC
              </h3>
              <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:8px;">
                <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
                  <div style="font-weight:700; color:#fff;">CTR publicitario promedio:</div>
                  <div style="font-size:1.1rem; font-weight:800; color:var(--brand-accent); margin-top:2px;">2.8%</div>
                </div>
                <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
                  <div style="font-weight:700; color:#fff;">Anunciantes activos (Meta):</div>
                  <div style="font-size:1.1rem; font-weight:800; color:#60a5fa; margin-top:2px;">3 competidores</div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== COLUMNA 2: PROPUESTA EDITABLE DE LIAM (CENTRAL) ==================== -->
          <div style="display:flex; flex-direction:column; gap:1.5rem;">
            
            <!-- Barra de Navegación de Edición de Landing -->
            <div style="display:flex; border-bottom:1px solid var(--border, rgba(255,255,255,0.08)); gap:1rem;">
              <button class="tab-btn active" data-tab="tab-offer" id="btn-tab-offer" style="background:none; border:none; padding:10px 16px; color:var(--text-secondary); font-weight:700; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">Oferta & Precios</button>
              <button class="tab-btn" data-tab="tab-copy" id="btn-tab-copy" style="background:none; border:none; padding:10px 16px; color:var(--text-secondary); font-weight:700; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">Copy Studio</button>
              <button class="tab-btn" data-tab="tab-seo" id="btn-tab-seo" style="background:none; border:none; padding:10px 16px; color:var(--text-secondary); font-weight:700; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">SEO & URL</button>
              <button class="tab-btn" data-tab="tab-preview" id="btn-tab-preview" style="background:none; border:none; padding:10px 16px; color:var(--text-secondary); font-weight:700; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">Landing Builder</button>
            </div>

            <!-- Tab: Oferta & Precios -->
            <div id="tab-offer" class="tab-content card" style="border-radius:14px; padding:24px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:1.1rem; font-weight:800; color:#fff; margin-bottom:1rem;">Estructura de Ofertas y Combo Bundles</h3>
              <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
                <div class="form-group">
                  <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Costo del Proveedor (COP)</label>
                  <input type="number" class="form-input" id="offer-cost" readonly style="background:rgba(255,255,255,0.02); color:var(--text-secondary); border:1px solid rgba(255,255,255,0.08); padding:10px; border-radius:8px; width:100%;">
                </div>
                <div class="form-group">
                  <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Precio Unitario Venta Sugerido (COP)</label>
                  <input type="number" class="form-input" id="offer-price" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
                </div>
              </div>
              
              <div class="form-group" style="margin-bottom:1.5rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:8px; display:block;">Combo Estratégico de Conversión</label>
                <div style="display:flex; flex-direction:column; gap:10px;">
                  <label style="display:flex; align-items:center; gap:10px; cursor:pointer;"><input type="radio" name="offer-bundle" value="combo_x2" id="bundle-combo-2"> <span style="font-size:0.85rem;">Combo Paga 1 Lleva 2 (Recomendado)</span></label>
                  <label style="display:flex; align-items:center; gap:10px; cursor:pointer;"><input type="radio" name="offer-bundle" value="combo_x3" id="bundle-combo-3"> <span style="font-size:0.85rem;">Combo Paga 2 Lleva 3</span></label>
                  <label style="display:flex; align-items:center; gap:10px; cursor:pointer;"><input type="radio" name="offer-bundle" value="unit" id="bundle-unit"> <span style="font-size:0.85rem;">Venta Individual con Envío Gratis</span></label>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-save-offer" style="font-weight:700; padding:10px 20px; border-radius:8px;">Guardar Configuración</button>
              </div>
            </div>

            <!-- Tab: Copy Studio -->
            <div id="tab-copy" class="tab-content card" style="display:none; border-radius:14px; padding:24px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                <h3 style="font-size:1.1rem; font-weight:800; color:#fff; margin:0;">Copy Studio (Textos Editables)</h3>
                <button class="btn btn-outline" id="btn-regenerate-copy" style="font-size:0.75rem; padding:6px 12px; border-radius:6px;">↺ Regenerar con LIAM</button>
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Headline Principal Landing (Hero)</label>
                <input type="text" class="form-input" id="copy-headline" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Beneficios Clave (Bullets)</label>
                <textarea class="form-input" id="copy-bullets" style="min-height:100px; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%; font-family:monospace;"></textarea>
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Script de Anuncio Producido</label>
                <textarea class="form-input" id="copy-script" style="min-height:100px; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%; font-family:monospace;"></textarea>
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Mensaje Sincronización WhatsApp</label>
                <input type="text" class="form-input" id="copy-whatsapp" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
              </div>
              <div style="display:flex; justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-save-copy" style="font-weight:700; padding:10px 20px; border-radius:8px;">Guardar Copies</button>
              </div>
            </div>

            <!-- Tab: SEO Studio -->
            <div id="tab-seo" class="tab-content card" style="display:none; border-radius:14px; padding:24px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                <h3 style="font-size:1.1rem; font-weight:800; color:#fff; margin:0;">SEO Studio</h3>
                <button class="btn btn-outline" id="btn-regenerate-seo" style="font-size:0.75rem; padding:6px 12px; border-radius:6px;">↺ Regenerar SEO</button>
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Slug URL Landing</label>
                <input type="text" class="form-input" id="seo-slug" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Meta Title <span id="counter-title" style="float:right; color:var(--text-secondary); font-size:0.75rem;">0 / 60</span></label>
                <input type="text" class="form-input" id="seo-title" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Meta Description <span id="counter-desc" style="float:right; color:var(--text-secondary); font-size:0.75rem;">0 / 160</span></label>
                <textarea class="form-input" id="seo-desc" style="min-height:80px; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;"></textarea>
              </div>
              <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; margin-bottom:6px; display:block;">Keywords de Conversión</label>
                <input type="text" class="form-input" id="seo-keywords" placeholder="Ej: auricular, bluetooth, sonido" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px; width:100%;">
              </div>
              <div style="display:flex; justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-save-seo" style="font-weight:700; padding:10px 20px; border-radius:8px;">Guardar SEO</button>
              </div>
            </div>

            <!-- Tab: Landing Preview -->
            <div id="tab-preview" class="tab-content card" style="display:none; border-radius:14px; padding:24px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); min-height:400px;">
              
              <div id="landing-published-box" style="display:none; padding:18px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; margin-bottom:1.5rem; text-align:center;">
                <div style="font-size:2rem; margin-bottom:8px;">✅</div>
                <h4 style="font-weight:800; margin-bottom:4px; color:#fff;">Landing publicada</h4>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;" id="landing-url-display"></p>
                <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                  <button class="btn btn-primary btn-sm" id="btn-copy-landing-url" style="font-size:0.75rem; padding:6px 12px;">📋 Copiar URL</button>
                  <a id="landing-open-link" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:6px 12px; color:#fff; border-color:rgba(255,255,255,0.12); text-decoration:none;">🌐 Abrir Landing</a>
                </div>
              </div>

              <!-- LIAM Theme Engine -->
              <div style="margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                <h4 style="font-size:0.95rem; font-weight:800; margin-bottom:0.75rem; color:#fff; display:flex; align-items:center; gap:6px;">
                  <span>🎨</span> Biblioteca de Plantillas Premium
                  <span style="font-size:0.65rem; background:rgba(99,102,241,0.15); color:var(--brand-primary-light); padding:2px 8px; border-radius:6px; font-weight:800;">LIAM THEME ENGINE</span>
                </h4>
                <div id="landing-themes-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
                  <!-- Dynamic template list -->
                </div>
              </div>

              <!-- Estructura de Secciones -->
              <div id="landing-builder-blocks">
                <h4 style="font-size:0.9rem; font-weight:800; margin-bottom:0.75rem; color:#fff;">🧱 Estructura de Secciones</h4>
                <div id="landing-blocks-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px; margin-bottom:1.5rem;">
                  <!-- Dynamic blocks -->
                </div>
              </div>

              <div style="display:flex; gap:12px; justify-content:center; margin-top:0.5rem;">
                <button class="btn btn-outline" id="btn-preview-landing-trigger" style="font-weight:700; padding:10px 20px; border-radius:8px; color:#fff; border-color:rgba(255,255,255,0.12);">
                  👁️ Vista previa
                </button>
                <button class="btn btn-primary" id="btn-publish-landing" style="font-weight:800; font-size:0.9rem; padding:12px 28px; background:linear-gradient(135deg, #10b981, #059669); border:none; border-radius:8px; color:#fff;">
                  🚀 Publicar Landing
                </button>
              </div>

            </div>

            <!-- LIAM Chat Panel (AI Command Center) -->
            <div class="card" style="border-radius:14px; padding:24px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:1rem;">
                <span style="font-size:1.25rem;">🤖</span>
                <h3 style="font-size:1rem; font-weight:800; color:#fff; margin:0;">AI Command Center (LIAM)</h3>
                <span style="font-size:0.65rem; background:rgba(139,92,246,0.15); color:var(--brand-primary-light); padding:2px 7px; border-radius:4px; font-weight:800;">IA</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:12px; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
                💡 Pregúntale a LIAM: <em>"¿Qué pasa si vendo a $59.900?"</em> o <em>"Quiero ganar más dinero con este activo"</em>.
              </div>
              <div id="chat-messages" style="min-height:160px; max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:1rem; padding-right:6px;"></div>
              <div style="display:flex; gap:8px;">
                <input type="text" id="chat-input" class="form-input" placeholder="Escribe tu comando o pregunta financiera..." style="flex:1; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:10px; border-radius:8px;">
                <button class="btn btn-primary" id="btn-chat-send" style="padding:0 1.25rem; font-weight:700; border-radius:8px;">Enviar</button>
              </div>
            </div>

          </div>

          <!-- ==================== COLUMNA 3: IMPACTO & SIMULACIÓN (DERECHA) ==================== -->
          <div style="display:flex; flex-direction:column; gap:1.25rem;">
            
            <!-- Conversion Score Visual -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <span style="font-size:0.65rem; color:var(--text-secondary); font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Conversion Score Estimado</span>
              <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:10px; margin-bottom:8px;">
                <div id="confidence-circle" style="width:72px; height:72px; border-radius:50%; border:5px solid var(--success); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.6rem; color:#fff; background:rgba(16,185,129,0.05);">—</div>
                <div style="text-align:left;">
                  <div id="confidence-verdict" style="font-size:1.15rem; font-weight:800; color:var(--success);">Excelente</div>
                  <div style="font-size:0.75rem; color:var(--text-secondary);">Grado: <strong id="confidence-grade" style="color:#fff;">A</strong></div>
                </div>
              </div>
            </div>

            <!-- Proyección Financiera (Antes vs Después / Live) -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:14px; display:flex; align-items:center; gap:6px;">
                <span>📊</span> Impacto Financiero
              </h3>
              
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="font-size:0.8rem; color:var(--text-secondary);">Margen Neto:</span>
                  <span id="calc-margin" style="font-weight:800; color:var(--success); font-size:1rem;">0%</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="font-size:0.8rem; color:var(--text-secondary);">ROAS Proyectado:</span>
                  <span id="calc-roas" style="font-weight:800; color:#fff; font-size:1rem;">0.0</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="font-size:0.8rem; color:var(--text-secondary);">CPA Máximo Permitido:</span>
                  <span id="calc-cpa" style="font-weight:800; color:#fff; font-size:1rem;">$0</span>
                </div>
              </div>

              <!-- Mensaje de impacto de IA -->
              <div style="margin-top:16px; padding:12px; background:rgba(16,185,129,0.05); border-left:4px solid var(--success); border-radius:6px; font-size:0.75rem; color:#f1f5f9; line-height:1.5;">
                💡 <strong>Análisis de LIAM:</strong> Esta mejora en la estructura de oferta incrementa la utilidad neta estimada un <strong>12%</strong>.
              </div>
            </div>

            <!-- Version History -->
            <div class="card" style="border-radius:14px; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06);">
              <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>🕒</span> Historial de Estrategias
              </h3>
              <div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto;" id="launch-version-history">
                <p style="color:var(--text-secondary); font-size:0.8rem; text-align:center; padding:10px 0;">Sin modificaciones</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  `;
}

export async function init() {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const id = params.get('id');
  if (!id) { showError('Falta el ID del activo.'); return; }

  try {
    const res = await api.get(`/launches/${id}/review`);
    if (res.success && res.data) {
      currentProduct = res.data.product;
      currentHistory = res.data.history || [];
    } else {
      showError(res.error?.message || 'Error del servidor.');
      return;
    }
  } catch { showError('Error de conexión al cargar activo.'); return; }

  // Hydrate base data
  renderProductReview();

  // Load simulations
  loadAdvisorData(id);

  // Configure central column edit tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-secondary)';
        b.style.borderBottom = 'none';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(c => (c.style.display = 'none'));
      document.getElementById(tabId).style.display = 'block';
    });
  });

  // Action listeners
  document.getElementById('btn-publish-landing')?.addEventListener('click', handlePublishLanding);
  
  document.getElementById('btn-preview-landing-trigger')?.addEventListener('click', () => {
    const slug = currentProduct?.launch_blueprint?.landing_meta?.slug || currentProduct?.slug;
    window.open('http://localhost:3000/launch/' + slug, '_blank');
  });

  // Save buttons listeners
  document.getElementById('btn-save-offer')?.addEventListener('click', async () => {
    const priceUnit = parseFloat(document.getElementById('offer-price').value);
    const bundle    = document.querySelector('input[name="offer-bundle"]:checked')?.value || 'combo_x2';
    const cost      = currentProduct.launch_blueprint?.offer?.price_cost || 0;
    await saveBlueprintSection('offer', { price_cost: cost, price_unit: priceUnit, bundle, urgency_trigger: currentProduct.launch_blueprint?.offer?.urgency_trigger || 'Solo hoy - Envío gratis' });
  });

  document.getElementById('btn-save-copy')?.addEventListener('click', async () => {
    const headline   = document.getElementById('copy-headline').value;
    const bulletText = document.getElementById('copy-bullets').value;
    const script     = document.getElementById('copy-script').value;
    const whatsapp   = document.getElementById('copy-whatsapp').value;
    const bullets    = bulletText.split('\n').filter(b => b.trim());
    await saveBlueprintSection('content', { faq: currentProduct.launch_blueprint?.content?.faq || [], whatsapp_template: whatsapp });
    await saveBlueprintSection('marketing', { hooks: [headline].concat(bullets), ugc_angles: script.split('\n').filter(Boolean) });
  });

  document.getElementById('btn-save-seo')?.addEventListener('click', async () => {
    const slug  = document.getElementById('seo-slug').value;
    const title = document.getElementById('seo-title').value;
    const desc  = document.getElementById('seo-desc').value;
    const kws   = document.getElementById('seo-keywords').value.split(',').map(k => k.trim()).filter(Boolean);
    await saveBlueprintSection('seo', { slug, title, description: desc, keywords: kws });
  });

  // Regen listeners
  document.getElementById('btn-regenerate-copy')?.addEventListener('click', () => triggerRegeneration('marketing'));
  document.getElementById('btn-regenerate-seo')?.addEventListener('click',  () => triggerRegeneration('seo'));

  // Sincronizar botones de estado
  document.getElementById('btn-approve-launch')?.addEventListener('click', async () => {
    try {
      const res = await api.post(`/launches/${currentProduct.id}/approve`);
      if (res.success) {
        showToast('Activo aprobado con éxito.');
        setTimeout(() => { window.location.hash = '#/product-radar'; }, 800);
      }
    } catch { showToast('Error al conectar con la API.', 'danger'); }
  });

  document.getElementById('btn-reject-launch')?.addEventListener('click', async () => {
    try {
      const res = await api.post(`/launches/${currentProduct.id}/reject`);
      if (res.success) {
        showToast('Activo retornado a borrador.');
        setTimeout(() => { window.location.hash = '#/product-radar'; }, 800);
      }
    } catch { showToast('Error al conectar con la API.', 'danger'); }
  });

  // Calculadores reactivos
  document.getElementById('offer-price')?.addEventListener('input', recalculateFinancialProjections);
  document.querySelectorAll('input[name="offer-bundle"]').forEach(r => r.addEventListener('change', recalculateFinancialProjections));
  document.getElementById('seo-title')?.addEventListener('input', updateSEOCharacterCounters);
  document.getElementById('seo-desc')?.addEventListener('input',  updateSEOCharacterCounters);

  // Chat
  document.getElementById('btn-chat-send')?.addEventListener('click', handleChatSend);
  document.getElementById('chat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleChatSend(); });
}

async function loadAdvisorData(productId) {
  try {
    const res = await api.post(`/launches/${productId}/simulate`, {});
    if (!res.success || !res.data) return;

    advisorData = res.data;
    const { base } = advisorData;

    // Actualizar score e histográma
    document.getElementById('confidence-circle').textContent = base.scoring.confidence;
    document.getElementById('confidence-verdict').textContent = base.scoring.confidence >= 80 ? 'Excelente' : 'Estable';
    document.getElementById('confidence-grade').textContent = base.scoring.grade;
  } catch (err) {
    console.warn('[Advisor] error:', err);
  }
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #1f2937; border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    color: #f3f4f6; padding: 12px 20px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px;
    animation: slideIn 0.3s ease-out; transition: opacity 0.3s;
  `;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); }, 300);
  }, 4000);
}

function recalculateFinancialProjections() {
  const priceUnit = parseFloat(document.getElementById('offer-price').value) || 0;
  const cost      = currentProduct.launch_blueprint?.offer?.price_cost || 0;
  const bundle    = document.querySelector('input[name="offer-bundle"]:checked')?.value || 'combo_x2';

  let finalPrice = priceUnit;
  let finalCost  = cost;
  if (bundle === 'combo_x2') { finalPrice = Math.round(priceUnit * 1.7); finalCost = cost * 2; }
  else if (bundle === 'combo_x3') { finalPrice = Math.round(priceUnit * 2.4); finalCost = cost * 3; }

  const profit = finalPrice - finalCost - 15000;
  const margin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
  const breakevenRoas = profit > 0 ? finalPrice / (finalPrice - finalCost - 15000) : 0;
  const maxCpa = profit > 0 ? profit : 0;

  document.getElementById('calc-margin').textContent = `${margin.toFixed(1)}%`;
  document.getElementById('calc-roas').textContent   = breakevenRoas.toFixed(2);
  document.getElementById('calc-cpa').textContent    = `$${Math.round(maxCpa).toLocaleString()} COP`;
}

function updateSEOCharacterCounters() {
  document.getElementById('counter-title').textContent = `${document.getElementById('seo-title').value.length} / 60`;
  document.getElementById('counter-desc').textContent  = `${document.getElementById('seo-desc').value.length} / 160`;
}

function renderProductReview() {
  document.getElementById('workspace-loading').style.display = 'none';
  document.getElementById('workspace-content').style.display = 'block';

  const bp = currentProduct.launch_blueprint || {};

  // Header
  document.getElementById('product-title').textContent = currentProduct.name;
  const syncDate = currentProduct.provider_last_sync ? new Date(currentProduct.provider_last_sync) : new Date();
  document.getElementById('last-sync-time').innerHTML = `✓ Sincronizado con Dropi hace ${Math.round((Date.now() - syncDate.getTime()) / 60000)} min`;

  // Badges y datos del activo
  document.getElementById('asset-original-name').textContent = currentProduct.name;
  document.getElementById('asset-sku').textContent = currentProduct.supplier_info?.sku || `DP-${currentProduct.id}`;
  document.getElementById('asset-category').textContent = currentProduct.category || 'Hogar & Cocina';
  document.getElementById('asset-stock-value').textContent = `${currentProduct.stock || 120} unidades`;

  // Imagen destacada Dropi
  const imgCarousel = document.getElementById('product-images-carousel');
  const imgs = currentProduct.images || [];
  if (imgs.length === 0) {
    imgCarousel.innerHTML = `<div style="grid-column:span 3; text-align:center; font-size:0.75rem; color:var(--text-secondary);">Sin imágenes</div>`;
  } else {
    imgCarousel.innerHTML = imgs.slice(0, 3).map(img => `
      <div style="width:100%; height:70px; overflow:hidden; border-radius:6px; background:#000; border:1px solid rgba(255,255,255,0.06);">
        <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
      </div>
    `).join('');
  }

  // Hydrate inputs
  const offer = bp.offer || { price_cost: 0, price_unit: 0, bundle: 'combo_x2' };
  document.getElementById('offer-cost').value  = offer.price_cost;
  document.getElementById('offer-price').value = offer.price_unit;
  document.querySelectorAll('input[name="offer-bundle"]').forEach(r => (r.checked = r.value === offer.bundle));

  recalculateFinancialProjections();

  // SEO & Content
  const seo     = bp.seo       || { title: '', slug: '', keywords: [] };
  const content  = bp.content   || { faq: [], whatsapp_template: '' };
  const marketing = bp.marketing || { hooks: [], ugc_angles: [] };

  document.getElementById('seo-slug').value     = seo.slug || currentProduct.slug;
  document.getElementById('seo-title').value    = seo.title || '';
  document.getElementById('seo-desc').value     = seo.description || '';
  document.getElementById('seo-keywords').value = (seo.keywords || []).join(', ');
  document.getElementById('copy-headline').value = marketing.hooks?.[0] || '';
  document.getElementById('copy-bullets').value  = (marketing.hooks || []).slice(1).join('\n');
  document.getElementById('copy-script').value   = (marketing.ugc_angles || []).join('\n');
  document.getElementById('copy-whatsapp').value = content.whatsapp_template || '';

  updateSEOCharacterCounters();
  renderLandingBuilder();
}

function renderLandingBuilder() {
  const bp = currentProduct.launch_blueprint || {};
  const meta = bp.landing_meta;
  const activeTheme = bp.theme || 'premium';

  // 1. Render Themes Grid (LIAM Theme Engine Library)
  const themesList = [
    { key: 'minimal', name: 'Minimal Clean', score: 90, desc: 'Enfoque en simplicidad, tipografía y espacio.', image: '/uploads/themes/minimal.jpg' },
    { key: 'premium', name: 'Premium Glass', score: 96, desc: 'Glassmorphism, neones y animaciones fluidas.', image: '/uploads/themes/premium.jpg' },
    { key: 'flash_sale', name: 'Oferta Flash', score: 92, desc: 'Contadores urgentes y badges agresivos.', image: '/uploads/themes/flash_sale.jpg' },
    { key: 'tiktok_ugc', name: 'TikTok Style UGC', score: 94, desc: 'Testimonios, video vertical y UGC.', image: '/uploads/themes/tiktok_ugc.jpg' },
    { key: 'luxury', name: 'Luxury Gold', score: 88, desc: 'Fondo oscuro profundo y toques oro.', image: '/uploads/themes/luxury.jpg' }
  ];

  const themesGrid = document.getElementById('landing-themes-grid');
  if (themesGrid) {
    themesGrid.innerHTML = themesList.map(t => {
      const isSelected = t.key === activeTheme;
      return `
        <div class="theme-card" data-theme-key="${t.key}" style="padding:0; background:${isSelected ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.01)'}; border:${isSelected ? '2px solid var(--brand-primary-light)' : '1px solid var(--border)'}; border-radius:12px; cursor:pointer; position:relative; transition:all 0.2s; overflow:hidden; display:flex; flex-direction:column;">
          <div style="padding:12px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:700; font-size:0.85rem; color:${isSelected ? 'var(--brand-primary-light)' : 'var(--text)'}">${t.name}</span>
                <span style="font-size:0.65rem; background:rgba(16,185,129,0.15); color:var(--success); padding:2px 6px; border-radius:6px; font-weight:800;">Score: ${t.score}%</span>
              </div>
              <p style="font-size:0.75rem; color:var(--text-secondary); margin:0; line-height:1.4; margin-bottom:10px;">${t.desc}</p>
            </div>
            ${isSelected ? `<span style="font-size:0.75rem; font-weight:700; color:var(--brand-primary-light); display:flex; align-items:center; gap:4px;">✨ Plantilla Activa</span>` : `<span style="font-size:0.72rem; color:var(--text-muted);">Seleccionar</span>`}
          </div>
        </div>
      `;
    }).join('');

    themesGrid.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', async () => {
        const themeKey = card.getAttribute('data-theme-key');
        if (themeKey === activeTheme) return;

        card.style.opacity = '0.5';
        try {
          const res = await api.patch(`/launches/${currentProduct.id}/theme`, { theme: themeKey });
          if (res.success) {
            currentProduct.launch_blueprint.theme = themeKey;
            showToast(`Plantilla cambiada a ${themesList.find(t => t.key === themeKey).name}.`);
            renderLandingBuilder();
          }
        } catch (err) {
          showToast('Error al cambiar de plantilla', 'danger');
        } finally {
          card.style.opacity = '1';
        }
      });
    });
  }

  // 2. Render Sections Grid
  const blocks = meta?.blocks || [
    { key: 'hero', label: 'Hero', visible: true },
    { key: 'problem', label: 'Problema/Solución', visible: !!(bp.customer?.pain_points?.length || bp.customer?.desires?.length) },
    { key: 'benefits', label: 'Beneficios', visible: (bp.marketing?.hooks?.length || 0) > 1 },
    { key: 'features', label: 'Características', visible: !!(bp.seo?.keywords?.length) },
    { key: 'faq', label: 'FAQ', visible: !!(bp.content?.faq?.length) },
    { key: 'warranty', label: 'Garantía', visible: true },
    { key: 'checkout', label: 'Checkout', visible: true },
  ];

  const grid = document.getElementById('landing-blocks-grid');
  grid.innerHTML = blocks.map(b => `
    <div style="background:${b.visible ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${b.visible ? 'rgba(16,185,129,0.2)' : 'var(--border)'}; border-radius:10px; padding:14px; text-align:center; opacity:${b.visible ? '1' : '0.5'};">
      <div style="font-size:1.5rem; margin-bottom:6px;">
        ${b.key === 'hero' ? '🦸' : b.key === 'problem' ? '🤔' : b.key === 'benefits' ? '✅' : b.key === 'features' ? '✨' : b.key === 'faq' ? '❓' : b.key === 'warranty' ? '🛡️' : '📦'}
      </div>
      <div style="font-weight:600; font-size:0.8rem;">${b.label}</div>
      <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px;">${b.visible ? 'Activo' : 'Sin datos'}</div>
    </div>
  `).join('');

  if (bp.landing_html) {
    const statusEl = document.getElementById('landing-published-box');
    statusEl.style.display = 'block';
    document.getElementById('landing-url-display').textContent = meta?.url || `http://localhost:3000/launch/${meta?.slug || currentProduct.slug}`;
    document.getElementById('landing-open-link').href = meta?.url || `http://localhost:3000/launch/${meta?.slug || currentProduct.slug}`;
  }
}

async function handlePublishLanding() {
  const btn = document.getElementById('btn-publish-landing');
  btn.textContent = '⏳ Publicando...';
  btn.disabled = true;

  try {
    const res = await api.post(`/launches/${currentProduct.id}/publish`, {});
    if (res.success) {
      const d = res.data;
      currentProduct.launch_blueprint = currentProduct.launch_blueprint || {};
      currentProduct.launch_blueprint.landing_meta = { slug: d.slug, url: d.url, version: d.version };
      currentProduct.launch_blueprint.landing_html = 'published';

      const statusEl = document.getElementById('landing-published-box');
      statusEl.style.display = 'block';
      document.getElementById('landing-url-display').textContent = d.url;
      document.getElementById('landing-open-link').href = d.url;

      btn.textContent = '✅ Publicada';
      btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';

      document.getElementById('status-badge').textContent = 'PUBLISHED';
      document.getElementById('status-badge').style.background = 'rgba(16,185,129,.15)';
      document.getElementById('status-badge').style.color = '#34d399';

      renderLandingBuilder();
    } else {
      showToast('Error: ' + (res.error?.message || 'Error al publicar'), 'danger');
      btn.textContent = '🚀 Publicar Landing';
      btn.disabled = false;
    }
  } catch (err) {
    showToast('Error de conexión: ' + err.message, 'danger');
    btn.textContent = '🚀 Publicar Landing';
    btn.disabled = false;
  }
}

async function saveBlueprintSection(section, data) {
  try {
    const res = await api.patch(`/launches/${currentProduct.id}/review`, { section, data });
    if (res.success && res.data) {
      currentProduct = res.data.product;
      showToast(`Cambios de '${section}' guardados. Versión ${res.data.version} creada.`);
      renderProductReview();
    } else {
      showToast('Error al guardar: ' + (res.error?.message || 'Error del servidor'), 'danger');
    }
  } catch { showToast('Error de conexión al guardar.', 'danger'); }
}

async function triggerRegeneration(section) {
  try {
    const res = await api.post(`/launches/${currentProduct.id}/regenerate`, { section });
    if (res.success && res.data) {
      currentProduct = res.data.product;
      showToast(`Sección '${section}' regenerada por LIAM.`);
      renderProductReview();
    }
  } catch { showToast('Error de conexión al regenerar.', 'danger'); }
}

async function handleChatSend() {
  const inputEl = document.getElementById('chat-input');
  const text    = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  const productId = currentProduct.id;

  appendChatMessage('user', text);

  // Intercept What-If simulator
  const scenario = detectWhatIf(text);
  if (scenario) {
    const thinking = appendChatMessage('liam', '⏳ Calculando escenario...', true);
    const result   = await runSingleSimulation(productId, scenario);
    thinking.remove();

    if (result) {
      result._baseConfidence = advisorData?.base?.scoring?.confidence;
      const html = buildWhatIfResponse(text, result);
      appendChatMessage('liam', html);
    } else {
      appendChatMessage('liam', '⚠️ No pude calcular ese escenario. Intenta con un precio específico.');
    }
    return;
  }

  // Normal LLM chat command
  const thinking = appendChatMessage('liam', '⏳ LIAM está evaluando la oportunidad...', true);
  try {
    const res = await api.post(`/launches/${productId}/chat`, {
      objective: text,
      context: { productId },
      memoryType: 'session',
      memoryKey: `review_${productId}`
    });
    thinking.remove();
    if (res.success && res.data?.result) {
      appendChatMessage('liam', res.data.result);
    } else {
      appendChatMessage('liam', res.error?.message || 'Error al conectar con LIAM.');
    }
  } catch {
    thinking.remove();
    appendChatMessage('liam', 'Error de conexión. Intenta de nuevo.');
  }
}

async function runSingleSimulation(productId, scenario) {
  try {
    const res = await api.post(`/launches/${productId}/simulate`, { scenario });
    if (!res.success) return null;
    return res.data.simulation;
  } catch {
    return null;
  }
}

function appendChatMessage(role, html, ephemeral = false) {
  const el = document.getElementById('chat-messages');
  if (!el) return { remove: () => {} };

  const isLiam = role === 'liam';
  const div = document.createElement('div');
  div.style.cssText = `
    display: flex; gap: 8px; align-items: flex-start; margin-bottom:10px;
    ${isLiam ? 'flex-direction: row;' : 'flex-direction: row-reverse;'}
  `;
  div.innerHTML = `
    <div style="font-size:1.1rem; flex-shrink:0;">${isLiam ? '🤖' : '👤'}</div>
    <div style="
      background: ${isLiam ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)'};
      border: 1px solid ${isLiam ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)'};
      border-radius: 10px; padding: 10px 12px;
      font-size: 0.8rem; line-height: 1.5; color: #f1f5f9;
      max-width: 90%;
    ">${html}</div>
  `;

  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  if (ephemeral) return div;
  chatHistory.push({ role, html });
  return div;
}

function showError(msg) {
  document.getElementById('workspace-loading').style.display = 'none';
  document.getElementById('workspace-error').style.display = 'block';
  document.getElementById('workspace-error-msg').textContent = msg;
}
