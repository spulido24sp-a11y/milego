import db from '../config/database.js';

export class SettingsRepository {
  async getPublicSettings(storeId) {
    const rows = await db('settings')
      .where({ store_id: storeId, is_public: true })
      .select('key', 'value', 'type');

    const result = {};
    for (const row of rows) {
      const keys = row.key.split('.');
      let current = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = row.value;
    }
    return result;
  }

  async getAll(storeId) {
    return db('settings').where({ store_id: storeId }).select('*');
  }

  async upsert(storeId, key, value, groupName, type, isPublic) {
    const existing = await db('settings').where({ store_id: storeId, key }).first();
    if (existing) {
      await db('settings').where({ id: existing.id }).update({ value, updated_at: db.fn.now() });
    } else {
      await db('settings').insert({
        store_id: storeId, key, value, group_name: groupName, type, is_public: isPublic,
      });
    }
  }
}
