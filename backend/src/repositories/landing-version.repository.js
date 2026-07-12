import db from '../config/database.js';

export class LandingVersionRepository {
  async getNextVersion(productId) {
    const latest = await db('liam_landing_versions')
      .where({ product_id: productId })
      .orderBy('version', 'desc')
      .first();
    return latest ? latest.version + 1 : 1;
  }

  async create(data) {
    const [version] = await db('liam_landing_versions').insert({
      product_id: data.product_id,
      version: data.version,
      landing_hash: data.landing_hash || null,
      theme_key: data.theme_key || null,
      cta_key: data.cta_key || null,
      bundle_key: data.bundle_key || null,
      block_order: data.block_order ? JSON.stringify(data.block_order) : null,
      decision_engine_version: data.decision_engine_version || null,
      conversion_compiler_version: data.conversion_compiler_version || null,
      prompt_version: data.prompt_version || null,
      learning_model_version: data.learning_model_version || null,
      cro_decision: data.cro_decision ? JSON.stringify(data.cro_decision) : null,
      prompts_used: data.prompts_used ? JSON.stringify(data.prompts_used) : null,
      created_by: data.created_by || 'manual',
      published_at: data.published_at || new Date(),
      published_by: data.published_by || null,
      rollback_from: data.rollback_from || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
    }).returning('*');
    return version;
  }

  async deactivateByProduct(productId) {
    await db('liam_landing_versions')
      .where({ product_id: productId, is_active: true })
      .update({ is_active: false });
  }

  async getActive(productId) {
    return db('liam_landing_versions')
      .where({ product_id: productId, is_active: true })
      .orderBy('version', 'desc')
      .first();
  }

  async getHistory(productId) {
    return db('liam_landing_versions')
      .where({ product_id: productId })
      .orderBy('version', 'desc');
  }
}
