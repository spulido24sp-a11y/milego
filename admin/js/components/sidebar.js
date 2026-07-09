export function renderSidebar() {
  const links = [
    { hash: '/dashboard', icon: '📊', label: 'Dashboard' },
    { hash: '/products', icon: '📦', label: 'Productos' },
    { hash: '/categories', icon: '📂', label: 'Categorías' },
    { hash: '/orders', icon: '🛒', label: 'Pedidos' },
    { hash: '/customers', icon: '👥', label: 'Clientes' },
    { hash: '/users', icon: '🔐', label: 'Usuarios' },
    { hash: '/settings', icon: '⚙️', label: 'Configuración' },
    { hash: '/audit', icon: '📋', label: 'Auditoría' },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">MI<span>leGo</span></div>
      <nav class="sidebar-nav">
        ${links.map(l => `<a href="#${l.hash}" data-nav="${l.hash}">${l.icon} ${l.label}</a>`).join('')}
      </nav>
      <div style="margin-top: auto; font-size: 0.75rem; color: #94a3b8;">
        v7.0.0
      </div>
    </aside>
  `;
}

export function highlightNav(hash) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === hash);
  });
}
