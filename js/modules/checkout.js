import { $, on, createEl } from '../utils/dom.js';
import { formatCurrency, getUrlParam } from '../utils/format.js';
import { trackBeginCheckout, trackAddToCart, trackPurchase } from './analytics.js';

let product = null;
let selectedVariant = null;

export async function initCheckoutPage() {
  const container = $('#checkout-app');
  if (!container) return;

  try {
    const res = await fetch('/api/v1/products/organimax/public');
    const json = await res.json();
    if (!json.success) throw new Error('Product not found');
    product = json.data;
    selectedVariant = product.variants?.[1] || product.variants?.[0];
    renderCheckout(container);
  } catch (err) {
    container.innerHTML = `<div class="checkout-error"><p>Error cargando producto. <a href="/">Volver</a></p></div>`;
  }
}

function renderCheckout(container) {
  container.innerHTML = `
    <div class="checkout-layout">
      <div class="checkout-main">
        <div class="checkout-hero">
          <div class="checkout-hero-badges">
            <span><i class="fa-solid fa-hand-holding-dollar"></i> Pago Contra Entrega</span>
            <span><i class="fa-solid fa-truck"></i> Envío GRATIS</span>
            <span><i class="fa-solid fa-shield-halved"></i> Garantía 30 días</span>
            <span><i class="fa-solid fa-star"></i> 4.900+ clientes</span>
          </div>
          <h1 class="checkout-hero-title">Completa tu pedido</h1>
          <p class="checkout-hero-sub">Tu pedido está asegurado. Pagas solo cuando recibes.</p>
        </div>

        <div class="checkout-stock" id="stock-bar">
          <div class="checkout-stock-dot"></div>
          <span>Quedan <strong id="stock-count">23</strong> unidades</span>
          <span class="checkout-stock-updated">● Actualizado hace unos segundos</span>
        </div>

        <div class="checkout-urgency" id="checkout-countdown">
          <i class="fa-solid fa-bolt"></i> La promoción termina en <strong id="checkout-timer">--:--:--</strong>
        </div>

        <div class="checkout-trust-badges">
          <div class="trust-badge"><i class="fa-solid fa-lock"></i> Pago Seguro</div>
          <div class="trust-badge"><i class="fa-solid fa-hand-holding-dollar"></i> Contra Entrega</div>
          <div class="trust-badge"><i class="fa-solid fa-shield-halved"></i> Garantía</div>
          <div class="trust-badge"><i class="fa-solid fa-truck"></i> Envío Gratis</div>
        </div>

        <form id="checkout-form" class="checkout-form">
          <div class="form-section">
            <h3 class="form-section-title">Datos personales</h3>
            <div class="form-group">
              <label class="form-label" for="cf-name">Nombre completo *</label>
              <input type="text" id="cf-name" class="form-input" placeholder="Ej: María García" autocomplete="name" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cf-phone">Celular *</label>
                <input type="tel" id="cf-phone" class="form-input" placeholder="300 123 4567" autocomplete="tel" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="cf-email">Correo (opcional)</label>
                <input type="email" id="cf-email" class="form-input" placeholder="maria@ejemplo.com" autocomplete="email">
              </div>
            </div>
            <div class="form-checkbox">
              <input type="checkbox" id="cf-whatsapp" checked>
              <label for="cf-whatsapp">Quiero recibir confirmación por WhatsApp</label>
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Dirección de envío</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cf-department">Departamento *</label>
                <select id="cf-department" class="form-select" required><option value="">Selecciona...</option></select>
              </div>
              <div class="form-group">
                <label class="form-label" for="cf-city">Ciudad *</label>
                <select id="cf-city" class="form-select" required disabled><option value="">Primero selecciona departamento</option></select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="cf-neighborhood">Barrio</label>
              <input type="text" id="cf-neighborhood" class="form-input" placeholder="Ej: El Poblado">
            </div>
            <div class="form-group">
              <label class="form-label" for="cf-address">Dirección *</label>
              <input type="text" id="cf-address" class="form-input" placeholder="Cra 1 # 2-3" autocomplete="street-address" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="cf-reference">Referencia (opcional)</label>
              <input type="text" id="cf-reference" class="form-input" placeholder="Casa blanca, portal 3, segundo piso">
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Selecciona tu pack</h3>
            <div class="variant-selector" id="variant-selector"></div>
            <div id="variant-error" class="form-error" style="display:none;"></div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Método de pago</h3>
            <div class="payment-methods">
              <label class="payment-option" id="pm-cod">
                <input type="radio" name="payment_method" value="cash_on_delivery" checked>
                <div class="payment-option-content">
                  <div class="payment-option-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
                  <div>
                    <div class="payment-option-title">Pago contra entrega</div>
                    <div class="payment-option-desc">Pagas en efectivo cuando recibes tu pedido</div>
                  </div>
                </div>
              </label>
              <label class="payment-option" id="pm-card">
                <input type="radio" name="payment_method" value="credit_card">
                <div class="payment-option-content">
                  <div class="payment-option-icon"><i class="fa-solid fa-credit-card"></i></div>
                  <div>
                    <div class="payment-option-title">Tarjeta débito/crédito</div>
                    <div class="payment-option-desc">Paga con Visa, Mastercard, AMEX vía Wompi</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block checkout-submit" id="checkout-submit">
            <i class="fa-solid fa-cart-shopping"></i> CONFIRMAR MI PEDIDO
          </button>
          <p class="text-xs text-muted text-center mt-3" id="payment-disclaimer"><i class="fa-solid fa-lock"></i> Compra 100% segura. Pagas solo cuando recibes.</p>
        </form>
      </div>

      <div class="checkout-sidebar">
        <div class="checkout-summary-card" id="order-summary">
          <h3 class="summary-title">Resumen de compra</h3>
          <div class="summary-product">
            <img src="/assets/img/hero.webp" alt="OrganiMax" class="summary-product-img" id="summary-img">
            <div>
              <div class="summary-product-name" id="summary-name">OrganiMax</div>
              <div class="summary-product-variant" id="summary-variant">Pack x12</div>
            </div>
          </div>
          <div class="summary-rows">
            <div class="summary-row">
              <span>Precio anterior</span>
              <span class="summary-old-price" id="summary-old">$199.900</span>
            </div>
            <div class="summary-row">
              <span>Hoy</span>
              <span class="summary-current-price" id="summary-current">$129.900</span>
            </div>
            <div class="summary-row">
              <span>Envío</span>
              <span class="summary-free">GRATIS</span>
            </div>
            <div class="summary-row summary-divider"></div>
            <div class="summary-row summary-total">
              <span>TOTAL</span>
              <span class="summary-total-price" id="summary-total">$129.900</span>
            </div>
          </div>
        </div>
        <div class="checkout-summary-badges">
          <div class="summary-badge"><i class="fa-solid fa-truck-fast"></i> Envío a toda Colombia</div>
          <div class="summary-badge"><i class="fa-solid fa-rotate-left"></i> 30 días de garantía</div>
          <div class="summary-badge"><i class="fa-solid fa-headset"></i> Soporte 24/7</div>
        </div>
      </div>
    </div>

    <div class="checkout-progress-overlay" id="progress-overlay" style="display:none;">
      <div class="checkout-progress-modal">
        <div class="progress-icon" id="progress-icon">🛒</div>
        <h3>Procesando tu pedido</h3>
        <div class="progress-steps">
          <div class="progress-step" data-step="1"><span class="step-status">⏳</span> Reservando producto...</div>
          <div class="progress-step" data-step="2"><span class="step-status">⏳</span> Validando inventario...</div>
          <div class="progress-step" data-step="3"><span class="step-status">⏳</span> Calculando envío...</div>
          <div class="progress-step" data-step="4"><span class="step-status">⏳</span> Creando pedido...</div>
        </div>
      </div>
    </div>
  `;

  initUrgencyCountdown();
  initStockCounter();
  loadLocationsCheckout();
  renderVariants();
  initFormSubmit();
  updateSummary();
  initStickyBar();
  initPaymentMethodToggle();
}

