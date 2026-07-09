import { api } from '../lib/api.js';
import { renderDataTable } from '../components/datatable.js';

export function render() {
  return `<div class="card" id="auditTable"><div style="text-align:center;padding:2rem;color:#94a3b8;">Cargando...</div></div>`;
}

export async function init() {
  const result = await api.get('/audit?per_page=50');
  if (!result.success) return;

  const columns = [
    { label: 'Acción', key: 'action' },
    { label: 'Entidad', key: 'entity_type' },
    { label: 'Usuario', key: 'user_name' },
    { label: 'Fecha', render: (r) => new Date(r.created_at).toLocaleString() },
  ];

  document.getElementById('auditTable').innerHTML = renderDataTable({ columns, rows: result.data?.logs || result.data || [] });
}
