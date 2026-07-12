import { DecisionEngine } from './decision-engine.js';

const decisionEngine = new DecisionEngine();

export class BrainService {
  /**
   * Primary entry point for LIAM Brain analysis.
   * @param {Object} product Standard product payload
   * @param {string} [providerName='mock'] Target AI provider
   * @returns {Promise<Object>} Brain Analysis result
   */
  async analyzeProduct(product, providerName = 'mock') {
    if (!product) throw new Error('Se requiere un producto para iniciar el análisis');
    return decisionEngine.processDecision(product, providerName);
  }
}
