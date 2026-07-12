import { SettingsRepository } from '../repositories/settings.repository.js';

const repo = new SettingsRepository();

export class SettingsService {
  async getPublicConfig(storeId) {
    return repo.getPublicSettings(storeId);
  }

  async getAll(storeId) {
    return repo.getAll(storeId);
  }

  async getGrouped(storeId) {
    return repo.getGrouped(storeId);
  }

  async upsert(storeId, key, value, groupName, type, isPublic) {
    return repo.upsert(storeId, key, value, groupName, type, isPublic);
  }

  async bulkUpsert(storeId, entries) {
    for (const entry of entries) {
      await repo.upsert(
        storeId,
        entry.key,
        entry.value,
        entry.group_name || null,
        entry.type || 'string',
        entry.is_public ?? false,
      );
    }
  }

  async remove(storeId, key) {
    const existing = await repo.getByKey(storeId, key);
    if (!existing) return false;
    await repo.remove(storeId, key);
    return true;
  }
}
