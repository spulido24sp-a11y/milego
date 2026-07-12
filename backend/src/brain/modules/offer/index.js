export class OfferEngine {
  /**
   * Evaluates pricing margins to suggest bundles and AOV goals.
   * @param {Object} product 
   * @returns {Object} Suggested bundle strategy
   */
  suggestOfferStrategy(product) {
    const cost = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);

    const margin = retail > 0 ? ((retail - cost) / retail) * 100 : 0;

    return {
      recommendedOffer: margin >= 50 ? 'combo_x2' : 'discount',
      recommendedPrice: retail,
      profit_per_unit: retail - cost
    };
  }
}
