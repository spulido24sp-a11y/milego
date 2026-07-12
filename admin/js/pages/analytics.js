import { api } from '../lib/api.js';

export function render() {
  return `
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
        <span>📈</span> Growth Analytics
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        No analices gráficos complejos. Hazle preguntas de negocio a LIAM y recibe respuestas de inmediato.
      </p>
    </div>

    <!-- Analytics Cockpit -->
    <div class="card" style="max-width: 900px; margin: 0 auto;">
      <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="font-weight: 700; color: var(--text); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span>💬</span> Consultor de Crecimiento LIAM
        </h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
          "Hola. Analizo continuamente tus embudos de conversión, las ventas en Colombia y el rendimiento publicitario. Escribe tu pregunta comercial abajo para diagnosticar el negocio."
        </p>
      </div>

      <!-- Quick prompts -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">Preguntas Frecuentes Sugeridas:</label>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm quick-prompt-btn" data-query="why">¿Por qué variaron las ventas esta semana?</button>
          <button class="btn btn-outline btn-sm quick-prompt-btn" data-query="scale">¿Qué producto debería escalar en Meta Ads?</button>
          <button class="btn btn-outline btn-sm quick-prompt-btn" data-query="ads">¿Qué anuncios están perdiendo rendimiento?</button>
        </div>
      </div>

      <!-- Dialogue area -->
      <div id="analytics-chat-dialog" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; min-height: 180px; font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary); display: flex; flex-direction: column; gap: 1rem;">
        <div style="color: var(--text-secondary); font-style: italic; text-align: center; margin-top: 3.5rem;">
          Selecciona una pregunta rápida arriba o escribe en la consola.
        </div>
      </div>

      <!-- Input box -->
      <form id="analytics-chat-form" style="display: flex; gap: 8px; margin-top: 1.25rem;">
        <input type="text" class="liam-prompt-input" id="analytics-chat-input" placeholder="Pregunta: ¿Cómo mejorar el ROAS de mi proyector?...">
        <button type="submit" class="btn btn-primary">Preguntar</button>
      </form>
    </div>
  `;
}

export function init() {
  const form = document.getElementById('analytics-chat-form');
  const input = document.getElementById('analytics-chat-input');
  const dialog = document.getElementById('analytics-chat-dialog');

  const answers = {
    why: `<strong>Respuesta de LIAM:</strong><br>
          Las ventas totales registraron un aumento del 14% esta semana. 
          <br><br>
          <strong>Causas principales:</strong>
          <br>
          1. El combo "Smart Projector 2x1" tuvo un incremento de CTR en Meta Ads en Bogotá de 2.1% a 2.8%.
          <br>
          2. El tiempo de carga de las páginas móviles disminuyó de 2.4s a 1.2s debido a la optimización de assets.`,
    
    scale: `<strong>Respuesta de LIAM:</strong><br>
            Recomiendo escalar el producto <strong>Smart Lamp Pro</strong>.
            <br><br>
            <strong>Justificación analítica:</strong>
            <br>
            - Margen actual del 64.2%.
            - Conversión de landing estable en 4.5% en Cali y Medellín.
            - Stock disponible en bodega local: 150 unidades.
            - ROAS proyectado en escala de presupuesto: 3.8.`,
    
    ads: `<strong>Respuesta de LIAM:</strong><br>
          El conjunto de anuncios "CO_SmartProjector_Interesados_V1" en Meta Ads ha incrementado su costo por adquisición (CPA) en un 22% en las últimas 48 horas.
          <br><br>
          <strong>Acción recomendada:</strong>
          <br>
          Sugeriré refrescar los creativos con la variación "Cine en Familia" generada en el Content Studio para mitigar la fatiga del público.`
  };

  function processQuery(key, customText = '') {
    dialog.innerHTML = `<div style="color: var(--brand-light); text-align: center; margin-top: 3.5rem;">LIAM consultando datos de rendimiento...</div>`;
    
    setTimeout(() => {
      if (answers[key]) {
        dialog.innerHTML = `<div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 8px; padding: 1rem; color: var(--text);">${answers[key]}</div>`;
      } else {
        dialog.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; color: var(--text);">
            <strong>Consulta:</strong> "${customText}"
            <br><br>
            <strong>Respuesta de LIAM:</strong>
            <br>
            Entendido. Analizando bases transaccionales de venta en Colombia. En el Sprint 3 conectaremos la analítica predictiva del LLM en tiempo real.
          </div>
        `;
      }
    }, 1200);
  }

  // Quick prompt buttons
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.query;
      processQuery(q);
    });
  });

  // Custom form query
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    processQuery('custom', query);
    input.value = '';
  });
}
