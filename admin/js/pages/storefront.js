import { api } from '../lib/api.js';

export function render() {
  return `
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
        <span>🏠</span> Storefront Config
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        Personaliza la identidad visual de tu marca y define los combos promocionales recomendados por LIAM.
      </p>
    </div>

    <div class="grid-2">
      <!-- Design Settings -->
      <div class="card">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700;">Identidad y Marca</h3>
        
        <div class="form-group">
          <label>Nombre de la Marca</label>
          <input type="text" class="form-input" id="store-name" value="MIleGo Store">
        </div>

        <div class="form-group">
          <label>Color Principal (Hex)</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="color" id="store-color" value="#8b5cf6" style="width: 50px; height: 38px; border: none; border-radius: 8px; background: none; cursor: pointer;">
            <input type="text" class="form-input" id="store-color-text" value="#8b5cf6" style="flex: 1;">
          </div>
        </div>

        <div class="form-group">
          <label>Tipografía del Storefront</label>
          <select class="form-input" id="store-font">
            <option value="Outfit">Outfit (Moderna & Futurista)</option>
            <option value="Inter">Inter (Limpia & Minimalista)</option>
            <option value="Roboto">Roboto (Clásica)</option>
          </select>
        </div>

        <button class="btn btn-primary" id="btn-save-design">💾 Guardar Configuración</button>
      </div>

      <!-- Combo Creator -->
      <div class="card">
        <h3 style="margin-bottom: 1.25rem; font-weight: 700;">Combos Inteligentes</h3>
        
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
          <!-- Combo 1 -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 12px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 0.9rem;">Combo Lleva 2</span>
              <span class="badge badge-success">Activo</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
              El cliente compra 2 unidades y recibe 20% de descuento automático.
            </p>
          </div>

          <!-- Combo 2 -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 12px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 0.9rem;">Combo Paga 2 Lleva 3</span>
              <span class="badge badge-warning">Sugerido por LIAM</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
              Estructura optimizada para mejorar los márgenes de productos de Bogotá.
            </p>
          </div>
        </div>

        <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="alert('Creación de combos disponible en el Sprint 2.')">
          + Crear Nuevo Combo
        </button>
      </div>
    </div>
  `;
}

export function init() {
  const storeColor = document.getElementById('store-color');
  const storeColorText = document.getElementById('store-color-text');

  storeColor.addEventListener('input', () => {
    storeColorText.value = storeColor.value;
  });

  storeColorText.addEventListener('input', () => {
    if (storeColorText.value.startsWith('#') && storeColorText.value.length === 7) {
      storeColor.value = storeColorText.value;
    }
  });

  document.getElementById('btn-save-design').addEventListener('click', () => {
    alert('Diseño del storefront guardado de forma segura.');
  });
}
