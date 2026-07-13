import db from '../config/database.js';

export class UserRepository {
  async findByEmail(email) {
    return db('users')
      .where({ 'users.email': email, 'users.deleted_at': null })
      .select('users.*', db.raw(`(
        SELECT COALESCE(array_agg(p.slug), ARRAY[]::text[])
        FROM "role_permissions" rp
        JOIN "permissions" p ON p.id = rp.permission_id
        WHERE rp.role_id = users.role_id
      ) as permissions`))
      .first();
  }

  async findById(id) {
    return db('users')
      .where({ 'users.id': id, 'users.deleted_at': null })
      .select('users.*', db.raw(`(
        SELECT COALESCE(array_agg(p.slug), ARRAY[]::text[])
        FROM "role_permissions" rp
        JOIN "permissions" p ON p.id = rp.permission_id
        WHERE rp.role_id = users.role_id
      ) as permissions`))
      .first();
  }

  async findAll({ tenant }) {
    return db('users')
      .where({ store_id: tenant.storeId, deleted_at: null })
      .select('id', 'uuid', 'name', 'email', 'is_active', 'created_at');
  }

  async create(data) {
    const [user] = await db('users').insert(data).returning('*');
    return user;
  }

  async update(id, data) {
    data.updated_at = db.fn.now();
    const [user] = await db('users').where({ id }).update(data).returning('*');
    return user;
  }

  async softDelete(id) {
    await db('users').where({ id }).update({ deleted_at: db.fn.now() });
  }
}
