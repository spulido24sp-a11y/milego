import { SettingsService } from '../services/settings.service.js';
import { success } from '../utils/response.js';

const settingsService = new SettingsService();

export class ConfigController {
  async getPublicConfig(req, res, next) {
    try {
      const config = await settingsService.getPublicConfig(req.tenant.storeId);
      return success(res, config);
    } catch (err) {
      next(err);
    }
  }
}
