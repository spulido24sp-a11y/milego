import { api } from '../lib/api.js';

const FULFILLMENT_LABELS = {
  pending: '🕐 Pendiente', confirmed: '✅ Confirmado', processing: '⚙️ En proceso',
  sent: '📦 Enviado a Dropi', in_transit: '🚚 En tránsito',
  delivered: '🎉 Entregado', failed: '❌ Falló', cancelled: '❌ Cancelado',
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  pending: '🕐 Nuevo', confirmed: '✅ Confirmado', preparing: '📦 En preparación',
  shipped: '🚚 Enviado', delivered: '🎉 Entregado', cancelled: '❌ Cancelado',
};
const STATUS_COLORS = {
  pending: 'var(--warning)', confirmed: 'var(--brand-light)', preparing: '#60a5fa',
  shipped: '#8b5cf6', delivered: 'var(--success)', cancelled: 'var(--danger)',
};

let ordersCache = [];
let selectedStatus = '';
let searchTerm = '';
let refreshTimer = null;

function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getNextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function canCancel(current) {
  return ['pending', 'confirmed'].includes(current);
}

export function render() {
  return `
    <div id="orders-root">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
        <h2 style="font-size:1.5rem;font-weight:800;margin:0;">📦 Pedidos</h2>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;" id="orders-filters">
          <button class="btn btn-sm ${selectedStatus === '' ? 'btn-primary' : 'btn-outline'}" data-filter="">Todos</button>
          ${STATUS_FLOW.map(s => `
            <button class="btn btn-sm ${selectedStatus === s ? 'btn-primary' : 'btn-outline'}" data-filter="${s}">
              ${STATUS_LABELS[s]}
              <span class="status-count" data-count-for="${s}" style="display:none;margin-left:4px;background:rgba(255,255,255,.15);padding:1px 6px;border-radius:10px;font-size:.7rem;"></span>
            </button>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
        <input type="text" id="orders-search" placeholder="Buscar por pedido o cliente..." style="flex:1;min-width:200px;padding:0.6rem 1rem;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:0.85rem;">
        <button class="btn btn-outline btn-sm" id="orders-refresh" style="font-size:0.8rem;">🔄 Refrescar</button>
      </div>
      <div id="orders-loading" style="text-align:center;padding:3rem;color:var(--text-secondary);">Cargando pedidos...</div>
      <div id="orders-table-wrap" style="display:none;"></div>
      <div id="order-detail-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);">
        <div style="max-width:720px;margin:2rem auto;background:var(--bg-card);border-radius:16px;padding:2rem;max-height:90vh;overflow-y:auto;position:relative;">
          <button id="modal-close" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--text-secondary);font-size:1.5rem;cursor:pointer;">✕</button>
          <div id="order-detail-content"></div>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  await loadOrders();

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStatus = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => {
        b.className = `btn btn-sm ${b.dataset.filter === selectedStatus ? 'btn-primary' : 'btn-outline'}`;
      });
      renderTable();
    });
  });

  document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('order-detail-modal').style.display = 'none';
  });

  document.getElementById('orders-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderTable();
  });

  document.getElementById('orders-refresh')?.addEventListener('click', async () => {
    await loadOrders();
  });

  startAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(loadOrders, 30000);
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
}

async function loadOrders() {
  try {
    const res = await api.get('/orders');
    if (res.success) ordersCache = res.data || [];
    else ordersCache = [];
  } catch {
    ordersCache = [];
  }
  document.getElementById('orders-loading').style.display = 'none';
  document.getElementById('orders-table-wrap').style.display = 'block';
  updateFilterCounts();
  renderTable();
}

function updateFilterCounts() {
  const counts = {};
  ordersCache.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  STATUS_FLOW.forEach(s => {
    const el = document.querySelector(`[data-count-for="${s}"]`);
    if (el) {
      const c = counts[s] || 0;
      el.textContent = c;
      el.style.display = c > 0 ? 'inline' : 'none';
    }
  });
}

