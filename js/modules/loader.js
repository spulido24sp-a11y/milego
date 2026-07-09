import { $ } from '../utils/dom.js';

export function initLoader() {
  const loader = $('#loader');
  if (!loader) return;

  const duration = 1800;

  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    loader.classList.add('is-hidden');
    document.body.style.overflow = '';
  }, duration);
}
