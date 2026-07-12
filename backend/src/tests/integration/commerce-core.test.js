import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..', '..', '..');

const PORT = 3005;
const API = `http://localhost:${PORT}`;

let server;
let staffToken;
let testProduct;

async function fetchApi(path, options = {}) {
  const url = `${API}/api/v1${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(url, {
    headers,
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['src/server.js'], {
      cwd: backendRoot,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let started = false;
    const check = (data) => {
      const msg = data.toString();
      if (!started && msg.includes('running on port')) {
        started = true;
        resolve(proc);
      }
    };
    proc.stdout.on('data', check);
    proc.stderr.on('data', check);
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (!started) reject(new Error(`Server exited with code ${code}`));
    });
    setTimeout(() => {
      if (!started) { started = true; resolve(proc); }
    }, 5000);
  });
}

describe('MIleGo V7.2 Commerce Core & AI Launcher Integration Tests', () => {
  beforeAll(async () => {
    server = await startServer();

    // 1. Get staff token for admin actions
    const loginRes = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@milego.co', password: 'admin123' }),
    });
    staffToken = loginRes.body.data.accessToken;

    // 2. Fetch or ensure a test product exists in the DB
    testProduct = await db('products').where({ store_id: 1, deleted_at: null }).where('stock', '>', 0).orderBy('id', 'asc').first();
    if (!testProduct) throw new Error('No active products with stock > 0' + '. Run seeds or check DB.');
  }, 15000);

  afterAll(async () => {
    if (server) server.kill();
  });

  describe('Magic Link Auth Flow', () => {
    let token = '';

    it('should request a magic link and return the local link in the payload', async () => {
      const { status, body } = await fetchApi('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: 'customer_test@milego.co' }),
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('magicLink');
      expect(body.data.email).toBe('customer_test@milego.co');

      // Extract token from URL parameter
      const url = new URL(body.data.magicLink);
      token = url.searchParams.get('token');
      expect(token).toBeDefined();
    });

    it('should verify the token and return a customer accessToken JWT', async () => {
      const { status, body } = await fetchApi(`/auth/magic-link?token=${token}`);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data.customer.email).toBe('customer_test@milego.co');
    });

    it('should return 401 when verifying an already used token', async () => {
      const { status } = await fetchApi(`/auth/magic-link?token=${token}`);
      expect(status).toBe(401);
    });
  });

  describe('Transactional Checkout Flow', () => {
    it('should process a guest checkout and record order, client and payment log', async () => {
      expect(testProduct).toBeDefined();

      const checkoutPayload = {
        customer: {
          name: 'Cliente Test de Compra',
          email: 'test_checkout_customer@milego.co',
          phone: '3123456789',
        },
        shipping_address: {
          street: 'Calle 123 # 45-67',
          city: 'Bogotá',
          state: 'Cundinamarca',
          country: 'Colombia',
        },
        items: [
          {
            product_id: testProduct.id,
            quantity: 1,
          },
        ],
        payment_method: 'cash_on_delivery',
        notes: 'Entregar en la portería del edificio',
        whatsapp_opt_in: true,
      };

      const { status, body } = await fetchApi('/checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload),
      });

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('order');
      expect(body.data.order.payment_method).toBe('cash_on_delivery');
      expect(body.data).toHaveProperty('customer');
      expect(body.data).toHaveProperty('payment');
    });

    it('should fail checkout if product stock is insufficient', async () => {
      const checkoutPayload = {
        customer: {
          name: 'Cliente Test Error',
          phone: '3120000000',
        },
        shipping_address: {
          street: 'Avenida Siempre Viva 742',
          city: 'Bogotá',
          state: 'Cundinamarca',
        },
        items: [
          {
            product_id: testProduct.id,
            quantity: 99999, // Way higher than seeded stock
          },
        ],
      };

      const { status, body } = await fetchApi('/checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload),
      });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Stock insuficiente');
    });
  });
});
