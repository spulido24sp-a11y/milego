import { ProductRepository } from '../repositories/product.repository.js';

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
    return repo.create(data);
  }

  async update(id, data) {
    return repo.update(id, data);
  }

  async delete(id) {
    return repo.softDelete(id);
  }
}
