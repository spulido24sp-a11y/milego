import { api } from '../lib/api.js';
import { renderDataTable } from '../components/datatable.js';

export function render() {
  return `<div class="card" id="usersTable"><div style="text-align:center;padding:2rem;color:#94a3b8;">Cargando...</div></div>`;
}

export async function init() {
  const result = await api.get('/users');
  if (!result.success) return;

  const columns = [
    { label: 'Nombre', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Estado', render: (r) => r.is_active ? 'Activo' : 'Inactivo' },
    { label: 'Creado', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  document.getElementById('usersTable').innerHTML = renderDataTable({ columns, rows: result.data || [] });
}
