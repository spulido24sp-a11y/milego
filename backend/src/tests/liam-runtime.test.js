import { describe, it, expect, beforeAll } from 'vitest';
import { LIAMRuntime } from '../brain/liam-runtime.js';
import { LaunchStateMachine } from '../brain/state-machine.js';
import { ToolRegistry, SyncDropiTool, UpdateBlueprintTool, GenerateCopyTool } from '../brain/tools/tool-registry.js';
import db from '../config/database.js';

const runtime = new LIAMRuntime();
const stateMachine = new LaunchStateMachine();

describe('LIAM Runtime v1 — Cognitive Agent Tests', () => {

  beforeAll(async () => {
    await db('liam_event_memory').del();
    await db('liam_memory').del();
  });

  // ──────────────────────────────────────────────────────────────
  // 1. Planner Heurístico determinista (sin LLM)
  // ──────────────────────────────────────────────────────────────
  it('should resolve sync intent without calling an LLM', () => {
    const plan = runtime.plan('sincronizar inventario');
    expect(plan.intent).toBe('sync_inventory');
    expect(plan.steps[0].tool).toBe('SyncDropiTool');
  });

  it('should resolve copy intent to GenerateCopyTool', () => {
    const plan = runtime.plan('Haz el copy más emocional para el hook');
    expect(plan.intent).toBe('generate_copy');
    expect(plan.steps.some(s => s.tool === 'GenerateCopyTool')).toBe(true);
  });

  it('should resolve offer/price intent to UpdateBlueprintTool', () => {
    const plan = runtime.plan('cambia el precio de la oferta');
    expect(plan.intent).toBe('update_offer');
    expect(plan.steps[0].tool).toBe('UpdateBlueprintTool');
  });

  // ──────────────────────────────────────────────────────────────
  // 2. ToolRegistry — Registro y ejecución de herramientas
  // ──────────────────────────────────────────────────────────────
  it('should register and retrieve tools from ToolRegistry', () => {
    const registry = new ToolRegistry();
    registry.register(new GenerateCopyTool());
    registry.register(new SyncDropiTool());
    registry.register(new UpdateBlueprintTool());

    const descriptions = registry.getDescriptions();
    expect(descriptions).toHaveLength(3);
    expect(descriptions.map(d => d.name)).toContain('GenerateCopyTool');
  });

  it('should execute GenerateCopyTool and return structured output', async () => {
    const registry = new ToolRegistry();
    registry.register(new GenerateCopyTool());

    // Requires a real product to be in db, use mock args
    const result = await registry.execute('GenerateCopyTool', {
      productId: 'mock-product-id',
      section: 'hooks'
    });

    expect(result.success).toBe(true);
    expect(result.text).toContain('hooks');
  });

  it('should throw if executing an unregistered tool', async () => {
    const registry = new ToolRegistry();
    await expect(
      registry.execute('UnknownTool', {})
    ).rejects.toThrow('Herramienta no registrada en el runtime: UnknownTool');
  });

  // ──────────────────────────────────────────────────────────────
  // 3. State Machine — Transiciones válidas e inválidas
  // ──────────────────────────────────────────────────────────────
  it('should allow valid state transitions', () => {
    expect(stateMachine.canTransition('Draft', 'Imported')).toBe(true);
    expect(stateMachine.canTransition('Imported', 'Analyzed')).toBe(true);
    expect(stateMachine.canTransition('Analyzed', 'Reviewed')).toBe(true);
    expect(stateMachine.canTransition('Reviewed', 'Approved')).toBe(true);
    expect(stateMachine.canTransition('Approved', 'Published')).toBe(true);
  });

  it('should reject illegal state transitions (e.g. Draft → Approved)', () => {
    expect(stateMachine.canTransition('Draft', 'Approved')).toBe(false);
    expect(stateMachine.canTransition('Draft', 'Published')).toBe(false);
  });

  it('should throw on an explicit invalid transition', () => {
    expect(() => stateMachine.transition('Draft', 'Published')).toThrow(
      "Transición de estado no permitida"
    );
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Quality Evaluator (Fast)
  // ──────────────────────────────────────────────────────────────
  it('should return quality score above 80 for adequate result text', () => {
    const quality = runtime.evaluateQuality('Auriculares Bluetooth con envío gratis. Compra hoy y paga contra entrega.');
    expect(quality.overall).toBeGreaterThan(80);
    expect(quality.details).toHaveProperty('SEO');
    expect(quality.details).toHaveProperty('Persuasion');
    expect(quality.details).toHaveProperty('Grammar');
  });

  it('should flag deep evaluator needed for empty text', () => {
    const quality = runtime.evaluateQuality('');
    expect(quality.overall).toBeLessThan(85);
    expect(quality.isDeepEvaluatorUsed).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Event Memory — Trazabilidad de razonamiento
  // ──────────────────────────────────────────────────────────────
  it('should persist event memory entries after runtime execution', async () => {
    await runtime.processRequest({
      objective: 'Haz el copy más emocional',
      context: {}, // No productId — routes to GenerateCopyTool only, no DB product lookup
      storeId: 1,
      launchId: null
    });

    const events = await db('liam_event_memory').where({ store_id: 1 }).select('*');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some(e => e.event_type === 'TOOL_EXECUTED')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // 6. Long-Term Memory — Persistencia de conocimiento
  // ──────────────────────────────────────────────────────────────
  it('should persist and upsert memory entries in liam_memory table', async () => {
    await runtime.processRequest({
      objective: 'Los bundles X2 convierten mejor en Colombia',
      context: {},
      memoryType: 'knowledge',
      memoryKey: 'best_offer_type',
      storeId: 1,
      launchId: null
    });

    const memRow = await db('liam_memory')
      .where({ store_id: 1, type: 'knowledge', key: 'best_offer_type' })
      .first();

    expect(memRow).toBeDefined();
    expect(memRow.value).toContain('bundles');
  });
});
