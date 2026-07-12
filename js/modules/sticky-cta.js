import { $ } from '../utils/dom.js';
import { formatCurrency } from '../utils/format.js';

function cfg() { return window.__CONFIG__ || {}; }

export function initStickyCta() {
  const bar = document.getElementById('sticky-cta');
  if (!bar) return;

  const hero = document.querySelector('.hero');
  if (!hero) return;

  let heroBottom = hero.offsetTop + hero.offsetHeight;

  function onScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const show = scrollY > heroBottom - 100;
    bar.classList.toggle('is-visible', show);
  }

  const updatePrice = () => {
    const priceEl = bar.querySelector('.sticky-cta-price');
    const combo = document.getElementById('combo');
    if (!priceEl || !combo) return;

    const prices = [79900, 129900, 179900];
    const idx = parseInt(combo.value) - 1;
    const price = prices[idx] || 79900;
    priceEl.textContent = formatCurrency(price);
  };

  const whatsappBtn = bar.querySelector('.sticky-cta-wa');
  if (whatsappBtn) {
    const number = cfg().WHATSAPP?.NUMBER || '573209898615';
    whatsappBtn.href = `https://wa.me/${number}?text=${encodeURIComponent('¡Hola! Quiero información')}`;
  }

  const combo = document.getElementById('combo');
  if (combo) {
    combo.addEventListener('change', updatePrice);
  }

  updatePrice();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  onScroll();
}
