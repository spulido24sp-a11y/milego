export class MemoryScoreManager {
  /**
   * Computes dynamic memory retention scores incorporating usage and age decay factors.
   * @param {Object} edge Graph relation record
   * @returns {number} Score (1-100)
   */
  calculateMemoryScore(edge) {
    const timesUsed = edge.times_used || 0;
    if (timesUsed === 0) return 50;

    const successRate = (edge.times_success || 0) / timesUsed;
    const failurePenalty = (edge.times_failed || 0) * 10;
    
    // Success rate contributes up to 50 points
    let score = Math.round(50 + (successRate * 50) - failurePenalty);
    
    // Decay simulation based on days since updated
    const daysSinceUpdated = (Date.now() - new Date(edge.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.round(daysSinceUpdated * (1 - parseFloat(edge.decay_factor || 0.95)) * 10);
    
    score = Math.max(score - decay, 1);
    return Math.min(score, 100);
  }
}
