const WEBHOOK_BASE = 'https://hook.chatproa.com';

export class WhatsAppClient {
  getWebhookUrl() {
    return process.env.WEBHOOK_URL || `${WEBHOOK_BASE}/webhook/66c70f38-b1e2-4ead-b56f-2a987eeea520`;
  }

  async sendTemplate(to, templateName, params = {}) {
    try {
      const payload = {
        to,
        type: 'template',
        template: { name: templateName, language: { code: 'es' }, components: [{ type: 'body', parameters: params }] },
      };
      const res = await fetch(this.getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_whatsapp', ...payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[WhatsApp] Failed to send template:', err.message);
      return null;
    }
  }

  async sendMessage(to, text) {
    try {
      const res = await fetch(this.getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_whatsapp', to, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[WhatsApp] Failed to send message:', err.message);
      return null;
    }
  }
}
