import { ProductRepository } from '../repositories/product.repository.js';
import { bus } from '../events/index.js';

const repo = new ProductRepository();

export class ProductService {
  async list(params) {
    return repo.findAll(params);
  }

  async getBySlug(slug, tenantId) {
    return repo.findBySlug(slug, tenantId);
  }

  async getById(id) {
    return repo.findById(id);
  }

  async create(data) {
    const product = await repo.create(data);
    // Emit product.created to trigger asynchronous launch blueprinting in the background worker
    await bus.emit('product.created', { productId: product.id }, {
      entityType: 'product',
      entityId: product.id,
      action: 'created',
      storeId: product.store_id || 1
    });
    return product;
  }

  async update(id, data) {
    return repo.update(id, data);
  }

  async delete(id) {
    return repo.softDelete(id);
  }
}
