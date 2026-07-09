import { SettingsRepository } from '../repositories/settings.repository.js';

const repo = new SettingsRepository();

export class SettingsService {
  async getPublicConfig(storeId) {
    return repo.getPublicSettings(storeId);
  }

  async getAll(storeId) {
    return repo.getAll(storeId);
  }

  async upsert(storeId, key, value, groupName, type, isPublic) {
    return repo.upsert(storeId, key, value, groupName, type, isPublic);
  }
}
