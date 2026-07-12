export class ProductAnalyzer {
  /**
   * Generates a basic product quality score from data parameters.
   * @param {Object} product 
   * @returns {number} Score (1-100)
   */
  calculateProductScore(product) {
    const cost = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);
    if (retail <= 0) return 0;
    
    const margin = ((retail - cost) / retail) * 100;
    let score = 50;

    if (margin >= 60) score += 25;
    else if (margin >= 40) score += 15;

    if (product.supplier_info?.stock_available > 100) score += 15;
    else if (product.supplier_info?.stock_available > 20) score += 10;

    return Math.min(score, 100);
  }
}