function initUrgencyCountdown() {
  const el = document.getElementById('checkout-timer');
  if (!el) return;

  function getEndOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  function tick() {
    const diff = Math.max(0, getEndOfDay() - new Date());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  tick();
  setInterval(tick, 1000);
}

function initStockCounter() {
  const el = document.getElementById('stock-count');
  if (!el) return;
  const base = Math.floor(Math.random() * 10) + 18;
  el.textContent = base;
  setInterval(() => {
    const current = parseInt(el.textContent);
    if (current > 3 && Math.random() > 0.6) {
      el.textContent = current - 1;
    }
  }, 8000 + Math.random() * 4000);
}

function loadLocationsCheckout() {
  const dept = document.getElementById('cf-department');
  const city = document.getElementById('cf-city');
  if (!dept) return;

  fetch('/data/locations.json')
    .then(r => r.json())
    .then(data => {
      const departments = data.departments || data;
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.department || d.name || d;
        opt.textContent = d.department || d.name || d;
        dept.appendChild(opt);
      });
      dept.addEventListener('change', () => {
        const selected = departments.find(d => (d.department || d.name || d) === dept.value);
        city.innerHTML = '<option value="">Selecciona...</option>';
        city.disabled = false;
        const cities = selected?.cities || selected?.ciudades || [];
        cities.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name || c.city || c;
          opt.textContent = c.name || c.city || c;
          city.appendChild(opt);
        });
      });
    })
    .catch(() => {});
}

