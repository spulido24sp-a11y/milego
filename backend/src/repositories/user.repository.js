import db from '../config/database.js';

export class UserRepository {
  async findByEmail(email) {
    return db('users')
      .join('roles', 'users.role_id', 'roles.id')
      .join('role_permissions', 'roles.id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where({ 'users.email': email, 'users.deleted_at': null })
      .select('users.*', db.raw('array_agg(permissions.slug) as permissions'))
      .groupBy('users.id')
      .first();
  }

  async findById(id) {
    return db('users')
      .join('roles', 'users.role_id', 'roles.id')
      .join('role_permissions', 'roles.id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where({ 'users.id': id, 'users.deleted_at': null })
      .select('users.*', db.raw('array_agg(permissions.slug) as permissions'))
      .groupBy('users.id')
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
