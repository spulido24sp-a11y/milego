import { createHash } from 'crypto';
import db from '../../config/database.js';

function sha256(value) {
  if (!value) return null;
  return createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

export class MetaEventsService {
  constructor() {
    this.pixelId = null;
    this.accessToken = null;
    this.testEventCode = null;
    this.storeId = null;
  }

  async initialize(storeId) {
    this.storeId = storeId || 1;
    const settings = await db('settings')
      .where('store_id', this.storeId)
      .whereIn('key', ['meta_pixel_id', 'meta_access_token', 'meta_test_event_code'])
      .select('key', 'value');

    for (const s of settings) {
      const val = s.value ? JSON.parse(s.value) : null;
      if (s.key === 'meta_pixel_id') this.pixelId = val;
      if (s.key === 'meta_access_token') this.accessToken = val;
      if (s.key === 'meta_test_event_code') this.testEventCode = val;
    }

    if (!this.pixelId || !this.accessToken) {
      throw new Error('Meta Pixel not configured: missing pixel_id or access_token');
    }
  }

  async trackEvent(eventName, eventData, userData = {}, eventSourceUrl = '') {
    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: eventSourceUrl,
        user_data: {
          em: userData.email ? [sha256(userData.email)] : [],
          ph: userData.phone ? [sha256(userData.phone)] : [],
          client_ip_address: userData.client_ip_address || '',
          client_user_agent: userData.client_user_agent || '',
        },
        custom_data: {
          ...eventData,
        },
      }],
      access_token: this.accessToken,
    };

    if (this.testEventCode) {
      payload.test_event_code = this.testEventCode;
    }

    const url = `https://graph.facebook.com/v18.0/${this.pixelId}/events`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        console.warn('[MetaCAPI] API error:', json);
      }
      return json;
    } catch (err) {
      console.warn('[MetaCAPI] Request failed:', err.message);
      throw err;
    }
  }

  async trackPurchase(orderData, customerData) {
    const items = (orderData.items || []).map(i => ({
      id: String(i.product_id || i.id || ''),
      quantity: i.quantity || 1,
      item_price: parseFloat(i.unit_price || i.price || 0),
    }));

    return this.trackEvent('Purchase', {
      value: parseFloat(orderData.total || 0),
      currency: 'COP',
      content_ids: items.map(i => i.id),
      content_type: 'product',
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      contents: items,
    }, {
      email: customerData?.email,
      phone: customerData?.phone,
      client_ip_address: customerData?.client_ip_address,
      client_user_agent: customerData?.client_user_agent,
    }, orderData.event_source_url || '');
  }

  async trackInitiateCheckout(cartData) {
    return this.trackEvent('InitiateCheckout', {
      value: parseFloat(cartData.total || 0),
      currency: 'COP',
      content_ids: (cartData.items || []).map(i => String(i.product_id || i.id || '')),
      content_type: 'product',
      num_items: (cartData.items || []).reduce((s, i) => s + (i.quantity || 1), 0),
    }, {
      email: cartData?.customer?.email,
      phone: cartData?.customer?.phone,
    }, cartData.event_source_url || '');
  }

  async trackViewContent(productData) {
    return this.trackEvent('ViewContent', {
      value: parseFloat(productData.price || 0),
      currency: 'COP',
      content_name: productData.name || '',
      content_ids: [String(productData.id || '')],
      content_type: 'product',
    }, {}, productData.event_source_url || '');
  }

  async trackAddToCart(productData) {
    return this.trackEvent('AddToCart', {
      value: parseFloat(productData.price || 0),
      currency: 'COP',
      content_name: productData.name || '',
      content_ids: [String(productData.id || '')],
      content_type: 'product',
    }, {}, productData.event_source_url || '');
  }
}
