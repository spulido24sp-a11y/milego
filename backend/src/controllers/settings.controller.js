import { SettingsService } from '../services/settings.service.js';
import { success, created, noContent } from '../utils/response.js';

const settingsService = new SettingsService();

export class SettingsController {
  async getAll(req, res, next) {
    try {
      const storeId = req.tenant.storeId;
      const grouped = await settingsService.getAll(storeId);
      return success(res, grouped);
    } catch (err) { next(err); }
  }

  async getGrouped(req, res, next) {
    try {
      const storeId = req.tenant.storeId;
      const grouped = await settingsService.getGrouped(storeId);
      return success(res, grouped);
    } catch (err) { next(err); }
  }

  async upsert(req, res, next) {
    try {
      const storeId = req.tenant.storeId;
      const { key, value, group_name, type, is_public } = req.body;
      const serializedValue = JSON.stringify(value);
      await settingsService.upsert(storeId, key, serializedValue, group_name, type, is_public);
      return created(res, { key });
    } catch (err) { next(err); }
  }

  async bulkUpsert(req, res, next) {
    try {
      const storeId = req.tenant.storeId;
      const { settings } = req.body;
      if (!Array.isArray(settings)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'settings must be an array' } });
      }
      const serialized = settings.map(s => ({
        ...s,
        value: JSON.stringify(s.value),
      }));
      await settingsService.bulkUpsert(storeId, serialized);
      return success(res, { count: settings.length });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const storeId = req.tenant.storeId;
      const deleted = await settingsService.remove(storeId, req.params.key);
      if (!deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Setting not found' } });
      }
      return noContent(res);
    } catch (err) { next(err); }
  }

  async getPublicConfig(req, res, next) {
    try {
      const storeId = req.tenant?.storeId || 1;
      const config = await settingsService.getPublicConfig(storeId);
      return success(res, config);
    } catch (err) { next(err); }
  }
}
