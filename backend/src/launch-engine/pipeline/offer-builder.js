export class OfferBuilder {
  /**
   * Automatically designs bundles, margins, and target marketing KPIs.
   * @param {Object} enrichedData 
   * @returns {Object} Product data containing calculated offer structure
   */
  buildOffer(enrichedData) {
    const wholesale = enrichedData.supplier_info?.wholesale_price || 0;
    const retail = enrichedData.supplier_info?.suggested_retail_price || 0;

    // Calculations
    const profitPerUnit = retail - wholesale;
    const combo2xPrice = Math.round(retail * 2 * 0.85); // 15% discount
    const combo3xPrice = Math.round(retail * 3 * 0.78); // 22% discount

    // Target KPIs
    const maxCpa = Math.round(profitPerUnit * 0.4); // Target CPA (40% of unit margin)
    const minRoas = profitPerUnit > 0 ? parseFloat((retail / profitPerUnit).toFixed(2)) : 1.5;

    const offer = {
      price_cost: wholesale,
      price_unit: retail,
      combo_2x: {
        price: combo2xPrice,
        discount_percentage: 15,
        estimated_aov: combo2xPrice
      },
      combo_3x: {
        price: combo3xPrice,
        discount_percentage: 22,
        estimated_aov: combo3xPrice
      },
      upsell_recommendation: {
        name: "Garantía Extendida de 1 Año",
        price: 9900
      },
      marketing_kpis: {
        target_cpa: maxCpa,
        min_acceptable_roas: minRoas
      }
    };

    return {
      ...enrichedData,
      offer_structure: offer
    };
  }
}
