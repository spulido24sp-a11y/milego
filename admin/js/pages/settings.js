import { api } from '../lib/api.js';

const SETTINGS_META = {
  'store.name': { label: 'Nombre de la tienda', group: 'general', type: 'text', placeholder: 'MIleGo' },
  'store.logo': { label: 'URL del Logo', group: 'general', type: 'text', placeholder: '/uploads/logo.png' },
  'store.primary_color': { label: 'Color principal', group: 'general', type: 'color', placeholder: '#6366f1' },
  'store.whatsapp': { label: 'WhatsApp (visible al cliente)', group: 'general', type: 'text', placeholder: '+573209898615' },
  'store.whatsapp_notify': { label: 'WhatsApp para notificar al equipo', group: 'general', type: 'text', placeholder: '+573209898615' },
  'store.email': { label: 'Email de la tienda', group: 'general', type: 'email', placeholder: 'hola@milego.co' },
  'store.domain': { label: 'Dominio', group: 'general', type: 'text', placeholder: 'milego.co' },
  'store.favicon': { label: 'URL del Favicon', group: 'general', type: 'text', placeholder: '/assets/img/favicon.png' },

  'payment.wompi_public_key': { label: 'Wompi Public Key', group: 'payment', type: 'password', placeholder: 'pub_...' },
  'payment.wompi_private_key': { label: 'Wompi Private Key', group: 'payment', type: 'password', placeholder: 'prv_...' },
  'payment.wompi_merchant_id': { label: 'Wompi Merchant ID', group: 'payment', type: 'text', placeholder: '' },

  'integration.dropi_key': { label: 'Dropi API Key', group: 'integrations', type: 'password', placeholder: '' },
  'integration.gemini_key': { label: 'Gemini API Key', group: 'integrations', type: 'password', placeholder: '' },
  'integration.meta_api_key': { label: 'Meta API Key', group: 'integrations', type: 'password', placeholder: '' },
  'integration.chatea_webhook': { label: 'Chatea Pro Webhook URL', group: 'integrations', type: 'url', placeholder: 'https://app.chatea.pro/api/webhook/...' },

  'marketing.pixel_meta': { label: 'Meta Pixel ID', group: 'marketing', type: 'text', placeholder: '8394829482948' },
  'marketing.ga4_id': { label: 'Google Analytics 4 ID', group: 'marketing', type: 'text', placeholder: 'G-XXXXXXXXXX' },
  'marketing.gtm_id': { label: 'Google Tag Manager ID', group: 'marketing', type: 'text', placeholder: 'GTM-XXXXXXX' },
  'marketing.conversion_api_token': { label: 'Meta Conversion API Token', group: 'marketing', type: 'password', placeholder: '' },

  'smtp.host': { label: 'SMTP Host', group: 'smtp', type: 'text', placeholder: 'smtp.gmail.com' },
  'smtp.port': { label: 'SMTP Port', group: 'smtp', type: 'text', placeholder: '587' },
  'smtp.user': { label: 'SMTP User', group: 'smtp', type: 'text', placeholder: 'tu@email.com' },
  'smtp.password': { label: 'SMTP Password', group: 'smtp', type: 'password', placeholder: '' },
  'smtp.from': { label: 'SMTP From Email', group: 'smtp', type: 'email', placeholder: 'hola@milego.co' },
};

const GROUP_LABELS = {
  general: { icon: '🏪', label: 'Información de la Tienda' },
  payment: { icon: '💳', label: 'Pagos — Wompi' },
  integrations: { icon: '🔌', label: 'Integraciones' },
  marketing: { icon: '📢', label: 'Marketing & Analítica' },
  smtp: { icon: '📧', label: 'Correo SMTP' },
};

function getVal(settings, key) {
  if (!settings || !Array.isArray(settings)) return '';
  const found = settings.find(s => s.key === key);
  if (!found) return '';
  const v = found.value;
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v ?? '');
}

