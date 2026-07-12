export class ContentFactory {
  /**
   * Generates promotional copywriting hooks for Meta/TikTok.
   * @param {Object} product 
   * @returns {string[]} Hooks list
   */
  generateHooks(product) {
    return [
      `¡Adquiere el nuevo ${product.name} al mejor precio!`,
      `Paga en efectivo al recibir en tu casa en cualquier parte de Colombia.`,
      `Garantía de calidad garantizada. Unidades limitadas.`
    ];
  }
}
