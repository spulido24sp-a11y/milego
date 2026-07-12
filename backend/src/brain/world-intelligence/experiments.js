import db from '../../config/database.js';

export class ExperimentEngine {
  /**
   * Registers a new A/B Experiment with an initial hypothesis.
   * @param {number} productId 
   * @param {string} elementType 
   * @param {string} hypothesis 
   * @param {string} variationA 
   * @param {string} variationB 
   * @returns {Promise<Object>} The experiment record
   */
  async createExperiment(productId, elementType, hypothesis, variationA, variationB) {
    const [inserted] = await db('ab_experiments')
      .insert({
        product_id: productId,
        element_type: elementType,
        hypothesis,
        variation_a: variationA,
        variation_b: variationB,
        status: 'active'
      })
      .returning('*');
    return inserted;
  }

  /**
   * Logs a page view / impression event.
   * @param {number} experimentId 
   * @param {string} variation 'A' or 'B'
   */
  async recordImpression(experimentId, variation) {
    const field = variation.toLowerCase() === 'a' ? 'impressions_a' : 'impressions_b';
    await db('ab_experiments')
      .where({ id: experimentId })
      .increment(field, 1);
  }

  /**
   * Logs a successful purchase conversion.
   * @param {number} experimentId 
   * @param {string} variation 'A' or 'B'
   */
  async recordConversion(experimentId, variation) {
    const field = variation.toLowerCase() === 'a' ? 'conversions_a' : 'conversions_b';
    await db('ab_experiments')
      .where({ id: experimentId })
      .increment(field, 1);

    // Automatically re-evaluate if we have enough sample sizes
    await this.evaluateWinner(experimentId);
  }

  /**
   * Compares variations using simple CTR/conversion rates to find the winner.
   * @param {number} experimentId 
   * @returns {Promise<Object>} Updated experiment record
   */
  async evaluateWinner(experimentId) {
    const exp = await db('ab_experiments').where({ id: experimentId }).first();
    if (!exp || exp.status === 'completed') return exp;

    const totalImpressions = exp.impressions_a + exp.impressions_b;
    // We declare a winner if impressions exceed 100
    if (totalImpressions >= 100) {
      const rateA = exp.impressions_a > 0 ? (exp.conversions_a / exp.impressions_a) : 0;
      const rateB = exp.impressions_b > 0 ? (exp.conversions_b / exp.impressions_b) : 0;

      let winner = 'tie';
      if (rateA > rateB) winner = 'A';
      else if (rateB > rateA) winner = 'B';

      const [updated] = await db('ab_experiments')
        .where({ id: experimentId })
        .update({
          status: 'completed',
          winner,
        })
        .returning('*');
      
      return updated;
    }

    return exp;
  }
}
