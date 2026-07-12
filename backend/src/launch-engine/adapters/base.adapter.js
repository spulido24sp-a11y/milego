export class BaseAdapter {
  /**
   * Translates provider raw data to standard MIleGo Internal Contract
   * @param {Object} rawData 
   * @returns {Object} Normalized data contract
   */
  normalize(rawData) {
    throw new Error('normalize method must be implemented');
  }
}
