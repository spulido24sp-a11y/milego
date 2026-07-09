import { $, createEl, on } from '../utils/dom.js';

const VIDEO_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1';

export function initVideoPopup() {
  const imageWrap = $('.hero-image-wrap');
  if (!imageWrap) return;

  const overlay = createEl('div', { className: 'video-popup-overlay' });
  const closeBtn = createEl('button', { className: 'video-popup-close', 'aria-label': 'Cerrar video', html: '<i class="fa-solid fa-xmark"></i>' });
  const container = createEl('div', { className: 'video-popup-container' });
  const iframe = createEl('iframe', {
    src: VIDEO_URL,
    allow: 'autoplay; encrypted-media; fullscreen',
    allowFullscreen: true,
    title: 'Video del producto',
    loading: 'lazy',
  });

  container.appendChild(iframe);
  overlay.append(closeBtn, container);
  document.body.appendChild(overlay);

  function open() {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    iframe.src = VIDEO_URL;
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    iframe.src = '';
  }

  on(imageWrap, 'click', open);
  on(closeBtn, 'click', close);
  on(overlay, 'click', (e) => { if (e.target === overlay) close(); });
  on(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
}
