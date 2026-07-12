export class RulesEngine {
  /**
   * Evaluates if product meets strict commercial constraints.
   * @param {Object} product 
   * @returns {boolean} True if passes, throws commercial rules error otherwise
   */
  validateRules(product) {
    const cost = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);

    if (retail <= 0) {
      throw new Error('Regla comercial rota: El precio de venta sugerido debe ser mayor que 0');
    }

    if (retail < cost) {
      throw new Error('Regla comercial rota: El precio sugerido de venta es inferior al costo de adquisición');
    }

    // Profit margin check (must be >= 40%)
    const margin = ((retail - cost) / retail) * 100;
    if (margin < 40) {
      throw new Error(`Regla comercial rota: El margen de beneficio (${margin.toFixed(1)}%) está por debajo del límite mínimo permitido del 40%`);
    }

    return true;
  }
}
