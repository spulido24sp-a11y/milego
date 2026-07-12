import { describe, it, expect } from 'vitest';
import { WorldIntelligenceService } from '../brain/world-intelligence/world-intelligence.service.js';
import { KnowledgeGraphService } from '../brain/world-intelligence/graph.js';
import { ExperimentEngine } from '../brain/world-intelligence/experiments.js';
import { ConfidenceEngine } from '../brain/world-intelligence/confidence.js';
import { StrategyEngine } from '../brain/world-intelligence/strategy.js';
import { RiskEngine } from '../brain/world-intelligence/risk.js';
import { MemoryScoreManager } from '../brain/world-intelligence/memory.js';
import { OpportunityHunter } from '../brain/world-intelligence/hunter.js';
import { LearningLoop } from '../brain/world-intelligence/learning-loop.js';
import db from '../config/database.js';

const service = new WorldIntelligenceService();
const graph = new KnowledgeGraphService();
const experiments = new ExperimentEngine();
const confidence = new ConfidenceEngine();
const strategy = new StrategyEngine();
const risk = new RiskEngine();
const memory = new MemoryScoreManager();
const hunter = new OpportunityHunter();
const learningLoop = new LearningLoop();

describe('Sprint 5 - LIAM World Intelligence Engine Integration Tests', () => {

  const testProduct = {
    name: 'Pistola Masajeadora Cervical',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    variants: [{ name: 'Negro' }, { name: 'Gris' }],
    supplier_info: {
      wholesale_price: 35000,
      suggested_retail_price: 99900,
      stock_available: 200,
      weight: 1.2
    }
  };

  it('should findOrCreate nodes and link them in the Knowledge Graph', async () => {
    const prodNode = await graph.findOrCreateNode('product', 'Pistola Masajeadora');
    const painNode = await graph.findOrCreateNode('pain', 'Dolor muscular cuello');

    expect(prodNode.id).toBeDefined();
    expect(painNode.id).toBeDefined();

    const edge = await graph.linkNodes(prodNode.id, painNode.id, 'solves', { success: true, ctr: 2.5, roas: 3.2 });
    expect(edge.source_node_id).toBe(prodNode.id);
    expect(edge.target_node_id).toBe(painNode.id);
    expect(edge.times_used).toBeGreaterThanOrEqual(1);
    expect(parseFloat(edge.avg_roas)).toBe(3.2);
  });

  it('should apply edge weight decay factor successfully', async () => {
    const prodNode = await graph.findOrCreateNode('product', 'Decay Product');
    const hookNode = await graph.findOrCreateNode('hook', 'Decay Hook');
    const edge = await graph.linkNodes(prodNode.id, hookNode.id, 'converts_with', { success: true });
    
    // Artificially change decay_factor to 0.80 and memory_score to 100
    await db('knowledge_graph_edges')
      .where({ id: edge.id })
      .update({ decay_factor: 0.80, memory_score: 100 });

    const decayedCount = await graph.decayEdges();
    expect(decayedCount).toBeGreaterThanOrEqual(1);

    const updated = await db('knowledge_graph_edges').where({ id: edge.id }).first();
    expect(updated.memory_score).toBe(80); // 100 * 0.80
  });

  it('should record impressions/conversions and crown A/B experiment winner', async () => {
    // Clear and insert mock product
    const [p] = await db('products').insert({
      store_id: 1,
      name: 'Experiment Product',
      slug: 'exp-product-' + Date.now(),
      price: 49900
    }).returning('*');

    const exp = await experiments.createExperiment(
      p.id,
      'hook',
      'El hook A convierte mas que el hook B',
      'Hook A: Adios dolores',
      'Hook B: Compra ya'
    );

    expect(exp.id).toBeDefined();
    expect(exp.status).toBe('active');

    // Simulate 60 impressions for variation A and 40 for variation B (total 100)
    for (let i = 0; i < 60; i++) {
      await experiments.recordImpression(exp.id, 'A');
    }
    for (let i = 0; i < 40; i++) {
      await experiments.recordImpression(exp.id, 'B');
    }

    // variation A converts 6 times, B converts 1 time
    for (let i = 0; i < 6; i++) {
      await experiments.recordConversion(exp.id, 'A');
    }
    await experiments.recordConversion(exp.id, 'B');

    // Winner check: variation A has 10% CR, variation B has 2.5% CR
    const completedExp = await db('ab_experiments').where({ id: exp.id }).first();
    expect(completedExp.status).toBe('completed');
    expect(completedExp.winner).toBe('A');
  });

  it('should evaluate Confidence and return passesThreshold = true for healthy inputs', () => {
    const evaluation = confidence.evaluateConfidence(testProduct);
    expect(evaluation.passesThreshold).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(70);
  });

  it('should evaluate Confidence and return passesThreshold = false if scores are low', () => {
    const badProduct = {
      ...testProduct,
      images: [], // 0 images
      supplier_info: {
        ...testProduct.supplier_info,
        wholesale_price: 90000,
        suggested_retail_price: 99900 // thin margin < 10%
      }
    };
    const evaluation = confidence.evaluateConfidence(badProduct);
    expect(evaluation.passesThreshold).toBe(false);
    expect(evaluation.score).toBeLessThan(70);
  });

  it('should generate suggested strategies and risk profiles', () => {
    const strat = strategy.generateStrategy(testProduct);
    expect(strat.bundle).toBe('combo_x2');
    expect(strat.minimum_roas).toBe(2.2);

    const r = risk.evaluateRisk(testProduct);
    expect(r.level).toBe('low');
  });

  it('should calculate memory scores based on usage metrics', () => {
    const mockEdge = {
      times_used: 10,
      times_success: 8,
      times_failed: 2,
      updated_at: new Date()
    };
    const score = memory.calculateMemoryScore(mockEdge);
    expect(score).toBe(70); // 50 + (0.8 * 50) - (2 * 10) = 70
  });

  it('should hunt and register qualified opportunities in PostgreSQL', async () => {
    await db('market_opportunities').del();
    
    const opps = await hunter.huntOpportunities('mock');
    expect(opps).toHaveLength(2); // Cervical pillow and Massage Gun margins >= 40
    expect(opps[0].hunter_decision).toBe('qualified');
  });

  it('should update knowledge graph metrics inside LearningLoop', async () => {
    const edge = await learningLoop.recordSuccess('Product Loop', 'Hook Loop', 2.0, 3.4);
    expect(edge.times_used).toBeGreaterThanOrEqual(1);
    expect(parseFloat(edge.avg_roas)).toBe(3.4);
  });

  it('should completely evaluate a product via the coordinated WorldIntelligenceService', async () => {
    const evaluation = await service.evaluateProduct(testProduct);
    expect(evaluation.decision).toBe('launch');
    expect(evaluation.scores.risk).toBe(20);
    expect(evaluation.strategy.bundle).toBe('combo_x2');
  });
});
