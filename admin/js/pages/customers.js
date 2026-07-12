import { api } from '../lib/api.js';

let customers = [];

export function render() {
  return `
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
        <span>👥</span> Customers
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        CRM Inteligente. Monitorea los perfiles de compradores, notas de soporte y valor de vida del cliente (LTV).
      </p>
    </div>

    <!-- Customers List -->
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Identificación</th>
              <th>Notas de Soporte</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody id="customers-body">
            <tr>
              <td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-secondary);">Cargando clientes...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notes Modal -->
    <div class="modal" id="notesModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Notas de Soporte del Cliente</h3>
          <span class="modal-close" onclick="document.getElementById('notesModal').style.display='none'">&times;</span>
        </div>
        
        <div id="notesList" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.5rem; font-size: 0.85rem;">
          <!-- Loaded dynamically -->
        </div>

        <form id="noteForm">
          <div class="form-group">
            <label>Nueva Nota</label>
            <input type="text" id="newNoteText" class="form-input" placeholder="Ej: Confirmó dirección de entrega por WhatsApp..." required>
          </div>
          <div class="modal-footer" style="margin-top: 1rem; padding: 0;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('notesModal').style.display='none'">Cerrar</button>
            <button type="submit" class="btn btn-primary btn-sm">💾 Guardar Nota</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function init() {
  await loadCustomers();
}

async function loadCustomers() {
  try {
    const result = await api.get('/admin/customers');
    if (!result.success) {
      document.getElementById('customers-body').innerHTML = `
        <tr><td colspan="5" style="text-align:center;color:var(--danger);">Error cargando clientes.</td></tr>
      `;
      return;
    }

    customers = result.data || [];

    if (customers.length === 0) {
      document.getElementById('customers-body').innerHTML = `
        <tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">No hay clientes registrados en este OS.</td></tr>
      `;
      return;
    }

    const html = customers.map(c => {
      const doc = c.document_number ? `${c.document_type || 'CC'}: ${c.document_number}` : 'No registrado';
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text);">${c.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">ID: ${c.id}</div>
          </td>
          <td>
            <div style="font-size: 0.85rem;">${c.email || 'Sin Email'}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">Tel: ${c.phone || 'Sin Teléfono'}</div>
          </td>
          <td style="font-size: 0.85rem;">${doc}</td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-secondary);" id="notes-count-${c.id}">Cargando notas...</span>
          </td>
          <td style="text-align:right;">
            <button class="btn btn-outline btn-sm" onclick="window.openNotesModal(${c.id})">
              📝 Ver Notas
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('customers-body').innerHTML = html;

    // Load notes counts asynchronously
    for (const c of customers) {
      const notes = await api.get(`/admin/customers/${c.id}/notes`);
      const count = notes.data?.length || 0;
      document.getElementById(`notes-count-${c.id}`).textContent = `${count} nota(s) registrada(s)`;
    }

  } catch (err) {
    console.error('Failed to load customers:', err);
  }
}

// Global hooks for notes interaction
let activeCustomerId = null;

window.openNotesModal = async function(customerId) {
  activeCustomerId = customerId;
  const modal = document.getElementById('notesModal');
  const list = document.getElementById('notesList');
  list.innerHTML = '<div style="color: var(--text-secondary);">Cargando notas...</div>';
  modal.style.display = 'flex';

  try {
    const res = await api.get(`/admin/customers/${customerId}/notes`);
    const data = res.data || [];

    if (data.length === 0) {
      list.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">No hay notas registradas para este cliente.</div>';
    } else {
      list.innerHTML = data.map(n => `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
          <div style="color: var(--text);">${n.note}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">
            Registrado por: ${n.created_by_name || 'Staff'} el ${new Date(n.created_at).toLocaleString('es-CO')}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div style="color: var(--danger);">Error cargando notas.</div>';
  }
};

document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const textInput = document.getElementById('newNoteText');
  const note = textInput.value.trim();
  if (!note || !activeCustomerId) return;

  try {
    const res = await api.post(`/admin/customers/${activeCustomerId}/notes`, { note });
    if (res.id) {
      textInput.value = '';
      await window.openNotesModal(activeCustomerId);
      // Reload parent lists count
      const notes = await api.get(`/admin/customers/${activeCustomerId}/notes`);
      document.getElementById(`notes-count-${activeCustomerId}`).textContent = `${notes.data?.length || 0} nota(s) registrada(s)`;
    }
  } catch (err) {
    console.error(err);
    alert('Error al guardar la nota');
  }
});
