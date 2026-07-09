import { $, on, delegate } from '../utils/dom.js';

export function initNavigation() {
  const header = $('.header');
  const toggle = $('.header-mobile-toggle');
  const nav = $('.header-nav');

  if (!header) return;

  on(window, 'scroll', () => {
    header.classList.toggle('header-scrolled', window.scrollY > 20);
  });

  if (toggle && nav) {
    on(toggle, 'click', () => {
      nav.classList.toggle('is-open');
    });

    delegate(nav, 'a', 'click', () => {
      nav.classList.remove('is-open');
    });
  }
}
