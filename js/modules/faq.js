import { $, delegate } from '../utils/dom.js';

export function initFaq() {
  const container = $('.faq-container');
  if (!container) return;

  delegate(container, '.faq-trigger', 'click', (e, trigger) => {
    const item = trigger.closest('.faq-item');
    if (!item) return;

    const isActive = item.classList.contains('is-active');

    container.querySelectorAll('.faq-item.is-active').forEach((el) => {
      el.classList.remove('is-active');
    });

    if (!isActive) {
      item.classList.add('is-active');
    }
  });
}