export function render() {
  const groups = [...new Set(Object.values(SETTINGS_META).map(m => m.group))];

  return `
    <div class="card" style="margin-bottom: 2rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="font-weight: 800; font-size: 1.5rem; display: flex; align-items: center; gap: 8px;">
            <span>⚙️</span> Configuración
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            Toda la configuración de tu tienda en un solo lugar. Los cambios se guardan automáticamente en la base de datos.
          </p>
        </div>
        <button class="btn btn-primary" id="saveAllBtn" style="padding:0.75rem 2rem;">💾 Guardar Todo</button>
      </div>
    </div>
    <form id="settings-form">
      ${groups.map(group => {
        const meta = GROUP_LABELS[group] || { icon: '📋', label: group };
        const keys = Object.entries(SETTINGS_META).filter(([k, m]) => m.group === group);
        return `
          <div class="card" style="margin-bottom: 1.5rem;" data-group="${group}">
            <h3 style="font-weight: 700; font-size: 1.1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
              <span>${meta.icon}</span> ${meta.label}
            </h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              ${keys.map(([key, field]) => {
                const inputId = `setting-${key.replace(/\./g, '-')}`;
                const isColor = field.type === 'color';
                return `
                  <div class="form-group" style="${isColor ? 'display:flex;align-items:center;gap:1rem;' : ''}">
                    <label for="${inputId}" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:4px;color:var(--text-primary);">${field.label}</label>
                    ${isColor
                      ? `<div style="display:flex;align-items:center;gap:0.5rem;flex:1;"><input type="color" id="${inputId}" class="form-input" style="width:48px;height:40px;padding:2px;cursor:pointer;" data-key="${key}"><span id="${inputId}-val" style="font-size:0.85rem;color:var(--text-secondary);font-family:monospace;"></span></div>`
                      : field.type === 'textarea'
                        ? `<textarea id="${inputId}" class="form-input" style="min-height:80px;resize:vertical;" placeholder="${field.placeholder}" data-key="${key}"></textarea>`
                        : `<input type="${field.type}" id="${inputId}" class="form-input" placeholder="${field.placeholder}" data-key="${key}" ${field.type === 'password' ? 'autocomplete="new-password"' : ''}>`
                    }
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </form>
    <div id="saveFeedback" style="display:none;position:fixed;bottom:2rem;right:2rem;padding:1rem 1.5rem;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.15);"></div>
  `;
}

let settingsData = [];

export async function init() {
  const feedback = document.getElementById('saveFeedback');
  const saveBtn = document.getElementById('saveAllBtn');

  try {
    const res = await api.get('/admin/settings');
    if (res.success) {
      settingsData = res.data;
      for (const s of settingsData) {
        const inputId = `setting-${s.key.replace(/\./g, '-')}`;
        const el = document.getElementById(inputId);
        if (el) {
          const val = typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? '');
          el.value = val;
          const valDisplay = document.getElementById(`${inputId}-val`);
          if (valDisplay) valDisplay.textContent = val;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }

  // Preview color picker changes
  document.querySelectorAll('input[type="color"]').forEach(el => {
    el.addEventListener('input', () => {
      const valDisplay = document.getElementById(`${el.id}-val`);
      if (valDisplay) valDisplay.textContent = el.value;
    });
  });

  saveBtn.addEventListener('click', async () => {
    const entries = [];
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      const raw = el.value.trim();
      const meta = SETTINGS_META[key];
      if (!meta) return;
      let value = raw;
      if (meta.type === 'color' && !raw.startsWith('#')) value = `#${raw}`;
      entries.push({
        key,
        value,
        group_name: meta.group,
        type: meta.type === 'color' ? 'string' : (meta.type || 'string'),
        is_public: meta.group === 'general',
      });
    });

    try {
      const res = await api.put('/admin/settings', { settings: entries });
      if (res.success) {
        showFeedback('✅ Configuración guardada correctamente', '#10b981', feedback);
      } else {
        showFeedback('❌ Error al guardar: ' + (res.error?.message || 'Desconocido'), '#ef4444', feedback);
      }
    } catch (err) {
      showFeedback('❌ Error de conexión', '#ef4444', feedback);
    }
  });
}

function showFeedback(msg, color, el) {
  if (!el) return;
  el.textContent = msg;
  el.style.background = color;
  el.style.color = '#fff';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}
