export function renderTopbar(title) {
  return `
    <header class="topbar">
      <div class="topbar-title">${title}</div>
      <div class="topbar-user">
        <button class="btn btn-outline btn-sm" id="logoutBtn">Cerrar sesión</button>
      </div>
    </header>
  `;
}
