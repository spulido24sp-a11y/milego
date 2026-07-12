import db from '../../config/database.js';

export class KnowledgeGraphService {
  /**
   * Find or create a node inside the Knowledge Graph database.
   * @param {string} type 
   * @param {string} value 
   * @param {Object} [metadata={}] 
   * @returns {Promise<Object>} The node record
   */
  async findOrCreateNode(type, value, metadata = {}) {
    let node = await db('knowledge_graph_nodes')
      .where({ type, value })
      .first();

    if (!node) {
      const [inserted] = await db('knowledge_graph_nodes')
        .insert({
          type,
          value,
          metadata: JSON.stringify(metadata)
        })
        .returning('*');
      node = inserted;
    }

    return node;
  }

  /**
   * Connects two nodes with relationship edge or updates metrics.
   * @param {number} sourceNodeId 
   * @param {number} targetNodeId 
   * @param {string} relationship 
   * @param {Object} [metrics={}] 
   * @returns {Promise<Object>} Edge record
   */
  async linkNodes(sourceNodeId, targetNodeId, relationship, metrics = {}) {
    let edge = await db('knowledge_graph_edges')
      .where({ source_node_id: sourceNodeId, target_node_id: targetNodeId, relationship })
      .first();

    if (!edge) {
      const [inserted] = await db('knowledge_graph_edges')
        .insert({
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          relationship,
          times_used: 1,
          times_success: metrics.success ? 1 : 0,
          times_failed: metrics.success ? 0 : 1,
          avg_ctr: metrics.ctr || 0.00,
          avg_roas: metrics.roas || 0.00,
          memory_score: 50
        })
        .returning('*');
      edge = inserted;
    } else {
      const newTimes = edge.times_used + 1;
      const successCount = edge.times_success + (metrics.success ? 1 : 0);
      const failedCount = edge.times_failed + (metrics.success ? 0 : 1);
      
      const newCtr = parseFloat((((edge.avg_ctr * edge.times_used) + (metrics.ctr || 0)) / newTimes).toFixed(2));
      const newRoas = parseFloat((((edge.avg_roas * edge.times_used) + (metrics.roas || 0)) / newTimes).toFixed(2));
      
      // Memory Score updates: success increases memory, failed decreases it
      let newScore = edge.memory_score;
      if (metrics.success) newScore = Math.min(newScore + 5, 100);
      else newScore = Math.max(newScore - 5, 1);

      const [updated] = await db('knowledge_graph_edges')
        .where({ id: edge.id })
        .update({
          times_used: newTimes,
          times_success: successCount,
          times_failed: failedCount,
          avg_ctr: newCtr,
          avg_roas: newRoas,
          memory_score: newScore,
          updated_at: db.fn.now()
        })
        .returning('*');
      edge = updated;
    }

    return edge;
  }

  /**
   * Applies weight decay factor to old memory score edges.
   * @returns {Promise<number>} Number of decayed records
   */
  async decayEdges() {
    const edges = await db('knowledge_graph_edges').select('*');
    let updatedCount = 0;

    for (const edge of edges) {
      // Memory Score decay: memory_score = memory_score * decay_factor
      const newScore = Math.max(Math.round(edge.memory_score * parseFloat(edge.decay_factor)), 1);
      if (newScore !== edge.memory_score) {
        await db('knowledge_graph_edges')
          .where({ id: edge.id })
          .update({ memory_score: newScore });
        updatedCount++;
      }
    }

    return updatedCount;
  }
}
