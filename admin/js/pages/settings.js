import { api } from '../lib/api.js';

export function render() {
  return `<div class="card" id="settingsForm"><div style="text-align:center;padding:2rem;color:#94a3b8;">Cargando...</div></div>`;
}

export async function init() {
  const result = await api.get('/config');
  if (!result.success) return;

  const config = result.data;
  let html = '<form id="settingsFormSubmit">';

  const groups = {
    brand: 'Marca',
    contact: 'Contacto',
    analytics: 'Analítica',
    shipping: 'Envíos',
  };

  for (const [group, label] of Object.entries(groups)) {
    if (!config[group]) continue;
    html += `<h3 style="margin:1rem 0 0.5rem;font-weight:600;">${label}</h3>`;
    for (const [key, value] of Object.entries(config[group])) {
      const fieldName = `${group}.${key}`;
      html += `<div class="form-group"><label>${key}</label><input name="${fieldName}" value="${value}" class="form-input"></div>`;
    }
  }

  html += `<button type="submit" class="btn btn-primary" style="margin-top:1rem;">Guardar</button></form>`;
  document.getElementById('settingsForm').innerHTML = html;

  document.getElementById('settingsFormSubmit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert('Configuración actualizada (placeholder)');
  });
}
