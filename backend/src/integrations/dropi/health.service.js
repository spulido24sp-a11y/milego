import { config } from '../../config/index.js';
import db from '../../config/database.js';

export class DropiHealthService {
  constructor() {
    this.baseUrl = config.env === 'production' 
      ? 'https://api.dropi.co/api/v1' 
      : 'https://test.api.dropi.co/api/v1';
  }

  /**
   * Evaluates the health status of the Dropi integration using live logs and endpoints.
   * @returns {Promise<Object>} Diagnostic report
   */
  async checkHealth() {
    const enabled = process.env.DROPI_PROVIDER_ENABLED === 'true' || config.dropiProviderEnabled;
    const integrationKey = process.env.DROPI_INTEGRATION_KEY || config.dropiIntegrationKey;

    if (!enabled) {
      return {
        enabled: false,
        authenticated: false,
        reachable: false,
        latency: 0,
        errorsLast24h: 0,
        lastSync: null,
        lastCheck: new Date().toISOString()
      };
    }

    const start = Date.now();
    let reachable = false;
    let authenticated = false;
    let latency = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s health timeout

      const res = await fetch(`${this.baseUrl}/products/1`, {
        method: 'GET',
        headers: {
          'dropi-integration-key': integrationKey || 'ping-test',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      latency = Date.now() - start;
      reachable = true;

      if (res.status === 200 || res.status === 404) {
        authenticated = !!integrationKey;
      }
    } catch (err) {
      latency = Date.now() - start;
      reachable = false;
    }

    // Query average latency from logs in the last 24h
    const [avgLatencyRow] = await db('integration_requests_log')
      .where({ provider: 'dropi' })
      .where('timestamp', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .avg('latency_ms as avg_latency');
    
    const operationalLatency = avgLatencyRow?.avg_latency 
      ? Math.round(parseFloat(avgLatencyRow.avg_latency)) 
      : latency;

    // Query errors in the last 24h
    const [errorsRow] = await db('integration_requests_log')
      .where({ provider: 'dropi' })
      .where('status', '>=', 400)
      .where('timestamp', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .count('id as error_count');
    
    const errorsLast24h = parseInt(errorsRow?.error_count || '0', 10);

    // Query last sync timestamp
    const lastSyncRow = await db('products')
      .where({ provider_id: 'dropi', sync_status: 'synced' })
      .orderBy('provider_last_sync', 'desc')
      .select('provider_last_sync')
      .first();

    return {
      enabled: true,
      authenticated,
      reachable,
      latency: operationalLatency,
      errorsLast24h,
      lastSync: lastSyncRow?.provider_last_sync || null,
      lastCheck: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}