function renderTable() {
  let filtered = selectedStatus
    ? ordersCache.filter(o => o.status === selectedStatus)
    : ordersCache;

  if (searchTerm) {
    filtered = filtered.filter(o =>
      o.order_number?.toLowerCase().includes(searchTerm) ||
      (o.customer_name || '').toLowerCase().includes(searchTerm) ||
      (o.customer_phone || '').includes(searchTerm)
    );
  }

  const wrap = document.getElementById('orders-table-wrap');

  if (filtered.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-secondary);">${
      ordersCache.length === 0 ? 'No hay pedidos aún. Cuando alguien compre desde una landing, aparecerán aquí.' : 'No hay pedidos con este filtro o búsqueda.'
    }</div>`;
    return;
  }

  wrap.innerHTML = `
    <div style="overflow-x:auto;border-radius:12px;border:1px solid var(--border);">
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead>
          <tr style="background:rgba(255,255,255,.02);border-bottom:1px solid var(--border);">
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Pedido</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Cliente</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Producto</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Total</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Estado</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:var(--text-secondary);">Fecha</th>
            <th style="padding:12px 16px;"></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(o => {
            const next = getNextStatus(o.status);
            return `
            <tr style="border-bottom:1px solid var(--border);transition:background .15s;${o.status === 'pending' ? 'background:rgba(251,191,36,0.03);' : ''}" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background='${o.status === 'pending' ? 'rgba(251,191,36,0.03)' : ''}'">
              <td style="padding:12px 16px;font-weight:700;color:#fff;white-space:nowrap;">${o.order_number}</td>
              <td style="padding:12px 16px;">
                <div style="font-weight:600;">${o.customer_name || '—'}</div>
                <div style="font-size:.75rem;color:var(--text-secondary);">${o.customer_phone || ''}</div>
              </td>
              <td style="padding:12px 16px;color:var(--text-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.items?.[0]?.product_name || '—'}</td>
              <td style="padding:12px 16px;font-weight:700;white-space:nowrap;">${formatCOP(o.total)}</td>
              <td style="padding:12px 16px;">
                <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;background:${STATUS_COLORS[o.status]}22;color:${STATUS_COLORS[o.status]};">${STATUS_LABELS[o.status] || o.status}</span>
              </td>
              <td style="padding:12px 16px;color:var(--text-secondary);font-size:.8rem;white-space:nowrap;" title="${new Date(o.created_at).toLocaleString()}">${timeAgo(o.created_at)}</td>
              <td style="padding:12px 16px;display:flex;gap:6px;flex-wrap:nowrap;">
                ${o.status === 'pending' && next ? `
                  <button class="btn btn-sm" style="font-size:.7rem;padding:4px 10px;background:var(--success);color:#fff;border:none;border-radius:8px;cursor:pointer;white-space:nowrap;" data-quick-confirm="${o.id}">✅ Confirmar</button>
                ` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:4px 10px;" data-view-order="${o.id}">Ver</button>
                ${o.customer_phone ? `
                  <a href="https://wa.me/57${o.customer_phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Hola! Te confirmamos tu pedido ' + o.order_number + ' en MIleGo 🚀')}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:4px 10px;text-decoration:none;" title="WhatsApp">💬</a>
                ` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="text-align:right;padding:0.75rem 0;font-size:0.8rem;color:var(--text-secondary);">
      ${filtered.length} ${filtered.length === 1 ? 'pedido' : 'pedidos'}
    </div>
  `;

  document.querySelectorAll('[data-view-order]').forEach(btn => {
    btn.addEventListener('click', () => showOrderDetail(parseInt(btn.dataset.viewOrder)));
  });

  document.querySelectorAll('[data-quick-confirm]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.quickConfirm);
      await updateStatus(id, 'confirmed');
    });
  });
}

