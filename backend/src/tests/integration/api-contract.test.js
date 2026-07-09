import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../app.js';

describe('API Contract Integration', () => {
  let server;
  let baseURL;

  beforeAll(() => {
    server = app.listen(0);
    const { port } = server.address();
    baseURL = `http://localhost:${port}`;
  });

  afterAll(() => server.close());

  it('returns health check with X-Correlation-Id header', async () => {
    const res = await fetch(`${baseURL}/api/v1/health`);
    expect(res.headers.has('X-Correlation-Id')).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  it('404 returns standard error format with correlation_id', async () => {
    const res = await fetch(`${baseURL}/api/v1/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
    expect(body).toHaveProperty('correlation_id');
  });

  it('unauthenticated request returns 401 with correlation_id', async () => {
    const res = await fetch(`${baseURL}/api/v1/products`, {
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('correlation_id');
  });

  it('passes X-Correlation-Id from request to response', async () => {
    const res = await fetch(`${baseURL}/api/v1/health`, {
      headers: { 'X-Correlation-Id': 'my-test-custom-id' }
    });
    expect(res.headers.get('X-Correlation-Id')).toBe('my-test-custom-id');
  });
});
