import { config } from '../../config/index.js';
import db from '../../config/database.js';
import { DropiAuthError, DropiAPIError, DropiConnectionError } from './errors.js';
import { randomUUID } from 'crypto';

export class DropiClient {
  constructor() {
    this.baseUrl = config.env === 'production' 
      ? 'https://api.dropi.co/api/v1' 
      : 'https://test.api.dropi.co/api/v1';
  }

  /**
   * Retrieves product payload by external ID from Dropi.
   * @param {string} externalId 
   * @param {string} [correlationId=null] 
   * @returns {Promise<Object>} Raw API response payload
   */
  async getProduct(externalId, correlationId = null) {
    const isEnabled = process.env.DROPI_PROVIDER_ENABLED === 'true' || config.dropiProviderEnabled;
    const integrationKey = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;

    if (!isEnabled) {
      throw new Error('Dropi Provider Disabled');
    }
    if (!integrationKey) {
      throw new DropiAuthError('Missing Dropi Integration Key');
    }

    const endpoint = `/products/${externalId}`;
    const url = `${this.baseUrl}${endpoint}`;
    
    let retries = 0;
    const maxRetries = 2;
    let lastError = null;
    const start = Date.now();

    while (retries <= maxRetries) {
      const requestId = randomUUID();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'dropi-integration-key': integrationKey,
            'Authorization': `Bearer ${integrationKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - start;

        // Log integration request metrics for observability (DoD Phase 6)
        await db('integration_requests_log').insert({
          id: requestId,
          correlation_id: correlationId,
          provider: 'dropi',
          endpoint,
          status: res.status,
          latency_ms: duration,
          retries
        });

        if (res.status === 200) {
          return await res.json();
        } else if (res.status === 401 || res.status === 403) {
          throw new DropiAuthError('Invalid integration key credentials');
        } else if (res.status === 404) {
          throw new DropiAPIError(`Product with ID ${externalId} not found in Dropi catalog`, 404);
        } else {
          throw new DropiAPIError(`Dropi API error: ${res.statusText}`, res.status);
        }
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new DropiConnectionError('Connection request timeout after 10s');
        }
        retries++;
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500)); // exponential backoff
        }
      }
    }

    throw lastError || new DropiConnectionError('Failed to communicate with Dropi after multiple retries');
  }

  /**
   * Lists the Dropi catalog (for automatic new-product detection).
   * @param {Object} [opts]
   * @param {number} [opts.page=1]
   * @param {number} [opts.limit=100]
   * @returns {Promise<Array>} Array of raw catalog items (each with an `id`)
   */
  async listCatalog({ page = 1, limit = 100 } = {}) {
    const isEnabled = process.env.DROPI_PROVIDER_ENABLED === 'true' || config.dropiProviderEnabled;
    const integrationKey = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;

    if (!isEnabled) throw new Error('Dropi Provider Disabled');
    if (!integrationKey) throw new DropiAuthError('Missing Dropi Integration Key');

    const endpoint = `/products?page=${page}&limit=${limit}`;
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = randomUUID();
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'dropi-integration-key': integrationKey,
          'Authorization': `Bearer ${integrationKey}`,
          'Content-Type': 'application/json'
        }
      });

      await db('integration_requests_log').insert({
        id: requestId,
        provider: 'dropi',
        endpoint,
        status: res.status,
        latency_ms: Date.now() - start,
        retries: 0
      }).catch(() => {});

      if (res.status === 200) {
        const json = await res.json().catch(() => ({}));
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.data)) return json.data;
        if (Array.isArray(json.items)) return json.items;
        if (Array.isArray(json.products)) return json.products;
        if (Array.isArray(json.objects)) return json.objects;
        return [];
      }
      if (res.status === 401 || res.status === 403) {
        throw new DropiAuthError('Invalid integration key credentials');
      }
      throw new DropiAPIError(`Dropi catalog error: ${res.statusText}`, res.status);
    } catch (err) {
      if (err.name === 'AbortError') throw new DropiConnectionError('Catalog request timeout');
      throw err;
    }
  }

  /**
   * Creates a fulfillment order in Dropi.
   * @param {Object} payload - { products: [{id, quantity, price}], customer: {name, phone, document, address}, shipping: {city, state, street} }
   * @param {string} [correlationId=null]
   * @returns {Promise<Object>} { dropi_order_id, tracking_number, carrier, ... }
   */
  async createOrder(payload, correlationId = null) {
    const isEnabled = process.env.DROPI_PROVIDER_ENABLED === 'true' || config.dropiProviderEnabled;
    const integrationKey = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;

    if (!isEnabled) throw new Error('Dropi Provider Disabled');
    if (!integrationKey) throw new DropiAuthError('Missing Dropi Integration Key');

    const endpoint = '/orders';
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = randomUUID();
    const start = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'dropi-integration-key': integrationKey,
          'Authorization': `Bearer ${integrationKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - start;

      await db('integration_requests_log').insert({
        id: requestId,
        correlation_id: correlationId,
        provider: 'dropi',
        endpoint,
        status: res.status,
        latency_ms: duration,
        retries: 0,
      });

      if (res.status === 200 || res.status === 201) {
        return await res.json();
      } else if (res.status === 401 || res.status === 403) {
        throw new DropiAuthError('Invalid integration key credentials');
      } else {
        const body = await res.json().catch(() => ({}));
        throw new DropiAPIError(body?.message || `Dropi order creation failed: ${res.statusText}`, res.status);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new DropiConnectionError('Order creation request timeout after 15s');
      throw err;
    }
  }

  /**
   * Retrieves an order from Dropi by its ID.
   * @param {string|number} dropiOrderId
   * @returns {Promise<Object>}
   */
  async getOrder(dropiOrderId) {
    const isEnabled = process.env.DROPI_PROVIDER_ENABLED === 'true' || config.dropiProviderEnabled;
    const integrationKey = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;
    if (!isEnabled) throw new Error('Dropi Provider Disabled');
    if (!integrationKey) throw new DropiAuthError('Missing Dropi Integration Key');

    const endpoint = `/orders/${dropiOrderId}`;
    const url = `${this.baseUrl}${endpoint}`;

    const res = await fetch(url, {
      headers: {
        'dropi-integration-key': integrationKey,
        'Authorization': `Bearer ${integrationKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 200) return await res.json();
    if (res.status === 401 || res.status === 403) throw new DropiAuthError('Invalid integration key credentials');
    if (res.status === 404) throw new DropiAPIError(`Order ${dropiOrderId} not found in Dropi`, 404);
    throw new DropiAPIError(`Dropi API error: ${res.statusText}`, res.status);
  }
}
