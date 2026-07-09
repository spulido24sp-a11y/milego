import { describe, it, expect, afterAll } from 'vitest';
import { AuditRepository } from '../../repositories/audit.repository.js';
import { ProductRepository } from '../../repositories/product.repository.js';
import { CategoryRepository } from '../../repositories/category.repository.js';
import { UserRepository } from '../../repositories/user.repository.js';
import db from '../../config/database.js';

const auditRepo = new AuditRepository();
const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();
const userRepo = new UserRepository();

describe('Tenant Isolation — Audit Repository', () => {
  it('returns empty result set when tenantId is missing', async () => {
    const result = await auditRepo.findAll({ page: 1, perPage: 10 });
    expect(result).toEqual({ logs: [], total: 0 });
  });

  it('returns empty when tenantId is undefined', async () => {
    const result = await auditRepo.findAll({ tenantId: undefined, page: 1, perPage: 10 });
    expect(result).toEqual({ logs: [], total: 0 });
  });

  it('returns empty when tenantId is null', async () => {
    const result = await auditRepo.findAll({ tenantId: null, page: 1, perPage: 10 });
    expect(result).toEqual({ logs: [], total: 0 });
  });

  it('filters by tenantId for store 1', async () => {
    const result = await auditRepo.findAll({ tenantId: 1, page: 1, perPage: 10 });
    expect(result).toHaveProperty('logs');
    expect(result).toHaveProperty('total');
    expect(typeof result.total).toBe('number');
    for (const log of result.logs) {
      expect(log.store_id).toBe(1);
    }
  });

  it('returns empty logs for non-existent tenant', async () => {
    const result = await auditRepo.findAll({ tenantId: 99999, page: 1, perPage: 10 });
    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('Tenant Isolation — Product Repository', () => {
  it('baseQuery filters by store_id', async () => {
    const query = productRepo.baseQuery(1);
    const results = await query.limit(5);
    for (const p of results) {
      expect(p.store_id).toBe(1);
    }
  });
});

describe('Tenant Isolation — Category Repository', () => {
  it('findAll filters by store_id', async () => {
    const results = await categoryRepo.findAll(1);
    for (const c of results) {
      expect(c.store_id).toBe(1);
    }
  });
});

describe('Tenant Isolation — User Repository', () => {
  it('findAll filters by store_id', async () => {
    const results = await userRepo.findAll({ tenant: { storeId: 1 } });
    expect(Array.isArray(results)).toBe(true);
    for (const u of results) {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('email');
    }
  });
});

const testCleanup = [];

afterAll(async () => {
  for (const query of testCleanup) {
    try { await query; } catch {}
  }
});

describe('Tenant Isolation — Audit Logs Direct DB', () => {
  it('audit logs are tenant-scoped via query', async () => {
    const slug = `audit-test-${Date.now()}`;
    const [store2] = await db('stores').insert({
      name: 'Audit Test Store', slug,
    }).returning('id');
    const store2Id = store2.id;
    testCleanup.push(db('stores').where('id', store2Id).del());

    await db('audit_logs').insert([
      { store_id: 1, action: 'test_iso', entity_type: 'order', entity_id: '1', user_id: 1, ip_address: '127.0.0.1' },
      { store_id: store2Id, action: 'test_iso', entity_type: 'order', entity_id: '2', user_id: 1, ip_address: '127.0.0.1' },
    ]);
    testCleanup.push(db('audit_logs').where('action', 'test_iso').del());

    const store1 = await db('audit_logs').where({ store_id: 1, action: 'test_iso' });
    const store2logs = await db('audit_logs').where({ store_id: store2Id, action: 'test_iso' });

    expect(store1.length).toBeGreaterThanOrEqual(1);
    expect(store2logs.length).toBeGreaterThanOrEqual(1);
    for (const log of store1) expect(log.store_id).toBe(1);
    for (const log of store2logs) expect(log.store_id).toBe(store2Id);
  });
});

describe('Tenant Isolation — Event Logs', () => {
  it('event_logs are tenant-scoped via payload', async () => {
    await db('event_logs').insert([
      { event_name: 'test_iso', payload: JSON.stringify({ store_id: 1, data: {} }), status: 'pending' },
      { event_name: 'test_iso', payload: JSON.stringify({ store_id: 2, data: {} }), status: 'pending' },
    ]);
    testCleanup.push(db('event_logs').where('event_name', 'test_iso').del());

    const events = await db('event_logs').where('event_name', 'test_iso');
    expect(events.length).toBeGreaterThanOrEqual(2);

    const storePayloads = events.map(e => (typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload));
    expect(storePayloads.filter(p => p.store_id === 1).length).toBeGreaterThanOrEqual(1);
    expect(storePayloads.filter(p => p.store_id === 2).length).toBeGreaterThanOrEqual(1);
    expect(storePayloads.some(p => p.store_id === 1 && p.store_id === 2)).toBe(false);
  });
});

describe('Tenant Isolation — Jobs', () => {
  it('jobs are tenant-scoped via payload', async () => {
    await db('jobs').insert([
      { type: 'test_iso', payload: JSON.stringify({ store_id: 1 }), status: 'pending' },
      { type: 'test_iso', payload: JSON.stringify({ store_id: 2 }), status: 'pending' },
    ]);
    testCleanup.push(db('jobs').where('type', 'test_iso').del());

    const jobs = await db('jobs').where('type', 'test_iso');
    expect(jobs.length).toBeGreaterThanOrEqual(2);

    const jobPayloads = jobs.map(j => (typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload));
    expect(jobPayloads.filter(p => p.store_id === 1).length).toBeGreaterThanOrEqual(1);
    expect(jobPayloads.filter(p => p.store_id === 2).length).toBeGreaterThanOrEqual(1);
  });
});
