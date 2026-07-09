import { ProductService } from '../services/product.service.js';
import { success, paginated, created } from '../utils/response.js';

const productService = new ProductService();

export class ProductController {
  async list(req, res, next) {
    try {
      const { page = 1, per_page = 20, status, category_id } = req.query;
      const result = await productService.list({
        tenant: req.tenant,
        status,
        categoryId: category_id ? parseInt(category_id, 10) : undefined,
        page: parseInt(page, 10),
        perPage: parseInt(per_page, 10),
      });
      return paginated(res, result.products, page, per_page, result.total);
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const product = await productService.getBySlug(req.params.slug, req.tenant.storeId);
      if (!product) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });
      }
      return success(res, product);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);
      if (!product || product.store_id !== req.tenant.storeId) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });
      }
      return success(res, product);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.validated, store_id: req.tenant.storeId };
      const product = await productService.create(data);
      return created(res, product);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const product = await productService.update(req.params.id, req.validated);
      return success(res, product);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
