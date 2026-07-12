import { getProvider } from './provider-registry.js';
import { CostManager } from './cost-manager.js';
import { AICacheService } from './ai-cache.service.js';
import { PromptRegistryService } from './prompt-registry.service.js';
import { aiResponseSchema } from './schemas.js';
import db from '../config/database.js';

const costManager = new CostManager();
const cacheService = new AICacheService();
const registryService = new PromptRegistryService();

export class ProviderRouter {
  /**
   * Route prompt execution to the selected AI provider.
   * Incorporates Caching, Zod Schema Validation, Retry Policy and Token Quota checks.
   * @param {string} prompt 
   * @param {string} [providerName='mock'] 
   * @param {string} [promptTemplate='general']
   * @param {number} [storeId=1]
   * @returns {Promise<string>} Stringified JSON response validated by schema
   */
  async generateText(prompt, providerName = 'mock', promptTemplate = 'general', storeId = 1) {
    // Resolve dynamic routing: process.env.AI_PROVIDER overrides param except when 'mock' is explicitly requested
    let selected = providerName.toLowerCase();
    if (selected !== 'mock' && process.env.AI_PROVIDER) {
      selected = process.env.AI_PROVIDER.toLowerCase();
    }
    
    const provider = getProvider(selected);
    
    if (!provider) {
      throw new Error(`Proveedor de IA no soportado en enrutamiento: ${selected}`);
    }

    // 1. Quota Check (RC-4: Token Budget)
    const dailyLimit = 1.00; // $1.00 USD
    const monthlyLimit = 10.00; // $10.00 USD

    const [dailyCostRow] = await db('ai_usage')
      .where({ store_id: storeId })
      .where('created_at', '>=', db.raw("CURRENT_DATE"))
      .sum('cost as total_cost');
    
    const [monthlyCostRow] = await db('ai_usage')
      .where({ store_id: storeId })
      .where('created_at', '>=', db.raw("DATE_TRUNC('month', CURRENT_DATE)"))
      .sum('cost as total_cost');

    const dailyCost = parseFloat(dailyCostRow?.total_cost || '0');
    const monthlyCost = parseFloat(monthlyCostRow?.total_cost || '0');

    if (dailyCost >= dailyLimit) {
      throw new Error('Límite de presupuesto diario de IA excedido para esta tienda');
    }
    if (monthlyCost >= monthlyLimit) {
      throw new Error('Límite de presupuesto mensual de IA excedido para esta tienda');
    }

    // 2. Resolve Prompt Registry Configuration (RC-5)
    const promptDetails = await registryService.resolvePrompt(promptTemplate);

    // 3. Cache Query Check (RC-2)
    const hash = cacheService.generateHash({
      provider: selected,
      model: selected === 'mock' ? 'mock-model-v1' : `${selected}-standard-v2`,
      prompt,
      temperature: promptDetails.temperature,
      promptVersion: promptDetails.version,
      schemaVersion: promptDetails.schema_version
    });

    const cachedEntry = await cacheService.get(hash);
    if (cachedEntry) {
      // Log cache usage to ai_usage for budgeting
      await db('ai_usage').insert({
        store_id: storeId,
        provider: selected,
        model: cachedEntry.model,
        tokens_in: cachedEntry.tokens_in,
        tokens_out: cachedEntry.tokens_out,
        cost: 0, // Cached calls are free!
        cached: true,
        request_type: promptTemplate
      });

      return JSON.stringify(cachedEntry.response);
    }

    // 4. Execution & Retry Policy with backoff & Zod Validation (RC-1)
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 200; // ms
    let lastError = null;
    let responseText = '';
    const start = Date.now();

    while (attempts < maxAttempts) {
      try {
        responseText = await provider.generateText(prompt);

        // Run Zod JSON validation (RC-1)
        const parsed = JSON.parse(responseText);
        aiResponseSchema.parse(parsed); // Throws if fails format

        break; // Success!
      } catch (err) {
        lastError = err;
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        }
      }
    }

    if (attempts >= maxAttempts) {
      // Log failed request to db for operational monitoring (RC-3)
      await db('integration_requests_log').insert({
        provider: `ai-${selected}`,
        endpoint: `/generate/${promptTemplate}`,
        status: 500,
        latency_ms: Date.now() - start,
        retries: attempts - 1
      });

      throw new Error(`AI generation failed after ${maxAttempts} attempts. Error: ${lastError?.message}`);
    }

    const durationMs = Date.now() - start;
    const promptTokens = Math.round(prompt.length / 4);
    const completionTokens = Math.round(responseText.length / 4);
    
    // Calculate cost based on model/tokens
    const cost = selected === 'mock' ? 0 : (promptTokens + completionTokens) * 0.000015;

    // 5. Persist to cache and logs (RC-2 & RC-3)
    await cacheService.set({
      hash,
      provider: selected,
      model: selected === 'mock' ? 'mock-model-v1' : `${selected}-standard-v2`,
      promptVersion: promptDetails.version,
      schemaVersion: promptDetails.schema_version,
      response: responseText,
      tokensIn: promptTokens,
      tokensOut: completionTokens,
      latency: durationMs,
      cost
    });

    await db('ai_usage').insert({
      store_id: storeId,
      provider: selected,
      model: selected === 'mock' ? 'mock-model-v1' : `${selected}-standard-v2`,
      tokens_in: promptTokens,
      tokens_out: completionTokens,
      cost,
      cached: false,
      request_type: promptTemplate
    });

    // Backwards compatible audit logger
    await costManager.logRequest({
      provider: selected,
      model: selected === 'mock' ? 'mock-model-v1' : `${selected}-standard-v2`,
      promptTokens,
      completionTokens,
      durationMs,
      cacheHit: false,
      promptTemplate
    });

    return responseText;
  }
}
