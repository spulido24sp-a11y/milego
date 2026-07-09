function cfg() { return window.__CONFIG__ || {}; }

export async function sendToWebhook(data) {
  const config = cfg().WEBHOOK || {};
  const url = localStorage.getItem('milego_webhook_url') || config.URL || '';
  const token = localStorage.getItem('milego_webhook_token') || config.TOKEN || '';

  if (!url) throw new Error('Webhook URL no configurada');

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
  return res;
}
