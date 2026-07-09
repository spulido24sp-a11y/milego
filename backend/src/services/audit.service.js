import { AuditRepository } from '../repositories/audit.repository.js';

const repo = new AuditRepository();

export class AuditService {
  async log(userId, action, entityType, entityId, oldValues, newValues, ip, userAgent) {
    return repo.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ip,
      user_agent: userAgent,
    });
  }

  async list(params) {
    return repo.findAll(params);
  }
}