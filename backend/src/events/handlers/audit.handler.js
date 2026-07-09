import { AuditRepository } from '../../repositories/audit.repository.js';

const repo = new AuditRepository();

export async function auditHandler(eventData, meta) {
  await repo.create({
    user_id: meta.userId || null,
    action: `${meta.entityType}.${meta.action}`,
    entity_type: meta.entityType,
    entity_id: meta.entityId,
    old_values: eventData.oldValues ? JSON.stringify(eventData.oldValues) : null,
    new_values: eventData.newValues ? JSON.stringify(eventData.newValues) : null,
    ip_address: meta.ip,
    user_agent: meta.userAgent,
  });
}