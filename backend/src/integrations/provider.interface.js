/**
 * Base abstract class defining the interface contract for all e-commerce integration providers.
 */
export class CommerceProvider {
  /**
   * Retrieves a product profile from the provider.
   * @param {string} externalId 
   * @returns {Promise<Object>} Normalized product payload
   */
  async getProduct(externalId) {
    throw new Error('Method getProduct() must be implemented');
  }

  /**
   * Synchronizes an existing product's stock, pricing, and variants.
   * @param {string} productId 
   * @param {Object} dbProduct 
   * @returns {Promise<Object>} Synchronized database record
   */
  async syncProduct(productId, dbProduct) {
    throw new Error('Method syncProduct() must be implemented');
  }

  /**
   * Verifies connectivity to the provider's API.
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }
}