function renderVariants() {
  const container = document.getElementById('variant-selector');
  if (!container || !product?.variants) return;

  product.variants.forEach((v, i) => {
    const card = createEl('div', {
      className: `variant-card${i === 1 ? ' is-selected' : ''}`,
      dataset: { variantId: v.id, price: v.price },
    }, [
      createEl('div', { className: 'variant-radio' }, [
        createEl('span', { className: `variant-dot${i === 1 ? ' is-active' : ''}` }),
      ]),
      createEl('div', { className: 'variant-info' }, [
        createEl('div', { className: 'variant-name' }, [document.createTextNode(v.name)]),
        createEl('div', { className: 'variant-price' }, [document.createTextNode(formatCurrency(v.price))]),
        v.compare_price ? createEl('div', { className: 'variant-old' }, [document.createTextNode(formatCurrency(v.compare_price))]) : null,
        i === 1 ? createEl('div', { className: 'variant-badge' }, [document.createTextNode('RECOMENDADO')]) : null,
      ]),
    ]);

    on(card, 'click', () => {
      container.querySelectorAll('.variant-card').forEach(c => {
        c.classList.remove('is-selected');
        c.querySelector('.variant-dot')?.classList.remove('is-active');
      });
      card.classList.add('is-selected');
      card.querySelector('.variant-dot')?.classList.add('is-active');
      selectedVariant = v;
      updateSummary();
    });

    container.appendChild(card);
  });
}

function updateSummary() {
  if (!selectedVariant) return;
  const v = selectedVariant;

  const nameEl = document.getElementById('summary-name');
  const variantEl = document.getElementById('summary-variant');
  const oldEl = document.getElementById('summary-old');
  const currentEl = document.getElementById('summary-current');
  const totalEl = document.getElementById('summary-total');

  if (nameEl) nameEl.textContent = product?.name || 'OrganiMax';
  if (variantEl) variantEl.textContent = v.name;
  if (oldEl) oldEl.textContent = v.compare_price ? formatCurrency(v.compare_price) : '';
  if (currentEl) currentEl.textContent = formatCurrency(v.price);
  if (totalEl) totalEl.textContent = formatCurrency(v.price);
}

function showProgress() {
  const overlay = document.getElementById('progress-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  const steps = overlay.querySelectorAll('.progress-step');
  const delays = [500, 1500, 2800, 4000];

  steps.forEach((step, i) => {
    setTimeout(() => {
      step.querySelector('.step-status').textContent = '✅';
      step.style.opacity = '1';
    }, delays[i]);
  });
}

function hideProgress() {
  const overlay = document.getElementById('progress-overlay');
  if (overlay) overlay.style.display = 'none';
}

function validateForm() {
  const name = $('#cf-name')?.value?.trim();
  const phone = $('#cf-phone')?.value?.trim();
  const dept = $('#cf-department')?.value;
  const city = $('#cf-city')?.value;
  const address = $('#cf-address')?.value?.trim();

  const errors = [];
  if (!name || name.length < 3) errors.push('Nombre completo (mínimo 3 caracteres)');
  if (!phone || phone.replace(/[^0-9]/g, '').length < 7) errors.push('Celular válido (mínimo 7 dígitos)');
  if (!dept) errors.push('Selecciona un departamento');
  if (!city) errors.push('Selecciona una ciudad');
  if (!address || address.length < 5) errors.push('Dirección completa');

  return errors;
}

function getPaymentMethod() {
  const selected = document.querySelector('input[name="payment_method"]:checked');
  return selected ? selected.value : 'cash_on_delivery';
}

function updatePaymentDisclaimer() {
  const el = document.getElementById('payment-disclaimer');
  if (!el) return;
  const method = getPaymentMethod();
  if (method === 'credit_card') {
    el.innerHTML = '<i class="fa-solid fa-lock"></i> Pago procesado de forma segura por Wompi';
  } else {
    el.innerHTML = '<i class="fa-solid fa-lock"></i> Compra 100% segura. Pagas solo cuando recibes.';
  }
}

function initPaymentMethodToggle() {
  const radios = document.querySelectorAll('input[name="payment_method"]');
  radios.forEach(r => {
    on(r, 'change', () => {
      document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('is-active'));
      const label = r.closest('.payment-option');
      if (label) label.classList.add('is-active');
      updatePaymentDisclaimer();
    });
  });
  const checked = document.querySelector('input[name="payment_method"]:checked');
  if (checked) {
    const label = checked.closest('.payment-option');
    if (label) label.classList.add('is-active');
  }
}

