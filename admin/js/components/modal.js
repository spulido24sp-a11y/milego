export function renderModal({ id, title, content, submitLabel = 'Guardar' }) {
  return `
    <div id="${id}" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;align-items:center;justify-content:center;" onclick="if(event.target===this)closeModal('${id}')">
      <div style="background:#fff;border-radius:12px;padding:1.5rem;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;">
        <h3 style="margin-bottom:1rem;font-weight:700;">${title}</h3>
        <form id="${id}Form">
          ${content}
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
            <button type="button" class="btn btn-outline" onclick="closeModal('${id}')">Cancelar</button>
            <button type="submit" class="btn btn-primary">${submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.closeModal = (id) => {
  document.getElementById(id).style.display = 'none';
};

window.openModal = (id) => {
  document.getElementById(id).style.display = 'flex';
};
