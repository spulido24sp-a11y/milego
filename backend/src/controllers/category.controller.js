import { CategoryService } from '../services/category.service.js';
import { success, created } from '../utils/response.js';

const categoryService = new CategoryService();

export class CategoryController {
  async list(req, res, next) {
    try {
      const categories = await categoryService.list(req.tenant.storeId);
      return success(res, categories);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Categoría no encontrada' } });
      }
      return success(res, category);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.validated, store_id: req.tenant.storeId };
      const category = await categoryService.create(data);
      return created(res, category);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const category = await categoryService.update(req.params.id, req.validated);
      return success(res, category);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
