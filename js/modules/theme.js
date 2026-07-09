const STORAGE_KEY = 'milego_theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const theme = mode === 'auto' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.setAttribute('data-theme-mode', theme);
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(saved);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const icons = { light: 'fa-sun', dark: 'fa-moon', auto: 'fa-circle-half-stroke' };
    toggle.innerHTML = `<i class="fa-solid ${icons[saved] || icons.light}"></i>`;
    toggle.addEventListener('click', () => {
      const modes = ['light', 'dark', 'auto'];
      const current = localStorage.getItem(STORAGE_KEY) || 'light';
      const next = modes[(modes.indexOf(current) + 1) % modes.length];
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      toggle.innerHTML = `<i class="fa-solid ${icons[next]}"></i>`;
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem(STORAGE_KEY) === 'auto') applyTheme('auto');
  });
}
