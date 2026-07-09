import db from '../config/database.js';

export class ProductRepository {
  baseQuery(tenantId) {
    return db('products')
      .where({ 'products.store_id': tenantId, 'products.deleted_at': null })
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select(
        'products.*',
        'categories.name as category_name',
        'categories.slug as category_slug'
      );
  }

  async findAll({ tenant, status, categoryId, page = 1, perPage = 20 }) {
    let query = this.baseQuery(tenant.storeId);
    if (status) query = query.where('products.status', status);
    if (categoryId) query = query.where('products.category_id', categoryId);

    const [{ count }] = await db('products')
      .where({ store_id: tenant.storeId, deleted_at: null })
      .modify((qb) => {
        if (status) qb.where('status', status);
        if (categoryId) qb.where('category_id', categoryId);
      })
      .count({ count: 'id' });

    const products = await query
      .orderBy('products.created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage);

    return { products, total: parseInt(count, 10) };
  }

  async findBySlug(slug, tenantId) {
    const product = await this.baseQuery(tenantId)
      .where('products.slug', slug)
      .first();

    if (!product) return null;

    const images = await db('product_images')
      .where({ product_id: product.id })
      .orderBy('sort_order');

    const variants = await db('product_variants')
      .where({ product_id: product.id, is_active: true })
      .orderBy('sort_order');

    return { ...product, images, variants };
  }

  async findById(id) {
    return db('products').where({ id, deleted_at: null }).first();
  }

  async create(data) {
    const [product] = await db('products').insert(data).returning('*');
    return product;
  }

  async update(id, data) {
    data.updated_at = db.fn.now();
    const [product] = await db('products').where({ id }).update(data).returning('*');
    return product;
  }

  async softDelete(id) {
    await db('products').where({ id }).update({ deleted_at: db.fn.now() });
  }
}
