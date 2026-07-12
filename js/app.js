import { loadConfig } from './modules/config.js';
import { initLoader } from './modules/loader.js';
import { initNavigation } from './modules/navigation.js';
import { initScrollReveal } from './modules/scrollReveal.js';
import { initCounters } from './modules/counters.js';
import { initFaq } from './modules/faq.js';
import { initWhatsApp } from './modules/whatsapp.js';
import { initAnalytics, trackPageView, trackAddToCart, trackBeginCheckout, trackPurchase } from './modules/analytics.js';
import { loadLocations } from './modules/locations.js';
import { sendToWebhook } from './modules/webhook.js';
import { addOrder, markSynced, processQueue } from './modules/orderQueue.js';
import { initReviewsCarousel } from './modules/reviewsCarousel.js';
import { initVideoPopup } from './modules/videoPopup.js';
import { initCountdown } from './modules/countdown.js';
import { initStickyCta } from './modules/sticky-cta.js';
import { loadProducts, getActiveProducts, getComboPrice } from './modules/products.js';
import { $, on, createEl } from './utils/dom.js';
import { formatCurrency, getUrlParam } from './utils/format.js';
import { initGlobalHandlers, info } from './utils/logger.js';
import { initTheme } from './modules/theme.js';

let products = [];

async function init() {
  initGlobalHandlers();
  registerSW();
  info('App initialized');

  await loadConfig();

  try {
    products = await loadProducts();
    info('Products loaded', { count: products.length });
  } catch (err) {
    console.warn('Failed to load products:', err);
  }

  initLoader();
  initCatalog();
  initNavigation();
  initScrollReveal();
  initCounters();
  initCountdown();
  initFaq();
  initWhatsApp();
  initTheme();
  initAnalytics();
  loadLocations();
  initReviewsCarousel();
  initVideoPopup();
  initCheckoutForm();
  initGraciasPage();
  initStickyCta();
  processQueue(sendToWebhook);
  trackPageView(document.title);
  initPricingCtas();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      info('SW registered', { scope: reg.scope });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  }
}

function initCheckoutForm() {
  const form = $('#orderForm');
  if (!form) return;
}

function initGraciasPage() {
  const graciasContainer = $('#gracias-data');
  if (!graciasContainer) return;
}

function initPricingCtas() {
  document.querySelectorAll('.pricing-card a[href*="checkout.html"]').forEach(a => {
    const match = a.getAttribute('href').match(/combo=(\d)/);
    if (match) on(a, 'click', () => trackAddToCart(match[1]));
  });
}

function initCatalog() {
  const grid = $('#catalog-grid');
  if (!grid) return;

  const activeProducts = getActiveProducts();
  if (activeProducts.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);grid-column:1/-1;">No hay productos disponibles en este momento.</div>';
    return;
  }

  grid.innerHTML = activeProducts.map(p => {
    const priceKey = Object.keys(p.precios)[0] || 'x1';
    const price = p.precios[priceKey];
    const originalPrice = p.precios_originales?.[priceKey] || price * 1.5;
    const badge = p.destacado ? '<span class="product-badge">Destacado</span>' : '';

    return `
      <div class="product-card" data-reveal>
        <div class="product-image-container">
          ${badge}
          <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
        </div>
        <div class="product-info">
          <span style="font-size: 0.75rem; color: var(--brand-primary); font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">${p.categoria}</span>
          <h3 class="product-title">${p.nombre}</h3>
          <p class="product-desc">${p.descripcion}</p>
          <div class="product-price-row">
            <span class="product-price-current">${formatCurrency(price)}</span>
            <span class="product-price-old">${formatCurrency(originalPrice)}</span>
          </div>
          <a href="${p.landing}" class="btn btn-primary btn-block" style="margin-top: auto; justify-content: center;"><i class="fa-solid fa-eye"></i> Ver Oferta</a>
        </div>
      </div>
    `;
  }).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
