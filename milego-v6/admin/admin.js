document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  initSearch();
  initExportCSV();
  initClearDB();
  initWebhook();
  initDropiConfig();
  initStatusEdit();
});

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('milego_orders')) || [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem('milego_orders', JSON.stringify(orders));
}

function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderDashboard() {
  const orders = getOrders();
  const tbody = document.getElementById('ordersBody');
  const emptyState = document.getElementById('emptyState');

  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (o.comboPrice || 0), 0);
  const avgTicket = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  document.getElementById('stat-total').textContent = totalOrders;
  document.getElementById('stat-sales').innerHTML = `<span class="currency">$</span>${totalSales.toLocaleString('es-CO')}`;
  document.getElementById('stat-avg').innerHTML = `<span class="currency">$</span>${avgTicket.toLocaleString('es-CO')}`;

  if (totalOrders === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  tbody.innerHTML = orders.map(o => {
    const statusClassMap = {
      Pendiente: 'status-pending',
      Confirmado: 'status-confirmed',
      Despachado: 'status-shipped',
      Entregado: 'status-delivered',
      Cancelado: 'status-cancelled',
    };
    const cls = statusClassMap[o.status] || 'status-pending';

    const fecha = o.timestamp
      ? new Date(o.timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '-';

    return `<tr>
      <td><strong>#${o.orderId || '-'}</strong></td>
      <td>${fecha}</td>
      <td>${o.clientName || '-'}</td>
      <td>${o.clientPhone || '-'}</td>
      <td>${o.clientCity || o.clientState || '-'}</td>
      <td>${o.clientAddress || '-'}</td>
      <td>${o.comboName || '-'}</td>
      <td>${formatCOP(o.comboPrice || 0)}</td>
      <td>
        <select class="status-select ${cls}" data-order-id="${o.orderId}">
          <option value="Pendiente" ${o.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="Confirmado" ${o.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
          <option value="Despachado" ${o.status === 'Despachado' ? 'selected' : ''}>Despachado</option>
          <option value="Entregado" ${o.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
          <option value="Cancelado" ${o.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
      </td>
      <td>
        <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;" data-delete-id="${o.orderId}">Eliminar</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteId;
      if (confirm(`¿Eliminar el pedido #${id}?`)) {
        let orders = getOrders();
        orders = orders.filter(o => o.orderId != id);
        saveOrders(orders);
        renderDashboard();
        initStatusEdit();
      }
    });
  });

  initStatusEdit();
}

function initSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#ordersBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

function initExportCSV() {
  document.getElementById('btnExportCSV').addEventListener('click', () => {
    const orders = getOrders();
    if (orders.length === 0) {
      alert('No hay pedidos para exportar.');
      return;
    }

    const sku = localStorage.getItem('milego_dropi_sku') || '';

    const headers = [
      'ID Orden',
      'Fecha',
      'Nombre',
      'Celular',
      'Departamento',
      'Ciudad',
      'Dirección',
      'Combo',
      'Cantidad',
      'Valor',
      'SKU',
      'Notas',
    ];

    const rows = orders.map(o => [
      `#${o.orderId}`,
      o.timestamp ? new Date(o.timestamp).toISOString().split('T')[0] : '',
      o.clientName || '',
      o.clientPhone || '',
      o.clientState || '',
      o.clientCity || '',
      o.clientAddress || '',
      o.comboName || '',
      '1',
      o.comboPrice || '',
      sku,
      o.clientNotes || '',
    ]);

    const escapeCSV = val => {
      const s = String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(escapeCSV).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `milego_pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function initClearDB() {
  document.getElementById('btnClearDB').addEventListener('click', () => {
    if (confirm('¿Estás seguro de eliminar TODOS los pedidos? Esta acción no se puede deshacer.')) {
      if (confirm('Confirmación final: ¿Borrar toda la base de datos de pedidos?')) {
        localStorage.removeItem('milego_orders');
        renderDashboard();
        initStatusEdit();
      }
    }
  });
}

function initWebhook() {
  const urlInput = document.getElementById('webhookUrl');
  const tokenInput = document.getElementById('webhookToken');
  const msgDiv = document.getElementById('webhookMessage');

  const saved = localStorage.getItem('milego_webhook');
  if (saved) {
    try {
      const cfg = JSON.parse(saved);
      urlInput.value = cfg.url || '';
      tokenInput.value = cfg.token || '';
    } catch {}
  }

  document.getElementById('btnSaveWebhook').addEventListener('click', () => {
    const url = urlInput.value.trim();
    const token = tokenInput.value.trim();

    if (!url || !token) {
      msgDiv.className = 'message error';
      msgDiv.textContent = 'Completa la URL y el token del webhook.';
      return;
    }

    localStorage.setItem('milego_webhook', JSON.stringify({ url, token }));
    msgDiv.className = 'message success';
    msgDiv.textContent = 'Configuración de webhook guardada correctamente.';
    setTimeout(() => { msgDiv.className = 'message'; }, 3000);
  });

  document.getElementById('btnTestWebhook').addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const token = tokenInput.value.trim();

    if (!url || !token) {
      msgDiv.className = 'message error';
      msgDiv.textContent = 'Guarda la configuración antes de probar la conexión.';
      return;
    }

    msgDiv.className = 'message info';
    msgDiv.textContent = 'Probando conexión...';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ test: true, message: 'Prueba de conexión desde MIleGo Admin' }),
      });

      if (res.ok) {
        msgDiv.className = 'message success';
        msgDiv.textContent = `Conexión exitosa (código ${res.status}).`;
      } else {
        msgDiv.className = 'message error';
        msgDiv.textContent = `Error ${res.status}: ${res.statusText || 'Respuesta inesperada del servidor.'}`;
      }
    } catch (err) {
      msgDiv.className = 'message error';
      msgDiv.textContent = `Error de conexión: ${err.message}`;
    }

    setTimeout(() => { msgDiv.className = 'message'; }, 5000);
  });
}

function initDropiConfig() {
  const input = document.getElementById('dropiSku');
  const msgDiv = document.getElementById('dropiMessage');

  const saved = localStorage.getItem('milego_dropi_sku');
  if (saved) {
    input.value = saved;
  }

  document.getElementById('btnSaveDropi').addEventListener('click', () => {
    const sku = input.value.trim();
    if (!sku) {
      msgDiv.className = 'message error';
      msgDiv.textContent = 'Ingresa un SKU válido.';
      return;
    }

    localStorage.setItem('milego_dropi_sku', sku);
    msgDiv.className = 'message success';
    msgDiv.textContent = 'SKU guardado correctamente.';
    setTimeout(() => { msgDiv.className = 'message'; }, 3000);
  });
}

function initStatusEdit() {
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const orderId = sel.dataset.orderId;
      const newStatus = sel.value;
      let orders = getOrders();
      const order = orders.find(o => String(o.orderId) === String(orderId));
      if (order) {
        order.status = newStatus;
        saveOrders(orders);
        renderDashboard();
      }
    });
  });
}