function initFormSubmit() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      alert('Por favor completa:\n• ' + errors.join('\n• '));
      return;
    }

    if (!selectedVariant) {
      alert('Selecciona un pack');
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Procesando...';
    showProgress();

    const name = $('#cf-name')?.value?.trim();
    const phone = $('#cf-phone')?.value?.trim();
    const email = $('#cf-email')?.value?.trim();
    const dept = $('#cf-department')?.value;
    const city = $('#cf-city')?.value;
    const neighborhood = $('#cf-neighborhood')?.value?.trim();
    const address = $('#cf-address')?.value?.trim();
    const reference = $('#cf-reference')?.value?.trim();
    const whatsappOptIn = document.getElementById('cf-whatsapp')?.checked || false;
    const paymentMethod = getPaymentMethod();

    const fullAddress = [address, neighborhood, reference].filter(Boolean).join(', ');

    trackAddToCart(selectedVariant.id);
    trackBeginCheckout(selectedVariant.id);

    const body = {
      customer: { name, phone, email: email || undefined },
      shipping_address: { street: fullAddress, city, state: dept, country: 'Colombia' },
      items: [{ product_id: product.id, variant_id: selectedVariant.id, quantity: 1 }],
      payment_method: paymentMethod,
      whatsapp_opt_in: whatsappOptIn,
    };

    try {
      const res = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        const orderData = json.data.order;
        trackPurchase(orderData.order_number, selectedVariant.id);

        if (paymentMethod === 'credit_card') {
          await handleCardPayment(orderData.id, name);
        } else {
          const params = new URLSearchParams({
            order: orderData.order_number,
            nombre: name,
            total: selectedVariant.price,
            payment_method: 'cash_on_delivery',
            paid: 'true',
          });
          window.location.href = `/gracias.html?${params}`;
        }
      } else {
        hideProgress();
        btn.disabled = false;
        btn.textContent = 'Intentar de nuevo';
        alert('Error: ' + (json.error?.message || 'No se pudo procesar el pedido'));
      }
    } catch (err) {
      hideProgress();
      btn.disabled = false;
      btn.textContent = 'Intentar de nuevo';
      alert('Error de conexión. Verifica tu internet e intenta de nuevo.');
    }
  });
}

async function handleCardPayment(orderId, customerName) {
  const overlay = document.getElementById('progress-overlay');
  const steps = overlay?.querySelectorAll('.progress-step');
  if (steps) {
    steps.forEach(s => s.remove());
  }
  const icon = document.getElementById('progress-icon');
  if (icon) icon.textContent = '💳';
  const title = overlay?.querySelector('h3');
  if (title) title.textContent = 'Redirigiendo a pasarela de pago...';

  try {
    const res = await fetch('/api/v1/wompi/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });

    const json = await res.json();
    if (json.success && json.data.redirect_url) {
      window.location.href = json.data.redirect_url;
    } else {
      throw new Error(json.error?.message || 'No se pudo iniciar el pago');
    }
  } catch (err) {
    hideProgress();
    const btn = document.getElementById('checkout-submit');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Intentar de nuevo';
    }
    alert('Error al conectar con la pasarela de pago: ' + err.message);
  }
}

function initStickyBar() {
  const bar = document.getElementById('checkout-sticky-bar');
  if (!bar) return;

  const form = document.getElementById('checkout-form');
  if (!form) return;

  const observer = new IntersectionObserver(([entry]) => {
    bar.classList.toggle('is-visible', !entry.isIntersecting);
  }, { threshold: 0 });

  observer.observe(form.querySelector('[type="submit"]'));

  const btn = bar.querySelector('.btn');
  if (btn) {
    on(btn, 'click', (e) => {
      e.preventDefault();
      document.querySelector('[type="submit"]')?.click();
    });
  }
}
