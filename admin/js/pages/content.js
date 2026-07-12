import { api } from '../lib/api.js';

export function render() {
  return `
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
        <span>🎨</span> Content Studio
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        Espacio creativo. Coordina la generación automatizada de copies publicitarios, anuncios y reseñas de producto.
      </p>
    </div>

    <div class="grid-2">
      <!-- Copy generator workspace -->
      <div class="card">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <span>✍️</span> Redacción Publicitaria (AI Assistant)
        </h3>

        <div class="form-group">
          <label>Seleccionar Producto</label>
          <select class="form-input" id="content-product-select">
            <option value="lamp">Smart Lamp Pro</option>
            <option value="projector">Smart Projector Pro</option>
          </select>
        </div>

        <div class="form-group">
          <label>Tono del Copy</label>
          <select class="form-input" id="content-tone-select">
            <option value="persuasive">Persuasivo & Comercial</option>
            <option value="scientific">Técnico & Descriptivo</option>
            <option value="emotional">Emocional & Empático</option>
          </select>
        </div>

        <button class="btn btn-primary" id="btn-generate-copy" style="width: 100%; justify-content: center; margin-top: 0.5rem;">
          ✨ Redactar Copy con LIAM
        </button>

        <div id="ai-copy-output" style="margin-top: 1.5rem; background: rgba(0,0,0,0.25); border: 1px dashed var(--border); border-radius: 12px; padding: 1.25rem; min-height: 120px; font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary); white-space: pre-line;">
          Haz clic en 'Redactar Copy' para que LIAM elabore el texto publicitario de tu campaña.
        </div>
      </div>

      <!-- Reviews Moderator -->
      <div class="card">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <span>⭐</span> Moderador de Reseñas (Testimonios)
        </h3>

        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;" id="content-reviews-list">
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 12px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 0.85rem;">Carlos M. (Bogotá)</span>
              <span style="color: #fbbf24; font-size: 0.8rem;">★★★★★</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
              "El proyector superó mis expectativas. La resolución es excelente y llegó en solo 24 horas a mi apartamento."
            </p>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 12px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 0.85rem;">Ana G. (Medellín)</span>
              <span style="color: #fbbf24; font-size: 0.8rem;">★★★★☆</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
              "Muy práctico. El color de la lámpara combina perfecto con mi oficina. Buen producto."
            </p>
          </div>
        </div>

        <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="alert('Moderador avanzado disponible en el Sprint 3.')">
          Ver Todas las Reseñas
        </button>
      </div>
    </div>
  `;
}

export function init() {
  const btn = document.getElementById('btn-generate-copy');
  const output = document.getElementById('ai-copy-output');
  const prodSelect = document.getElementById('content-product-select');

  btn.addEventListener('click', () => {
    output.innerHTML = `<span style="color: var(--brand-light);">LIAM está redactando el copy...</span>`;
    
    setTimeout(() => {
      const prod = prodSelect.value;
      if (prod === 'lamp') {
        output.innerHTML = `
          <strong>💡 ¡La revolución en iluminación llegó a tu hogar!</strong>

          ¿Cansado de luces monótonas que no combinan con tu estado de ánimo? Presentamos la <strong>Smart Lamp Pro</strong>. 

          ✅ Control total desde tu celular (iOS y Android)
          ✅ Millones de colores personalizables para cada espacio
          ✅ Envío gratis con pago contra entrega en toda Colombia

          👇 ¡Haz tu pedido hoy y recibe 20% de descuento en el combo de dos unidades!
        `;
      } else {
        output.innerHTML = `
          <strong>🎬 ¡Lleva el cine a tu sala con el Smart Projector Pro!</strong>

          Disfruta de tus películas, series y deportes favoritos en una pantalla gigante de hasta 150 pulgadas de alta definición.

          ✅ Conexión Wi-Fi integrada (sincroniza YouTube y Netflix de inmediato)
          ✅ Parlante de alta fidelidad incorporado
          ✅ Envío gratuito a tu casa. Paga seguro al recibir.

          🚀 Lanzamiento exclusivo. Unidades limitadas en bodega Cali. ¡Pide el tuyo ahora!
        `;
      }
    }, 1200);
  });
}
