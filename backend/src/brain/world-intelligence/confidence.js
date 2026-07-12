export class ConfidenceEngine {
  /**
   * Evaluates compound confidence level across multiple dimensions.
   * @param {Object} product Standard normalized product data
   * @returns {Object} Composite scores and threshold decision
   */
  evaluateConfidence(product) {
    const wholesale = parseFloat(product.supplier_info?.wholesale_price || 0);
    const retail = parseFloat(product.supplier_info?.suggested_retail_price || 0);
    const imagesCount = product.images?.length || 0;
    const variantsCount = product.variants?.length || 0;

    let productScore = 50;
    let offerScore = 50;
    let competitionScore = 70; // Mock baseline
    let dataQualityScore = 50;

    // 1. Data Quality Checks
    if (imagesCount >= 3) dataQualityScore += 30;
    else if (imagesCount > 0) dataQualityScore += 15;

    if (variantsCount >= 2) dataQualityScore += 20;

    // 2. Offer & Pricing Margin Checks
    if (retail > 0) {
      const margin = ((retail - wholesale) / retail) * 100;
      if (margin >= 60) offerScore += 45;
      else if (margin >= 45) offerScore += 35;
      else if (margin >= 40) offerScore += 20;
      else offerScore -= 20; // Thin margin penalty
    }

    // 3. Product DNA Completeness Checks
    if (product.name?.trim()) productScore += 20;
    if (product.description?.trim()) productScore += 20;
    if (product.supplier_info?.weight) productScore += 10;

    // Compound average
    const totalScore = Math.round((productScore + offerScore + competitionScore + dataQualityScore) / 4);

    return {
      score: totalScore,
      productScore,
      offerScore,
      competitionScore,
      dataQualityScore,
      passesThreshold: totalScore >= 70,
      reasoning: totalScore >= 70
        ? 'El nivel de confianza comercial supera el umbral mínimo del 70%.'
        : `Nivel de confianza insuficiente (${totalScore}%). Se requiere completar imágenes, variantes o mejorar el margen.`
    };
  }
}
