import { api } from '../lib/api.js';
import { renderDataTable } from '../components/datatable.js';
import { renderModal } from '../components/modal.js';

export function render() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 style="font-size:1.25rem;font-weight:700;">Categorías</h2>
      <button class="btn btn-primary" id="newCategoryBtn">+ Nueva categoría</button>
    </div>
    <div class="card" id="categoriesTable">
      <div style="text-align:center;padding:2rem;color:#94a3b8;">Cargando...</div>
    </div>
    ${renderModal({
      id: 'categoryModal',
      title: 'Nueva categoría',
      submitLabel: 'Guardar',
      content: `
        <div class="form-group"><label>Nombre</label><input name="name" class="form-input" required></div>
        <div class="form-group"><label>Slug</label><input name="slug" class="form-input" required></div>
        <div class="form-group"><label>Orden</label><input name="sort_order" type="number" value="0" class="form-input"></div>
      `
    })}
  `;
}

export async function init() {
  document.getElementById('newCategoryBtn')?.addEventListener('click', () => window.openModal('categoryModal'));
  document.getElementById('categoryModalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.sort_order = parseInt(data.sort_order, 10);
    const result = await api.post('/categories', data);
    if (result.success) {
      window.closeModal('categoryModal');
      loadCategories();
    }
  });
  await loadCategories();
}

async function loadCategories() {
  const result = await api.get('/categories');
  if (!result.success) return;
  const columns = [
    { label: 'Nombre', key: 'name' },
    { label: 'Slug', key: 'slug' },
    { label: 'Orden', key: 'sort_order' },
  ];
  document.getElementById('categoriesTable').innerHTML = renderDataTable({ columns, rows: result.data || [] });
}
