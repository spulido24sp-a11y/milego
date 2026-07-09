import { CategoryRepository } from '../repositories/category.repository.js';

const repo = new CategoryRepository();

export class CategoryService {
  async list(tenantId) {
    return repo.findAll(tenantId);
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
