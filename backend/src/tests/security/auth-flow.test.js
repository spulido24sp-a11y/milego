import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..', '..', '..');

const PORT = 3001;
const API = `http://localhost:${PORT}`;
const TEST_EMAIL = 'admin@milego.co';
const TEST_PASSWORD = 'admin123';

let server;

async function fetchApi(path, options = {}) {
  const url = `${API}/api/v1/auth${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['src/server.js'], {
      cwd: backendRoot,
      env: { ...process.env, PORT: String(PORT), LOGIN_RATE_LIMIT: '50' },
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

describe('Auth Security', () => {
  beforeAll(async () => {
    server = await startServer();
  }, 15000);

  afterAll(() => {
    if (server) server.kill();
  });

  it('login with valid credentials returns 200 + tokens', async () => {
    const { status, body } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('accessToken');
    expect(body.data).toHaveProperty('refreshToken');
  });

  it('login with wrong password returns 401', async () => {
    const { status, body } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongpassword' }),
    });
    expect(status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh with valid token returns new tokens', async () => {
    const { body: b1 } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const { status, body } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: b1.data.refreshToken }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('accessToken');
    expect(body.data).toHaveProperty('refreshToken');
  });

  it('old refresh token is rejected after rotation', async () => {
    const { status: s1, body: b1 } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(s1).toBe(200);
    const rt = b1.data.refreshToken;

    const { status: s2 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
    expect(s2).toBe(200);

    const { status: s3 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
    expect(s3).toBe(401);
  });

  it('reuse detection revokes all sessions', async () => {
    const { status: s1, body: b1 } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(s1).toBe(200);
    const rt1 = b1.data.refreshToken;

    const { status: s2, body: b2 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt1 }),
    });
    expect(s2).toBe(200);
    const rt2 = b2.data.refreshToken;

    const { status: s3, body: b3 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt1 }),
    });
    expect(s3).toBe(401);
    expect(b3.error.code).toBe('TOKEN_REUSE_DETECTED');

    const { status: s4 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt2 }),
    });
    expect(s4).toBe(401);
  });

  it('logout revokes refresh token', async () => {
    const { status: s1, body: b1 } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(s1).toBe(200);
    const rt = b1.data.refreshToken;

    const { status: s2 } = await fetchApi('/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
    expect(s2).toBe(200);

    const { status: s3 } = await fetchApi('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
    expect(s3).toBe(401);
  });

  it('/me returns user with permissions', async () => {
    const { status: s1, body: b1 } = await fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(s1).toBe(200);
    const token = b1.data.accessToken;

    const { status, body } = await fetchApi('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.user.permissions)).toBe(true);
    expect(body.data.user.permissions.length).toBe(31);
  });

  it('login rate limit returns 429 after many attempts', async () => {
    // In a fresh environment, hit the login endpoint 6 times with wrong credentials.
    // The limit of 5 is enough to trigger 429 on the 6th attempt.
    let last;
    for (let i = 0; i < 51; i++) {
      const { status } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: `rate-test-${i}@milego.co`, password: 'wrongpassword' }),
      });
      if (i >= 48) last = status;
    }
    expect(last).toBe(429);
  });
});