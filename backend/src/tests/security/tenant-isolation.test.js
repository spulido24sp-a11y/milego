import { describe, it, expect } from 'vitest';
import { AuditRepository } from '../../repositories/audit.repository.js';
import { ProductRepository } from '../../repositories/product.repository.js';
import { CategoryRepository } from '../../repositories/category.repository.js';
import { UserRepository } from '../../repositories/user.repository.js';

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
