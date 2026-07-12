export class OpportunityHunter {
  /**
   * Simulates hunting or retrieving raw products based on keywords/sources.
   * @param {string} source 
   * @param {string} keyword 
   * @returns {Object} Raw product payload
   */
  hunt(source, keyword) {
    return {
      source,
      keyword,
      hunted_at: new Date(),
      status: 'success',
      raw_payload: {
        nombre: `Hunted ${keyword}`,
        sku: `HNT-${keyword.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        costo: 30000,
        precio_sugerido: 79900,
        stock: 120
      }
    };
  }
}
