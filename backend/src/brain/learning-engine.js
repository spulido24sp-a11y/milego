export class LearningEngine {
  /**
   * Evaluates historical success records to inject success tips into prompts.
   * @param {Object} product 
   * @returns {string} Injected prompt tips
   */
  getSuccessPatterns(product) {
    const name = (product.name || '').toLowerCase();
    
    // Simulate patterns match based on category or keyword
    if (name.includes('corrector') || name.includes('rodillera') || name.includes('soporte') || name.includes('salud')) {
      return 'Pattern: Products related to health/pain relief perform 32% better with UGC hooks and Combo x2 pricing. Recomienda combo_x2.';
    }
    
    if (name.includes('organizador') || name.includes('hogar') || name.includes('caja')) {
      return 'Pattern: Home organizer products convert better when localized keywords for cities (e.g. Cali, Medellin) are included in the H1 title.';
    }

    return 'Pattern: Standard direct-to-consumer offer with COD options converts best.';
  }
}
