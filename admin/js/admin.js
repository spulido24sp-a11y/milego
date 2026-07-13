import { api } from './lib/api.js';
import { Router } from './lib/router.js';
import { renderSidebar, highlightNav } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

const router = new Router();
const app = document.getElementById('app');

function redirectToLogin() {
  app.innerHTML = `
    <div class="login-box">
      <div class="login-logo">MI<span>leGo</span></div>
      <form id="loginForm">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="loginEmail" required>
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="loginPassword" required>
        </div>
        <div class="login-error" id="loginError"></div>
        <button type="submit" class="login-btn">Iniciar sesión</button>
      </form>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    const result = await api.login(email, password);
    if (result.success) {
      router.navigate('/dashboard');
    } else {
      errorEl.textContent = result.error?.message || 'Error al iniciar sesión';
      errorEl.style.display = 'block';
    }
  });
}

function renderShell(title, content) {
  return `
    ${renderSidebar()}
    ${renderTopbar(title)}
    <main class="main-content">${content}</main>
  `;
}

function initShell() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await api.logout();
    router.navigate('/login');
  });

  const hash = window.location.hash.slice(1) || '/dashboard';
  highlightNav(hash);
}

const pageModules = {
  '/dashboard': () => import('./pages/dashboard.js?v=1.1.2'),
  '/product-radar': () => import('./pages/product-radar.js'),
  '/orders': () => import('./pages/orders.js'),
  '/launch': () => import('./pages/launch.js'),
  '/products': () => import('./pages/products.js'),
  '/storefront': () => import('./pages/storefront.js'),
  '/content': () => import('./pages/content.js'),
  '/analytics': () => import('./pages/analytics.js'),
  '/customers': () => import('./pages/customers.js'),
  '/settings': () => import('./pages/settings.js'),
  '/audit': () => import('./pages/audit.js'),
  '/review': () => import('./pages/review.js?v=1.1.2'),
  '/liam-observability': () => import('./pages/liam-observability.js'),
  '/liam-recommendations': () => import('./pages/liam-recommendations.js'),
};

function getTitle(hash) {
  const titles = {
    '/dashboard': 'Mission Control',
    '/product-radar': 'Product Radar',
    '/orders': 'Pedidos',
    '/launch': 'Launch Center',
    '/products': 'Products Intelligence',
    '/storefront': 'Storefront Config',
    '/content': 'Content Studio',
    '/analytics': 'Growth Analytics',
    '/customers': 'Customers',
    '/settings': 'Settings',
    '/audit': 'Audit Logs',
    '/review': 'Workspace de Revisión',
    '/liam-observability': 'LIAM Observability',
    '/liam-recommendations': 'LIAM Recommendations',
  };
  return titles[hash] || 'MIleGo OS';
}

import { LiamAssistant } from './components/liam-assistant.js';
const assistant = new LiamAssistant();

router.on('/login', () => {
  redirectToLogin();
});

for (const [hash, importer] of Object.entries(pageModules)) {
  router.on(hash, async () => {
    if (!api.isAuthenticated) { redirectToLogin(); return; }
    const page = await importer();
    app.innerHTML = renderShell(getTitle(hash), page.render());
    initShell();
    page.init?.();
    
    // Mount neural assistant overlay in every route
    assistant.mount();
  });
}

api.loadTokens();
if (api.isAuthenticated) {
  router.navigate('/dashboard');
} else {
  router.navigate('/login');
}
router.start();
window.__rt = redirectToLogin;
window.__api = api;
window.__router = router;
