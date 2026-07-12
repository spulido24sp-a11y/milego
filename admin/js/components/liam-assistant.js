/**
 * liam-assistant.js
 * Holographic, futurist conversational agent overlay.
 * Mounts a floating Neural Orb that expands into a conversational HUD.
 */

import { api } from '../lib/api.js';
import { detectWhatIf, buildWhatIfResponse } from './advisor-panel.js';

export class LiamAssistant {
  constructor() {
    this.isOpen = false;
    this.isThinking = false;
    this.messages = [
      { role: 'liam', text: 'Saludos, Operador. Soy **LIAM**, tu asistente comercial neural. ¿En qué optimización trabajamos hoy?' }
    ];
  }

  mount() {
    // Check if already mounted
    if (document.getElementById('liam-assistant-root')) return;

    const root = document.createElement('div');
    root.id = 'liam-assistant-root';
    root.innerHTML = `
      <!-- Neural Orb Trigger -->
      <div class="liam-orb-container" id="liam-orb-trigger" title="Preguntarle a LIAM (IA)">
        <div class="liam-orb-ring"></div>
        <div class="liam-orb-ring"></div>
        <div class="liam-orb-ring"></div>
        <div class="liam-neural-orb">
          <span class="liam-orb-face" id="liam-orb-face">🔮</span>
        </div>
      </div>

      <!-- Holographic HUD Conversational Panel -->
      <div class="liam-holo-panel" id="liam-holo-chat">
        <div class="liam-holo-header">
          <div class="liam-holo-title">
            <span style="animation: pulse 2s infinite; font-size: 1.1rem; color: var(--brand-light);">🧠</span>
            <span>LIAM // CO-PILOT HUD</span>
          </div>
          <span class="liam-holo-close" id="liam-holo-close-btn">&times;</span>
        </div>
        
        <div class="liam-holo-body" id="liam-holo-messages-container">
          <!-- Messages inject here -->
        </div>

        <div style="font-size:0.7rem; color:var(--text-secondary); background:rgba(0,0,0,0.15); padding: 5px 15px; border-top:1px solid rgba(255,255,255,0.03);">
          💡 Prueba: <em>"¿Qué pasa si vendemos a $59.900?"</em>
        </div>

        <div class="liam-holo-footer">
          <input type="text" id="liam-holo-input" class="form-input" placeholder="Pregunta algo sobre este producto..." style="flex:1; font-size:0.8rem; background:rgba(0,0,0,0.3); border-color:rgba(139,92,246,0.3);">
          <button class="btn btn-primary" id="liam-holo-send" style="padding:0 12px; font-size:0.8rem; background:var(--brand);">Enviar</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    this._bindEvents();
    this._renderMessages();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const chat = document.getElementById('liam-holo-chat');
    const face = document.getElementById('liam-orb-face');

    if (this.isOpen) {
      chat.style.display = 'flex';
      face.textContent = '🧠';
      this._scrollToBottom();
      document.getElementById('liam-holo-input').focus();
    } else {
      chat.style.display = 'none';
      face.textContent = '🔮';
    }
  }

  // ── Private ───────────────────────────────────────────────────────────

  _bindEvents() {
    document.getElementById('liam-orb-trigger').addEventListener('click', () => this.toggle());
    document.getElementById('liam-holo-close-btn').addEventListener('click', () => this.toggle());
    document.getElementById('liam-holo-send').addEventListener('click', () => this._handleSend());
    document.getElementById('liam-holo-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSend();
    });
  }

  _renderMessages() {
    const container = document.getElementById('liam-holo-messages-container');
    if (!container) return;

    container.innerHTML = this.messages.map(m => {
      const isLiam = m.role === 'liam';
      return `
        <div class="${isLiam ? 'holo-msg-liam' : 'holo-msg-user'}">
          ${m.text}
        </div>
      `;
    }).join('');

    this._scrollToBottom();
  }

  _scrollToBottom() {
    const container = document.getElementById('liam-holo-messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }

  async _handleSend() {
    const input = document.getElementById('liam-holo-input');
    const text = input.value.trim();
    if (!text || this.isThinking) return;

    input.value = '';
    
    // Append User message
    this.messages.push({ role: 'user', text });
    this._renderMessages();

    // Show Thinking wave
    this.isThinking = true;
    const face = document.getElementById('liam-orb-face');
    face.textContent = '⚡';
    const wave = this._appendThinkingWave();

    // Context resolution (Get launch id if in review page or fallback dynamically)
    let productId = this._getCurrentProductId();

    if (!productId) {
      try {
        const prodRes = await api.get('/products');
        if (prodRes.success && prodRes.data?.length > 0) {
          productId = prodRes.data[0].id; // Assign first available product's UUID
        }
      } catch (err) {
        console.warn('[LIAM Assistant] Could not fetch fallback product list:', err);
      }
    }

    // Guard: if still no product exists in store, return message
    if (!productId) {
      wave.remove();
      this.isThinking = false;
      face.textContent = '🧠';
      this.messages.push({
        role: 'liam',
        text: '👋 Aún no tienes productos importados. Ve a la sección **Products** e importa un producto desde Dropi para poder chatear con mi modelo y simular precios.'
      });
      this._renderMessages();
      return;
    }

    // Intercept What-If locally (0 tokens)
    const scenario = detectWhatIf(text);
    if (scenario) {
      try {
        const res = await api.post(`/launches/${productId}/simulate`, { scenario });
        wave.remove();
        this.isThinking = false;
        face.textContent = '🧠';

        if (res.success && res.data?.simulation) {
          const sim = res.data.simulation;
          sim._baseConfidence = res.data.base?.scoring?.confidence;
          const html = buildWhatIfResponse(text, sim);
          this.messages.push({ role: 'liam', text: html });
        } else {
          this.messages.push({ role: 'liam', text: '⚠️ No pude completar la simulación de este precio en local.' });
        }
        this._renderMessages();
      } catch {
        wave.remove();
        this.isThinking = false;
        face.textContent = '🧠';
        this.messages.push({ role: 'liam', text: '⚠️ Error al conectar con el simulador local.' });
        this._renderMessages();
      }
      return;
    }

    // Call standard LLM chat
    try {
      // Build conversation history (excluding the very last user message which goes in objective)
      const chatHistory = this.messages
        .slice(0, -1)
        .map(m => ({
          role: m.role === 'liam' ? 'assistant' : 'user',
          content: m.text
        }));

      const res = await api.post(`/launches/${productId}/chat`, {
        objective: text,
        history: chatHistory,
        context: { productId },
        memoryType: 'session',
        memoryKey: `review_${productId}`
      });

      wave.remove();
      this.isThinking = false;
      face.textContent = '🧠';

      if (res.success && res.data?.result) {
        this.messages.push({ role: 'liam', text: res.data.result });
      } else {
        this.messages.push({ role: 'liam', text: res.error?.message || 'Error al obtener respuesta de LIAM.' });
      }
      this._renderMessages();
    } catch {
      wave.remove();
      this.isThinking = false;
      face.textContent = '🧠';
      this.messages.push({ role: 'liam', text: 'Error de conexión. ¿Está el backend corriendo?' });
      this._renderMessages();
    }
  }

  _appendThinkingWave() {
    const container = document.getElementById('liam-holo-messages-container');
    const div = document.createElement('div');
    div.className = 'holo-msg-liam';
    div.innerHTML = `
      <div class="liam-neural-wave">
        <div class="liam-wave-dot"></div>
        <div class="liam-wave-dot"></div>
        <div class="liam-wave-dot"></div>
      </div>
    `;
    container.appendChild(div);
    this._scrollToBottom();
    return div;
  }

  _getCurrentProductId() {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const id = params.get('id');

    // DB uses integer IDs
    if (id && !isNaN(parseInt(id, 10))) {
      return parseInt(id, 10);
    }

    // Check review workspace state
    if (window.currentProduct?.id) {
      return window.currentProduct.id;
    }
    return null;
  }
}
