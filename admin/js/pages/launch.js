import { api } from '../lib/api.js';

export function render() {
  return `
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
        <span>🚀</span> Launch Center
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        No administres catálogos. Lanza oportunidades al mercado de inmediato con la ayuda de LIAM.
      </p>
    </div>

    <!-- Multi-step wizard -->
    <div class="card" style="max-width: 800px; margin: 0 auto;">
      <!-- Steps Indicator -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; position: relative;">
        <div style="position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: var(--border); z-index: 1;"></div>
        <div style="position: absolute; top: 15px; left: 0; width: 0%; height: 2px; background: var(--brand); z-index: 2; transition: width 0.3s;" id="step-progress-bar"></div>
        
        <div style="z-index: 3; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--brand); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;" id="indicator-1">1</div>
          <span style="font-size: 0.75rem; font-weight: 600; margin-top: 8px; color: var(--text);">Origen</span>
        </div>
        <div style="z-index: 3; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;" id="indicator-2">2</div>
          <span style="font-size: 0.75rem; font-weight: 600; margin-top: 8px; color: var(--text-secondary);" id="label-2">Márgenes</span>
        </div>
        <div style="z-index: 3; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;" id="indicator-3">3</div>
          <span style="font-size: 0.75rem; font-weight: 600; margin-top: 8px; color: var(--text-secondary);" id="label-3">Lanzamiento</span>
        </div>
      </div>

      <!-- Step 1: Source selection -->
      <div id="step-1" class="wizard-step">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700;">Paso 1: Origen del Producto</h3>
        
        <div class="form-group">
          <label>URL o ID de Dropi / Triidy (Opcional - Simulado)</label>
          <input type="text" class="form-input" id="import-url" placeholder="https://app.dropi.co/product/12345 o similar...">
        </div>

        <div style="text-align: center; margin: 1.5rem 0; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600;">O INGRESA LOS DATOS MANUALMENTE</div>

        <div class="form-group">
          <label>Nombre del Producto *</label>
          <input type="text" class="form-input" id="prod-name" placeholder="Ej: Smart Lamp Pro">
        </div>

        <div class="form-group">
          <label>SKU Base *</label>
          <input type="text" class="form-input" id="prod-sku" placeholder="Ej: SL-PRO-01">
        </div>

        <div class="form-group">
          <label>Slug de Tienda (URL) *</label>
          <input type="text" class="form-input" id="prod-slug" placeholder="Ej: smart-lamp-pro">
        </div>

        <div class="form-group">
          <label>Descripción del Producto</label>
          <textarea class="form-input" id="prod-desc" style="min-height: 100px;" placeholder="Detalles de la oferta..."></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
          <button class="btn btn-primary" id="btn-to-step-2">Continuar a Márgenes</button>
        </div>
      </div>

      <!-- Step 2: Margins, Pricing & Combos -->
      <div id="step-2" class="wizard-step" style="display: none;">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700;">Paso 2: Finanzas y Estructura de Precios</h3>

        <div class="grid-2" style="grid-template-columns: 1fr 1fr; margin-bottom: 1.5rem;">
          <div class="form-group">
            <label>Costo del Proveedor (COP)</label>
            <input type="number" class="form-input" id="price-cost" value="25000">
          </div>
          <div class="form-group">
            <label>Precio de Venta Sugerido (COP)</label>
            <input type="number" class="form-input" id="price-selling" value="69900">
          </div>
        </div>

        <!-- LIAM intelligence box -->
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="font-weight: 700; font-size: 0.85rem; color: #a7f3d0; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>🧠</span> Proyección Inteligente de LIAM
          </div>
          <div style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.5;">
            Costo: <span style="color: var(--text); font-weight: 600;">$25.000 COP</span> | 
            Venta: <span style="color: var(--text); font-weight: 600;">$69.900 COP</span> | 
            Márgen Estimado: <span style="color: var(--success); font-weight: 700;">64.2%</span>
            <br>
            <span style="color: var(--brand-light);">Recomendación:</span> El ROAS de equilibrio para esta estructura es de <span style="color: var(--text); font-weight: 600;">1.56</span>. Sugiero empaquetar una oferta combo de "Lleva 2 por $119.900 COP" para aumentar el ticket promedio.
          </div>
        </div>

        <div class="form-group">
          <label>Inventario Inicial *</label>
          <input type="number" class="form-input" id="prod-stock" value="100">
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 1.5rem;">
          <button class="btn btn-outline" id="btn-back-to-step-1">Atrás</button>
          <button class="btn btn-primary" id="btn-to-step-3">Continuar a Despliegue</button>
        </div>
      </div>

      <!-- Step 3: Launch deployment -->
      <div id="step-3" class="wizard-step" style="display: none;">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700;">Paso 3: Lanzamiento e Integración</h3>

        <div style="text-align: center; padding: 1.5rem 0;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🛰️</div>
          <h4 style="font-weight: 700; margin-bottom: 8px;">Listo para el OS de Lanzamiento</h4>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 480px; margin: 0 auto; line-height: 1.6;">
            Al confirmar, se creará el producto en el catálogo seguro multi-tenant y se inicializará el Workspace de copies en el Content Studio.
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 1.5rem;">
          <button class="btn btn-outline" id="btn-back-to-step-2">Atrás</button>
          <button class="btn btn-primary" id="btn-launch-execute">🚀 Confirmar Lanzamiento</button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  const ind1 = document.getElementById('indicator-1');
  const ind2 = document.getElementById('indicator-2');
  const ind3 = document.getElementById('indicator-3');

  const lbl2 = document.getElementById('label-2');
  const lbl3 = document.getElementById('label-3');
  const bar = document.getElementById('step-progress-bar');

  // URL auto-filler simulator for Dropi
  const importUrl = document.getElementById('import-url');
  importUrl.addEventListener('input', () => {
    const val = importUrl.value.trim();
    if (val.length > 5) {
      document.getElementById('prod-name').value = 'Humidificador Ultrasónico RGB';
      document.getElementById('prod-sku').value = 'HUM-RGB-01';
      document.getElementById('prod-slug').value = 'humidificador-ultrasonico-rgb';
      document.getElementById('prod-desc').value = 'Humidificador con luces LED de colores, importado automáticamente de Dropi Bodega Cali.';
    }
  });

  // Navigation Logic
  document.getElementById('btn-to-step-2').addEventListener('click', () => {
    const name = document.getElementById('prod-name').value;
    const sku = document.getElementById('prod-sku').value;
    const slug = document.getElementById('prod-slug').value;

    if (!name || !sku || !slug) {
      alert('Por favor completa todos los campos requeridos (*).');
      return;
    }

    step1.style.display = 'none';
    step2.style.display = 'block';
    
    ind2.style.background = 'var(--brand)';
    ind2.style.color = 'white';
    lbl2.style.color = 'var(--text)';
    bar.style.width = '50%';
  });

  document.getElementById('btn-back-to-step-1').addEventListener('click', () => {
    step2.style.display = 'none';
    step1.style.display = 'block';

    ind2.style.background = 'var(--bg-input)';
    ind2.style.color = 'var(--text-secondary)';
    lbl2.style.color = 'var(--text-secondary)';
    bar.style.width = '0%';
  });

  document.getElementById('btn-to-step-3').addEventListener('click', () => {
    step2.style.display = 'none';
    step3.style.display = 'block';

    ind3.style.background = 'var(--brand)';
    ind3.style.color = 'white';
    lbl3.style.color = 'var(--text)';
    bar.style.width = '100%';
  });

  document.getElementById('btn-back-to-step-2').addEventListener('click', () => {
    step3.style.display = 'none';
    step2.style.display = 'block';

    ind3.style.background = 'var(--bg-input)';
    ind3.style.color = 'var(--text-secondary)';
    lbl3.style.color = 'var(--text-secondary)';
    bar.style.width = '50%';
  });

  // API insertion logic
  document.getElementById('btn-launch-execute').addEventListener('click', async () => {
    const name = document.getElementById('prod-name').value;
    const sku = document.getElementById('prod-sku').value;
    const slug = document.getElementById('prod-slug').value;
    const description = document.getElementById('prod-desc').value;
    const price = parseFloat(document.getElementById('price-selling').value);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);

    try {
      const res = await api.post('/products', {
        name,
        sku,
        slug,
        description,
        price,
        stock,
        is_active: true,
      });

      if (res.id) {
        alert(`¡Lanzamiento exitoso! Producto '${name}' creado de forma segura en multi-tenant.`);
        window.location.hash = '#/products';
      } else {
        alert('Error en la creación: ' + (res.error?.message || 'Error del servidor'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  });
}
