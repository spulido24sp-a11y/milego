import db from '../config/database.js';

export class CategoryRepository {
  async findAll(tenantId) {
    return db('categories')
      .where({ 'categories.store_id': tenantId, 'categories.deleted_at': null })
      .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
      .select('categories.*', 'parent.name as parent_name')
      .orderBy('categories.sort_order');
  }

  async findById(id) {
    return db('categories').where({ id, deleted_at: null }).first();
  }

  async findBySlug(slug, tenantId) {
    return db('categories').where({ slug, store_id: tenantId, deleted_at: null }).first();
  }

  async create(data) {
    const [category] = await db('categories').insert(data).returning('*');
    return category;
  }

  async update(id, data) {
    data.updated_at = db.fn.now();
    const [category] = await db('categories').where({ id }).update(data).returning('*');
    return category;
  }

  async softDelete(id) {
    await db('categories').where({ id }).update({ deleted_at: db.fn.now() });
  }
}
