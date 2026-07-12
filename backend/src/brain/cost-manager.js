import db from '../config/database.js';

export class CostManager {
  /**
   * Log LLM request details, estimate costs, and persist into database.
   * @param {Object} data 
   * @returns {Promise<Object>} Inserted log record
   */
  async logRequest({ provider, model, promptTokens, completionTokens, durationMs, cacheHit, promptTemplate }) {
    // Standard mock pricing formula:
    // Prompt token cost = $0.000015 | Completion token cost = $0.00002
    const promptTokensCount = promptTokens || 150;
    const completionTokensCount = completionTokens || 250;
    const costUsd = (promptTokensCount * 0.000015) + (completionTokensCount * 0.00002);

    const [inserted] = await db('ai_requests_log').insert({
      provider,
      model,
      prompt_tokens: promptTokensCount,
      completion_tokens: completionTokensCount,
      cost_usd: parseFloat(costUsd.toFixed(6)),
      duration_ms: durationMs || 300,
      cache_hit: cacheHit || false,
      prompt_template: promptTemplate || 'general'
    }).returning('*');

    return inserted;
  }
}
