import { KnowledgeGraphService } from './graph.js';

const graph = new KnowledgeGraphService();

export class LearningLoop {
  /**
   * Translates real-world commerce metrics back to reinforce Knowledge Graph edges.
   * @param {string} productName 
   * @param {string} hookValue 
   * @param {number} ctr 
   * @param {number} roas 
   * @returns {Promise<Object>} Updated graph edge relationship
   */
  async recordSuccess(productName, hookValue, ctr, roas) {
    // 1. Locate/create product node
    const productNode = await graph.findOrCreateNode('product', productName);
    
    // 2. Locate/create hook node
    const hookNode = await graph.findOrCreateNode('hook', hookValue);

    // 3. Link them with positive metrics feedback
    const isSuccess = roas >= 2.0 && ctr >= 1.5;
    
    const edge = await graph.linkNodes(productNode.id, hookNode.id, 'converts_with', {
      success: isSuccess,
      ctr,
      roas
    });

    return edge;
  }
}
