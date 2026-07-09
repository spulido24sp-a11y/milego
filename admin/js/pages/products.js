import { api } from '../lib/api.js';
import { renderDataTable } from '../components/datatable.js';
import { renderModal } from '../components/modal.js';

let products = [];

function formatPrice(cents) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cents);
}

export function render() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 style="font-size:1.25rem;font-weight:700;">Productos</h2>
      <button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button>
    </div>
    <div class="card" id="productsTable">
      <div style="text-align:center;padding:2rem;color:#94a3b8;">Cargando...</div>
    </div>
    ${renderModal({
      id: 'productModal',
      title: 'Nuevo producto',
      submitLabel: 'Guardar',
      content: `
        <div class="form-group"><label>Nombre</label><input name="name" class="form-input" required></div>
        <div class="form-group"><label>Slug</label><input name="slug" class="form-input" required></div>
        <div class="form-group"><label>Precio (centavos)</label><input name="price" type="number" class="form-input" required></div>
        <div class="form-group"><label>Estado</label>
          <select name="status" class="form-input">
            <option value="draft">Borrador</option>
            <option value="active" selected>Activo</option>
            <option value="archived">Archivado</option>
          </select>
        </div>
        <div class="form-group"><label>Stock</label><input name="stock" type="number" value="0" class="form-input"></div>
      `
    })}
  `;
}

export async function init() {
  document.getElementById('newProductBtn')?.addEventListener('click', () => {
    window.openModal('productModal');
  });

  document.getElementById('productModalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    data.price = parseInt(data.price, 10);
    data.stock = parseInt(data.stock, 10);

    const result = await api.post('/products', data);
    if (result.success) {
      window.closeModal('productModal');
      loadProducts();
    }
  });

  await loadProducts();
}

async function loadProducts() {
  const result = await api.get('/products?per_page=50');
  if (!result.success) return;

  products = result.data || [];

  const columns = [
    { label: 'Nombre', key: 'name' },
    { label: 'SKU', key: 'sku' },
    { label: 'Precio', render: (r) => formatPrice(r.price) },
    { label: 'Stock', key: 'stock' },
    { label: 'Estado', render: (r) => `<span style="text-transform:capitalize;">${r.status}</span>` },
  ];

  const actions = [
    { label: 'Editar', key: 'edit', class: 'btn-outline' },
  ];

  document.getElementById('productsTable').innerHTML = renderDataTable({ columns, rows: products, actions });
}
