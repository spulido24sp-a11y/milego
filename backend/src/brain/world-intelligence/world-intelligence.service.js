import { KnowledgeGraphService } from './graph.js';
import { ConfidenceEngine } from './confidence.js';
import { StrategyEngine } from './strategy.js';
import { OpportunityHunter } from './hunter.js';
import { ExperimentEngine } from './experiments.js';
import { RiskEngine } from './risk.js';
import { LearningLoop } from './learning-loop.js';

export class WorldIntelligenceService {
  constructor() {
    this.graph = new KnowledgeGraphService();
    this.confidence = new ConfidenceEngine();
    this.strategy = new StrategyEngine();
    this.hunter = new OpportunityHunter();
    this.experiments = new ExperimentEngine();
    this.risk = new RiskEngine();
    this.learningLoop = new LearningLoop();
  }

  /**
   * Evaluates a product completely using the integrated World Intelligence ecosystem.
   * @param {Object} product 
   * @returns {Promise<Object>} The launch decision analysis profile
   */
  async evaluateProduct(product) {
    // 1. Evaluate risk profile
    const riskProfile = this.risk.evaluateRisk(product);

    // 2. Evaluate composite confidence scores
    const confidenceProfile = this.confidence.evaluateConfidence(product);

    // 3. Generate commercial strategies
    const strategyProfile = this.strategy.generateStrategy(product);

    // 4. Trace relationships in Knowledge Graph
    const productNode = await this.graph.findOrCreateNode('product', product.name);
    const painNode = await this.graph.findOrCreateNode('pain', 'Falta de eficiencia logistica');
    await this.graph.linkNodes(productNode.id, painNode.id, 'solves', { success: true });

    return {
      decision: confidenceProfile.passesThreshold ? 'launch' : 'need_info',
      confidence: confidenceProfile.score,
      explanation: [
        confidenceProfile.reasoning,
        `Nivel de riesgo estimado: ${riskProfile.level}.`
      ],
      scores: {
        product: confidenceProfile.productScore,
        offer: confidenceProfile.offerScore,
        competition: confidenceProfile.competitionScore,
        data_quality: confidenceProfile.dataQualityScore,
        risk: riskProfile.score
      },
      strategy: strategyProfile,
      nodes: {
        product_node_id: productNode.id,
        pain_node_id: painNode.id
      }
    };
  }
}
