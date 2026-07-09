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

  try {
    products = await loadProducts();
    info('Products loaded', { count: products.length });
  } catch (err) {
    console.warn('Failed to load products:', err);
  }

  initLoader();
  initNavigation();
  initScrollReveal();
  initCounters();
  initFaq();
  initWhatsApp();
  initTheme();
  initAnalytics();
  loadLocations();
  initReviewsCarousel();
  initVideoPopup();
  initCheckoutForm();
  initGraciasPage();
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

function getPriceData(comboId) {
  const p = products?.[0];
  if (!p) return { price: 0 };
  const keys = Object.keys(p.precios);
  const key = keys[parseInt(comboId) - 1] || keys[0];
  return { price: p.precios[key], original: p.precios_originales?.[key] || 0, key };
}

function getComboLabel(comboId) {
  const p = products?.[0];
  if (!p?.combos) return { nombre: 'OrganiMax', unidades: 0 };
  const c = p.combos[parseInt(comboId) - 1];
  return c || { nombre: 'OrganiMax', unidades: 0 };
}

function initCheckoutForm() {
  const form = $('#orderForm');
  if (!form) return;

  trackBeginCheckout($('#combo')?.value || '2');

  const combo = $('#combo');
  const totalPrice = $('#totalPrice');

  function updatePrice() {
    if (!combo || !totalPrice) return;
    const comboId = combo.value || '2';
    const pd = getPriceData(comboId);
    totalPrice.value = pd.price;
    const display = document.getElementById('priceDisplay');
    if (display) display.textContent = pd.price ? formatCurrency(pd.price) : '';
  }

  if (combo) {
    on(combo, 'change', updatePrice);
    updatePrice();
  }

  on(form, 'submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

    const txnId = `MG-${Date.now()}`;
    const pd = getPriceData(form.combo?.value);
    const cl = getComboLabel(form.combo?.value);

    const data = {
      orderId: txnId,
      sku: products?.[0]?.sku || '',
      nombre: form.nombre?.value?.trim(),
      email: form.email?.value?.trim(),
      telefono: form.telefono?.value?.trim(),
      departamento: form.departamento?.value,
      ciudad: form.ciudad?.value,
      direccion: form.direccion?.value?.trim(),
      combo: form.combo?.value,
      comboName: cl.nombre,
      comboPrice: pd.price,
      total: pd.price,
      producto: products?.[0]?.nombre || 'OrganiMax',
      fecha: new Date().toISOString(),
      fuente: getUrlParam('utm_source') || getUrlParam('ref') || 'directo',
    };

    addOrder(data);
    info('Order saved to localStorage', { txnId, combo: data.combo });

    try {
      await sendToWebhook(data);
      markSynced(txnId);
      info('Webhook sent successfully', { txnId });
      trackPurchase(txnId, data.combo);

      const params = new URLSearchParams({
        nombre: data.nombre, email: data.email,
        combo: data.combo, total: pd.price, txn: txnId,
      });
      window.location.href = `/gracias.html?${params}`;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Intentar de nuevo'; }
    }
  });
}

function initGraciasPage() {
  const graciasContainer = $('#gracias-data');
  if (!graciasContainer) return;

  const nombre = getUrlParam('nombre') || 'Cliente';
  const combo = getUrlParam('combo');
  const total = getUrlParam('total');
  const txn = getUrlParam('txn');

  const cl = getComboLabel(combo);
  const comboLabel = cl.nombre || 'OrganiMax';

  if (combo) trackPurchase(txn || '', combo);

  const safeNombre = document.createTextNode(decodeURIComponent(nombre));
  graciasContainer.innerHTML = '';
  graciasContainer.append(
    createEl('p', {}, [
      createEl('strong', {}, [safeNombre]),
      document.createTextNode(', ¡tu pedido ha sido confirmado!'),
    ]),
    createEl('p', {}, [document.createTextNode(`Combo: ${comboLabel}`)]),
    createEl('p', {}, [document.createTextNode(`Total: ${total ? formatCurrency(parseInt(total)) : ''}`)]),
    createEl('p', {}, [document.createTextNode(`Transacción: ${txn || 'N/A'}`)]),
    createEl('p', { className: 'text-sm text-muted', style: 'margin-top:1rem;' }, [document.createTextNode('Recibirás la confirmación en tu correo electrónico.')]),
  );
}

function initPricingCtas() {
  document.querySelectorAll('.pricing-card a[href*="checkout.html"]').forEach(a => {
    const match = a.getAttribute('href').match(/combo=(\d)/);
    if (match) on(a, 'click', () => trackAddToCart(match[1]));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
