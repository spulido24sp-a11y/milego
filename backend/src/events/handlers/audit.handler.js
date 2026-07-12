import { AuditRepository } from '../../repositories/audit.repository.js';
import db from '../../config/database.js';

const repo = new AuditRepository();

export async function auditHandler(eventData, meta) {
  if (meta.isReplay) {
    const recent = await db('audit_logs')
      .where({
        entity_type: meta.entityType,
        entity_id: meta.entityId,
        action: `${meta.entityType}.${meta.action}`,
      })
      .where('created_at', '>=', new Date(Date.now() - 5000))
      .first();
    if (recent) return;
  }

  if (!meta.entityType || !meta.entityId) {
    return;
  }

  await repo.create({
    user_id: meta.userId || null,
    store_id: meta.storeId,
    action: `${meta.entityType}.${meta.action}`,
    entity_type: meta.entityType,
    entity_id: meta.entityId,
    old_values: eventData.oldValues ? JSON.stringify(eventData.oldValues) : null,
    new_values: eventData.newValues ? JSON.stringify(eventData.newValues) : null,
    ip_address: meta.ip,
    user_agent: meta.userAgent,
  });
}