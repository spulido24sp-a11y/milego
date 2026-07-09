import { loadProducts, getActiveProducts } from './products.js';

function cfg() { return window.__CONFIG__ || {}; }

function dl(...args) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(...args);
}

function gtag(...args) {
  if (typeof window.gtag === 'function') window.gtag(...args);
}

function fbq(...args) {
  if (typeof window.fbq === 'function') window.fbq(...args);
}

function ttq(...args) {
  if (typeof window.ttq === 'function') window.ttq(...args);
}

export async function initAnalytics() {
  dl({ event: 'page_view', page: { title: document.title, url: window.location.href } });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ga]');
    if (!btn) return;
    const ga = { event: btn.dataset.ga, category: btn.dataset.gaCategory || 'engagement', label: btn.dataset.gaLabel || '', value: btn.dataset.gaValue || 0 };
    dl(ga);
    gtag('event', ga.event, { event_category: ga.category, event_label: ga.label, value: ga.value });
  });
}

export function trackPageView(title) {
  gtag('event', 'page_view', { page_title: title, page_location: window.location.href, page_path: window.location.pathname });
}

async function getItem(comboId) {
  const products = await loadProducts();
  const p = products?.[0];
  if (!p) return null;
  const keys = Object.keys(p.precios);
  const key = keys[parseInt(comboId) - 1] || keys[0];
  return { item_id: p.sku, item_name: `${p.nombre} ${p.combos?.[parseInt(comboId) - 1]?.nombre || key}`, price: p.precios[key], quantity: 1 };
}

export async function trackViewItem(comboId) {
  const item = await getItem(comboId);
  if (!item) return;
  dl({ ecommerce: null });
  dl({ event: 'view_item', ecommerce: { items: [item], value: item.price, currency: 'COP' } });
  gtag('event', 'view_item', { currency: 'COP', value: item.price, items: [item] });
}

export async function trackAddToCart(comboId) {
  const item = await getItem(comboId);
  if (!item) return;
  dl({ ecommerce: null });
  dl({ event: 'add_to_cart', ecommerce: { items: [item], value: item.price, currency: 'COP' } });
  gtag('event', 'add_to_cart', { currency: 'COP', value: item.price, items: [item] });
  fbq('track', 'AddToCart', { content_ids: [item.item_id], content_name: item.item_name, value: item.price, currency: 'COP' });
  ttq('track', 'AddToCart', { content_id: item.item_id, content_type: 'product', value: item.price, currency: 'COP' });
}

export async function trackBeginCheckout(comboId) {
  const item = await getItem(comboId);
  if (!item) return;
  dl({ ecommerce: null });
  dl({ event: 'begin_checkout', ecommerce: { items: [item], value: item.price, currency: 'COP' } });
  gtag('event', 'begin_checkout', { currency: 'COP', value: item.price, items: [item] });
  fbq('track', 'InitiateCheckout', { content_ids: [item.item_id], content_name: item.item_name, value: item.price, currency: 'COP' });
  ttq('track', 'InitiateCheckout', { content_id: item.item_id, content_type: 'product', value: item.price, currency: 'COP' });
}

export async function trackPurchase(transactionId, comboId) {
  const item = await getItem(comboId);
  if (!item) return;
  dl({ ecommerce: null });
  dl({ event: 'purchase', ecommerce: { transaction_id: transactionId, items: [item], value: item.price, currency: 'COP' } });
  gtag('event', 'purchase', { transaction_id: transactionId, value: item.price, currency: 'COP', items: [item] });
  fbq('track', 'Purchase', { value: item.price, currency: 'COP', content_ids: [item.item_id], content_type: 'product' });
  ttq('track', 'Purchase', { value: item.price, currency: 'COP', content_id: item.item_id, content_type: 'product' });
}
