export function renderSidebar() {
  const links = [
    { hash: '/dashboard', icon: '🛰️', label: 'Mission Control' },
    { hash: '/product-radar', icon: '📡', label: 'Product Radar' },
    { hash: '/orders', icon: '📦', label: 'Pedidos' },
    { hash: '/launch', icon: '🚀', label: 'Launch Center' },
    { hash: '/products', icon: '🧠', label: 'Products Intelligence' },
    { hash: '/storefront', icon: '🏠', label: 'Storefront Config' },
    { hash: '/content', icon: '🎨', label: 'Content Studio' },
    { hash: '/analytics', icon: '📈', label: 'Growth Analytics' },
    { hash: '/customers', icon: '👥', label: 'Customers' },
    { hash: '/settings', icon: '⚙️', label: 'Settings' },
    { hash: '/audit', icon: '📋', label: 'Audit Logs' },
    { hash: '/liam-observability', icon: '🔍', label: 'LIAM Observability' },
    { hash: '/liam-recommendations', icon: '🎯', label: 'LIAM Recommendations' },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">MI<span>leGo OS</span></div>
      <nav class="sidebar-nav">
        ${links.map(l => `<a href="#${l.hash}" data-nav="${l.hash}">${l.icon} ${l.label}</a>`).join('')}
      </nav>
      
      <div class="sidebar-liam-status">
        <div class="liam-dot"></div>
        <div>
          <div class="liam-status-text">LIAM Active</div>
          <div class="liam-status-desc">Monitoring business...</div>
        </div>
      </div>
    </aside>
  `;
}

export function highlightNav(hash) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === hash);
  });
}
