import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ProviderRouter } from '../brain/provider-router.js';
import { PromptRegistryService } from '../brain/prompt-registry.service.js';
import { MockProvider } from '../brain/providers/mock.provider.js';
import db from '../config/database.js';

const router = new ProviderRouter();
const registry = new PromptRegistryService();

describe('AI Runtime Hardening & Core Guardrails Tests', () => {

  beforeAll(async () => {
    // Clear databases
    await db('ai_cache').del();
    await db('ai_usage').del();
    await db('prompt_registry').del();
  });

  it('should successfully resolve prompt template details from Prompt Registry', async () => {
    const template = 'Analizar viabilidad comercial del bombillo {{name}}.';
    
    // Register versioned prompt in db
    await registry.registerPrompt({
      name: 'analyzer',
      version: '2.0.1',
      template,
      schemaVersion: '2.0-zod',
      temperature: 0.8,
      provider: 'mock'
    });

    const resolved = await registry.resolvePrompt('analyzer');
    expect(resolved.version).toBe('2.0.1');
    expect(resolved.template).toBe(template);
    expect(resolved.temperature).toBe(0.8);
    expect(resolved.schema_version).toBe('2.0-zod');
  });

  it('should retry automatically on Zod schema invalid format validation failures and then succeed', async () => {
    let callCount = 0;
    
    // Stub MockProvider to return invalid schema twice, then valid on third
    vi.spyOn(MockProvider.prototype, 'generateText').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return JSON.stringify({ marketScore: 'not-a-number' }); // Fails schema (marketScore must be number)
      }
      if (callCount === 2) {
        return 'not-even-json'; // Fails parse
      }
      return JSON.stringify({
        marketScore: 92,
        recommendedOffer: 'combo_x2',
        seo: { title: 'Valido', slug: 'valido', keywords: ['bombillo'] },
        recommendedHooks: ['Gancho 1']
      });
    });

    const res = await router.generateText('Dame detalles del producto', 'mock', 'analyzer', 1);
    
    expect(callCount).toBe(3); // Retried twice, succeeded on third
    const parsed = JSON.parse(res);
    expect(parsed.marketScore).toBe(92);
    
    vi.restoreAllMocks();
  });

  it('should perform intelligent caching matching exact version hashes', async () => {
    // Clean cache for store 20
    await db('ai_cache').del();
    await db('ai_usage').where({ store_id: 20 }).del();

    const promptText = 'Analiza auricular inalambrico';
    
    // Call 1: Cache Miss
    const res1 = await router.generateText(promptText, 'mock', 'analyzer', 20);
    
    const usageLogs1 = await db('ai_usage').where({ store_id: 20 });
    expect(usageLogs1).toHaveLength(1);
    expect(usageLogs1[0].cached).toBe(false);

    // Call 2: Cache Hit
    const res2 = await router.generateText(promptText, 'mock', 'analyzer', 20);
    expect(JSON.parse(res2)).toEqual(JSON.parse(res1));

    const usageLogs2 = await db('ai_usage').where({ store_id: 20 }).orderBy('created_at', 'desc');
    expect(usageLogs2).toHaveLength(2);
    expect(usageLogs2[0].cached).toBe(true);
    expect(parseFloat(usageLogs2[0].cost)).toBe(0); // Cache queries are free!
  });

  it('should block query executions if the store daily AI cost budget is exceeded', async () => {
    // Insert usage log simulation exceeding daily limit of $1.00 USD
    await db('ai_usage').insert({
      store_id: 2,
      provider: 'mock',
      model: 'mock-model-v1',
      tokens_in: 50000,
      tokens_out: 50000,
      cost: 1.50, // Exceeds $1.00 USD daily limit
      cached: false,
      request_type: 'analyzer'
    });

    // Attempting query for store 2 should throw budget limit exceeded error immediately
    await expect(
      router.generateText('Cualquier prompt', 'mock', 'analyzer', 2)
    ).rejects.toThrow('Límite de presupuesto diario de IA excedido para esta tienda');
  });
});
