import { AuditService } from '../services/audit.service.js';
import { paginated } from '../utils/response.js';

const auditService = new AuditService();

export class AuditController {
  async list(req, res, next) {
    try {
      const { page = 1, per_page = 50, entity_type } = req.query;
      const result = await auditService.list({
        tenantId: req.tenant.storeId,
        entityType: entity_type,
        page: parseInt(page, 10),
        perPage: parseInt(per_page, 10),
      });
      return paginated(res, result.logs, page, per_page, result.total);
    } catch (err) {
      next(err);
    }
  }
}
