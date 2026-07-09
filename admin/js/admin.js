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
  '/dashboard': () => import('./pages/dashboard.js'),
  '/products': () => import('./pages/products.js'),
  '/categories': () => import('./pages/categories.js'),
  '/users': () => import('./pages/users.js'),
  '/settings': () => import('./pages/settings.js'),
  '/audit': () => import('./pages/audit.js'),
};

function getTitle(hash) {
  const titles = {
    '/dashboard': 'Dashboard',
    '/products': 'Productos',
    '/categories': 'Categorías',
    '/orders': 'Pedidos',
    '/customers': 'Clientes',
    '/users': 'Usuarios',
    '/settings': 'Configuración',
    '/audit': 'Auditoría',
  };
  return titles[hash] || 'MIleGo Admin';
}

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
  });
}

const placeholders = {
  '/orders': 'Pedidos',
  '/customers': 'Clientes',
};

for (const [hash, title] of Object.entries(placeholders)) {
  router.on(hash, () => {
    if (!api.isAuthenticated) { redirectToLogin(); return; }
    app.innerHTML = renderShell(title, `<div class="card"><p>Módulo en construcción</p></div>`);
    initShell();
  });
}

api.loadTokens();
if (api.isAuthenticated) {
  router.navigate('/dashboard');
} else {
  redirectToLogin();
}

router.start();
