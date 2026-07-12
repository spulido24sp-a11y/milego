export class RiskEngine {
  /**
   * Evaluates launch safety and risk index from logistics and competitor details.
   * @param {Object} product 
   * @returns {Object} Risk profile
   */
  evaluateRisk(product) {
    const weight = parseFloat(product.supplier_info?.weight || product.weight || 0);
    const cost = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);
    const margin = retail > 0 ? ((retail - cost) / retail) * 100 : 0;

    let riskScore = 20; // Low baseline
    const riskFactors = [];

    if (weight > 3.0) {
      riskScore += 30;
      riskFactors.push('El empaque supera los 3 kg de peso (riesgo de recargo logístico de flete).');
    }
    
    if (margin < 45) {
      riskScore += 25;
      riskFactors.push('El margen de ganancia comercial está por debajo del 45% (vulnerabilidad ante costo por adquisición alto).');
    }

    if (retail > 200000) {
      riskScore += 15;
      riskFactors.push('El precio sugerido es alto para COD contraentrega (mayor tasa de devoluciones/rechazos).');
    }

    return {
      score: Math.min(riskScore, 100),
      level: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      risk_factors: riskFactors
    };
  }
}
