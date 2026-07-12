import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..', '..');

const PORT = 3007;
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

describe('Launch Review Workspace API Tests', () => {
  beforeAll(async () => {
    server = await startServer();

    // 1. Authenticate to get token
    const loginRes = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@milego.co', password: 'admin123' }),
    });
    staffToken = loginRes.body.data.accessToken;

    // 2. Create clean test product
    await db('launch_versions').del();
    await db('products').where({ slug: 'smart-lamp-pro-workspace-test' }).del();

    const [product] = await db('products').insert({
      store_id: 1,
      name: 'Smart Lamp Pro',
      slug: 'smart-lamp-pro-workspace-test',
      price: 69900.00,
      stock: 50,
      status: 'draft',
      launch_blueprint: {
        decision: 'review',
        confidence: 85,
        commerce_confidence_scores: { total: 85 },
        seo: { title: 'Smart Lamp Pro', slug: 'smart-lamp-pro-workspace-test', keywords: ['lamp'] },
        offer: { price_cost: 25000, price_unit: 69900, bundle: 'combo_x2' }
      }
    }).returning('*');

    testProduct = product;
  }, 15000);

  afterAll(async () => {
    if (server) server.kill();
  });

  it('should fetch the launch review and versions history successfully', async () => {
    const { status, body } = await fetchApi(`/launches/${testProduct.id}/review`, {
      method: 'GET',
      token: staffToken
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.product.id).toBe(testProduct.id);
    expect(Array.isArray(body.data.history)).toBe(true);
  });

  it('should update a specific section of the blueprint and increment version count', async () => {
    const newSeo = {
      title: 'Ajustado por el usuario',
      slug: 'smart-lamp-pro-workspace-test',
      keywords: ['bombillo', 'rgb']
    };

    const { status, body } = await fetchApi(`/launches/${testProduct.id}/review`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({
        section: 'seo',
        data: newSeo
      })
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.product.launch_blueprint.seo.title).toBe('Ajustado por el usuario');
    expect(body.data.version).toBe(1);

    // Verify snapshot in launch_versions
    const versions = await db('launch_versions').where({ product_id: testProduct.id });
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].blueprint.seo.title).toBe('Ajustado por el usuario');
  });

  it('should enforce safety margin locks preventing selling price < cost', async () => {
    const badOffer = {
      price_cost: 25000,
      price_unit: 19000, // Invalid - price < cost!
      bundle: 'combo_x2'
    };

    const { status, body } = await fetchApi(`/launches/${testProduct.id}/review`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({
        section: 'offer',
        data: badOffer
      })
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_OFFER');
  });

  it('should trigger LIAM section regeneration successfully', async () => {
    const { status, body } = await fetchApi(`/launches/${testProduct.id}/regenerate`, {
      method: 'POST',
      token: staffToken,
      body: JSON.stringify({
        section: 'seo'
      })
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.section.title).toContain('La mejor oferta del mercado hoy');
  });

  it('should transition product status through approval flow (draft -> approved)', async () => {
    const { status, body } = await fetchApi(`/launches/${testProduct.id}/approve`, {
      method: 'POST',
      token: staffToken
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('approved');

    // Verify in db
    const p = await db('products').where({ id: testProduct.id }).first();
    expect(p.status).toBe('approved');
  });

  it('should reject or return approved product back to draft status', async () => {
    const { status, body } = await fetchApi(`/launches/${testProduct.id}/reject`, {
      method: 'POST',
      token: staffToken
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('draft');

    // Verify in db
    const p = await db('products').where({ id: testProduct.id }).first();
    expect(p.status).toBe('draft');
  });
});
