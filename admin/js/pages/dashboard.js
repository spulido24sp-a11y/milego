import { api } from '../lib/api.js';

export function render() {
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Productos</div>
        <div style="font-size: 2rem; font-weight: 900;" id="stat-products">-</div>
      </div>
      <div class="card">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Categorías</div>
        <div style="font-size: 2rem; font-weight: 900;" id="stat-categories">-</div>
      </div>
      <div class="card">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Usuarios</div>
        <div style="font-size: 2rem; font-weight: 900;" id="stat-users">-</div>
      </div>
    </div>
  `;
}

export async function init() {
  try {
    const [products, categories, users] = await Promise.all([
      api.get('/products?per_page=1'),
      api.get('/categories'),
      api.get('/users'),
    ]);

    document.getElementById('stat-products').textContent = products.meta?.total || 0;
    document.getElementById('stat-categories').textContent = categories.data?.length || 0;
    document.getElementById('stat-users').textContent = users.data?.length || 0;
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}