async function showOrderDetail(id) {
  const modal = document.getElementById('order-detail-modal');
  const content = document.getElementById('order-detail-content');
  content.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando detalle...</div>';
  modal.style.display = 'block';

  try {
    const res = await api.get(`/orders/${id}`);
    if (!res.success || !res.data) {
      content.innerHTML = '<div style="color:var(--danger);">Error al cargar pedido</div>';
      return;
    }
    const o = res.data;
    const nextStatus = getNextStatus(o.status);
    const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <div>
          <h3 style="font-size:1.3rem;font-weight:800;margin:0;">Pedido ${o.order_number}</h3>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">${formatDate(o.created_at)}</div>
        </div>
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:.85rem;font-weight:600;background:${STATUS_COLORS[o.status]}22;color:${STATUS_COLORS[o.status]};">${STATUS_LABELS[o.status] || o.status}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <div class="card" style="padding:1rem;border-radius:10px;">
          <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">🧑 Cliente</h4>
          <p style="font-weight:600;margin-bottom:4px;">${o.customer_name || '—'}</p>
          <p style="font-size:.8rem;color:var(--text-secondary);">${o.customer_phone || ''}</p>
          <p style="font-size:.8rem;color:var(--text-secondary);">${o.customer_email || ''}</p>
          ${cleanPhone ? `
            <a href="https://wa.me/57${cleanPhone}?text=${encodeURIComponent('Hola! Te escribimos de MIleGo sobre tu pedido ' + o.order_number)}" target="_blank" rel="noopener" class="btn btn-sm" style="margin-top:8px;font-size:.75rem;background:#25d366;color:#fff;padding:6px 14px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
            <button class="btn btn-sm" style="margin-top:8px;font-size:.75rem;background:var(--brand);color:#fff;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;" data-test-whatsapp="${o.id}">🧪 Probar WhatsApp</button>
          ` : ''}
        </div>
        <div class="card" style="padding:1rem;border-radius:10px;">
          <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">📍 Dirección de envío</h4>
          <p style="font-size:.85rem;">${o.shipping_street || ''}</p>
          <p style="font-size:.8rem;color:var(--text-secondary);">${o.shipping_city || ''}, ${o.shipping_state || ''}</p>
        </div>
      </div>

      <div class="card" style="padding:1rem;border-radius:10px;margin-bottom:1.5rem;">
        <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:10px;">🛒 Productos</h4>
        ${(o.items || []).map(item => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:.85rem;">
            <div>
              <div style="font-weight:600;">${item.product_name}</div>
              <div style="font-size:.75rem;color:var(--text-secondary);">x${item.quantity} · ${formatCOP(item.unit_price)} c/u</div>
            </div>
            <div style="font-weight:700;">${formatCOP(item.total_price)}</div>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;font-size:1rem;">
          <span style="font-weight:700;">Total</span>
          <span style="font-weight:800;color:var(--success);">${formatCOP(o.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;font-size:0.8rem;">
          <span style="color:var(--text-secondary);">Método de pago</span>
          <span>${o.payment_method === 'cash_on_delivery' ? 'Contra entrega' : o.payment_method}</span>
        </div>
      </div>

      ${o.dropi_order_id ? `
      <div class="card" style="padding:1rem;border-radius:10px;margin-bottom:1.5rem;">
        <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:10px;">📦 Fulfillment Dropi</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.85rem;">
          <div><span style="color:var(--text-secondary);">ID Dropi:</span> ${o.dropi_order_id}</div>
          <div><span style="color:var(--text-secondary);">Estado:</span> ${FULFILLMENT_LABELS[o.fulfillment_status] || o.fulfillment_status}</div>
          ${o.tracking_number ? `<div><span style="color:var(--text-secondary);">Guía:</span> <strong>${o.tracking_number}</strong></div>` : ''}
          ${o.carrier ? `<div><span style="color:var(--text-secondary);">Transportadora:</span> ${o.carrier}</div>` : ''}
          ${o.fulfilled_at ? `<div><span style="color:var(--text-secondary);">Enviado:</span> ${formatDate(o.fulfilled_at)}</div>` : ''}
        </div>
        <div style="margin-top:10px;">
          <button class="btn btn-outline btn-sm" id="btn-sync-fulfillment" data-order-id="${o.id}">🔄 Sincronizar estado</button>
        </div>
      </div>
      ` : (o.status === 'confirmed' || o.status === 'pending') ? `
      <div class="card" style="padding:1rem;border-radius:10px;margin-bottom:1.5rem;text-align:center;">
        <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:10px;">📦 Fulfillment</h4>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">Enviar este pedido a Dropi para generar guía de envío.</p>
        <button class="btn btn-primary" id="btn-send-to-dropi" data-order-id="${o.id}">📦 Enviar a Dropi</button>
      </div>
      ` : ''}

      <div class="card" style="padding:1rem;border-radius:10px;margin-bottom:1.5rem;">
        <h4 style="font-size:.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:10px;">📜 Historial de estados</h4>
        ${(o.history || []).map(h => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:.8rem;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${STATUS_COLORS[h.status] || 'var(--text-secondary)'};flex-shrink:0;"></span>
            <span style="font-weight:500;min-width:100px;">${STATUS_LABELS[h.status] || h.status}</span>
            <span style="color:var(--text-secondary);">${formatDate(h.created_at)}</span>
            ${h.notes ? `<span style="color:var(--text-secondary);">· ${h.notes}</span>` : ''}
          </div>
        `).join('')}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${nextStatus ? `
          <button class="btn btn-primary" id="btn-next-status" data-order-id="${o.id}" data-next="${nextStatus}">
            Avanzar a ${STATUS_LABELS[nextStatus]}
          </button>
        ` : ''}
        ${canCancel(o.status) ? `
          <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);" id="btn-cancel-order" data-order-id="${o.id}">
            Cancelar pedido
          </button>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-next-status')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await updateStatus(parseInt(btn.dataset.orderId), btn.dataset.next);
    });

    document.getElementById('btn-cancel-order')?.addEventListener('click', async (e) => {
      if (!confirm('¿Cancelar este pedido?')) return;
      await updateStatus(parseInt(e.currentTarget.dataset.orderId), 'cancelled');
    });

    document.getElementById('btn-send-to-dropi')?.addEventListener('click', async (e) => {
      await sendToDropi(parseInt(e.currentTarget.dataset.orderId));
    });

    document.getElementById('btn-sync-fulfillment')?.addEventListener('click', async (e) => {
      await syncFulfillment(parseInt(e.currentTarget.dataset.orderId));
    });

    document.querySelector('[data-test-whatsapp]')?.addEventListener('click', async (e) => {
      const phone = prompt('Número WhatsApp (ej: 573209898615):', '573209898615');
      if (!phone) return;
      const msg = prompt('Mensaje de prueba:', '🧪 Mensaje de prueba desde MIleGo Admin');
      if (!msg) return;
      try {
        const res = await api.post('/admin/whatsapp/test', { phone, message: msg });
        if (res.success) {
          alert('✅ Mensaje de prueba enviado a ' + phone);
        } else {
          alert('❌ Error: ' + (res.error?.message || ''));
        }
      } catch {
        alert('❌ Error de conexión');
      }
    });

  } catch (err) {
    content.innerHTML = `<div style="color:var(--danger);">Error: ${err.message}</div>`;
  }
}

async function updateStatus(id, status) {
  try {
    const res = await api.put(`/orders/${id}/status`, { status, notes: `Estado actualizado a ${STATUS_LABELS[status]}` });
    if (res.success) {
      document.getElementById('order-detail-modal').style.display = 'none';
      await loadOrders();
    } else {
      alert('Error: ' + (res.error?.message || 'No se pudo actualizar'));
    }
  } catch {
    alert('Error de conexión');
  }
}

async function sendToDropi(id) {
  try {
    const res = await api.post(`/orders/${id}/fulfillment/send`, {});
    if (res.success) {
      alert('✅ Pedido enviado a Dropi con éxito');
      document.getElementById('order-detail-modal').style.display = 'none';
      await loadOrders();
    } else {
      alert('Error: ' + (res.error?.message || 'No se pudo enviar a Dropi'));
    }
  } catch {
    alert('Error de conexión al enviar a Dropi');
  }
}

async function syncFulfillment(id) {
  try {
    const res = await api.post(`/orders/${id}/fulfillment/sync`, {});
    if (res.success) {
      alert('✅ Estado de fulfillment sincronizado');
      document.getElementById('order-detail-modal').style.display = 'none';
      await loadOrders();
    } else {
      alert('Error: ' + (res.error?.message || 'No se pudo sincronizar'));
    }
  } catch {
    alert('Error de conexión al sincronizar');
  }
}
