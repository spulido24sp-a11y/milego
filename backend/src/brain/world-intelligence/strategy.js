export class StrategyEngine {
  /**
   * Generates localized pricing and marketing strategies.
   * @param {Object} product Standard product payload
   * @returns {Object} Strategy blueprint
   */
  generateStrategy(product) {
    const wholesale = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);
    const margin = retail > 0 ? ((retail - wholesale) / retail) * 100 : 0;

    let suggestedBundle = 'descuento_unitario';
    let minRoasGoal = 1.5;
    let targetCpa = Math.round(retail * 0.35);

    if (margin >= 55) {
      suggestedBundle = 'combo_x2';
      minRoasGoal = 2.2;
    } else if (margin >= 45) {
      suggestedBundle = 'envio_gratis';
      minRoasGoal = 1.8;
    }

    return {
      price: retail,
      bundle: suggestedBundle,
      target_cpa: targetCpa,
      minimum_roas: minRoasGoal,
      explanations: [
        `Recomendamos ${suggestedBundle} porque maximiza el margen neto en base al costo de flete.`,
        `CPA objetivo fijado en $${targetCpa} COP para mantener un retorno de inversión saludable.`
      ]
    };
  }
}
