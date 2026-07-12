import db from '../config/database.js';
import { createHash } from 'crypto';

export class AICacheService {
  /**
   * Generates a unique SHA-256 signature key for cache queries.
   */
  generateHash({ provider, model, prompt, temperature, promptVersion, schemaVersion }) {
    const payload = `${provider}|${model}|${prompt}|${temperature}|${promptVersion}|${schemaVersion}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Resolves a cached response from the database.
   * @param {string} hash 
   * @returns {Promise<Object|null>} Cached response payload
   */
  async get(hash) {
    const cached = await db('ai_cache')
      .where({ hash })
      .where((builder) => {
        builder.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
      })
      .first();

    if (cached) {
      // Increment cache hit count (RC-2 Phase 2)
      await db('ai_cache').where({ hash }).increment('cache_hits', 1);
      return cached;
    }
    return null;
  }

  /**
   * Persists a successful AI query response in cache.
   */
  async set({ hash, provider, model, promptVersion, schemaVersion, response, tokensIn, tokensOut, latency, cost, ttlHours = 72 }) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const [inserted] = await db('ai_cache').insert({
      hash,
      provider,
      model,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      response: typeof response === 'string' ? JSON.parse(response) : response,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency,
      cost,
      expires_at: expiresAt
    }).returning('*');

    return inserted;
  }
}
