import db from '../config/database.js';

export class AuditRepository {
  async create(data) {
    const [log] = await db('audit_logs').insert(data).returning('*');
    return log;
  }

  async findAll({ tenantId, entityType, page = 1, perPage = 50 }) {
    let query = db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .select('audit_logs.*', 'users.name as user_name', 'users.email as user_email');

    if (!tenantId) return { logs: [], total: 0 };

    query = query.where('audit_logs.store_id', tenantId);

    if (entityType) query = query.where('audit_logs.entity_type', entityType);

    const total = await query.clone().clearSelect().count('* as count').first();
    const logs = await query
      .orderBy('audit_logs.created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage);

    return { logs, total: parseInt(total.count, 10) };
  }
}