/**
 * DropiIntelligenceService — LIAM's Dropi Supply Chain Brain
 *
 * Analyzes Dropi catalog products, evaluates supplier performance metrics (lead times, costs),
 * and proposes highly functional bundle offers to optimize unit margins and logistics.
 */
import db from '../config/database.js';

export class DropiIntelligenceService {
  constructor() {
    this.defaultShippingCost = 9500; // Average COD shipping cost in Colombia (COP)
    this.returnRateEstimate = 0.10;   // 10% average return rate for COD in Colombia
  }

  // ── Analyze suppliers and products viability ────────────────────────────
  async getSupplierViability(storeId = 1) {
    const products = await db('products')
      .where({ store_id: storeId, provider_id: 'dropi', status: 'active' })
      .select('id', 'name', 'price', 'cost_price', 'weight', 'stock', 'provider_product_id');

    const supplierProducts = await db('supplier_products as sp')
      .join('suppliers as s', 'sp.supplier_id', 's.id')
      .select('sp.product_id', 's.name as supplier_name', 'sp.cost_price as supplier_cost', 'sp.lead_time', 'sp.is_preferred');

    const analysis = [];

    for (const p of products) {
      const suppliers = supplierProducts.filter(s => s.product_id === p.id);
      const preferred = suppliers.find(s => s.is_preferred) || suppliers[0];

      const retailPrice = parseFloat(p.price || 0);
      const supplierCost = preferred ? parseFloat(preferred.supplier_cost || p.cost_price || 0) : parseFloat(p.cost_price || 0);
      const leadTime = preferred ? preferred.lead_time : 48; // Default 48h lead time

      // Calculation formula:
      // Gross margin = Retail Price - Supplier Cost - Shipping Cost
      // Net profit estimating 10% returns: Gross Margin - (Shipping Cost * returnRateEstimate * 2) - Transaction fees (approx 4%)
      const grossMarginVal = retailPrice - supplierCost - this.defaultShippingCost;
      const netProfitEst = grossMarginVal - (this.defaultShippingCost * this.returnRateEstimate * 2) - (retailPrice * 0.04);
      const marginPct = retailPrice > 0 ? Math.round((netProfitEst / retailPrice) * 100) : 0;

      // Ranking logistics & suppliers
      let logisticScore = 100;
      if (leadTime > 48) logisticScore -= 20;
      if (leadTime > 72) logisticScore -= 20;
      if (p.stock < 50) logisticScore -= 15;
      if (p.stock < 10) logisticScore -= 30;

      analysis.push({
        productId: p.id,
        name: p.name,
        retailPrice,
        cost: supplierCost,
        supplierName: preferred ? preferred.supplier_name : 'Proveedor Dropi General',
        leadTimeHours: leadTime,
        stock: p.stock,
        logisticScore,
        estimatedNetProfit: Math.round(netProfitEst),
        marginPercent: marginPct,
        recommendation: marginPct >= 40 && logisticScore >= 75 ? 'ESCALAR' : marginPct >= 25 ? 'TESTEAR' : 'MEJORAR_OFERTA'
      });
    }

    return analysis;
  }

  // ── Calculate and propose optimized combos (bundles) ─────────────────────
  async getOptimizedCombos(productId) {
    const product = await db('products').where({ id: productId }).first();
    if (!product) return null;

    const retail = parseFloat(product.price || 0);
    const cost = parseFloat(product.cost_price || 0);

    const comboX2Price = Math.round(retail * 1.62 / 100) * 100; // Approx 38% discount on 2nd unit
    const comboX3Price = Math.round(retail * 2.25 / 100) * 100; // 3rd unit almost free

    // Calculations for Combo X1
    const profitX1 = retail - cost - this.defaultShippingCost;
    const marginPctX1 = retail > 0 ? Math.round((profitX1 / retail) * 100) : 0;

    // Calculations for Combo X2
    // Shipping cost stays the same (approx $9.500 COP) because weight increments slightly but fits in single package
    const profitX2 = comboX2Price - (cost * 2) - this.defaultShippingCost;
    const marginPctX2 = comboX2Price > 0 ? Math.round((profitX2 / comboX2Price) * 100) : 0;

    // Calculations for Combo X3
    const profitX3 = comboX3Price - (cost * 3) - this.defaultShippingCost;
    const marginPctX3 = comboX3Price > 0 ? Math.round((profitX3 / comboX3Price) * 100) : 0;

    return {
      productId,
      name: product.name,
      baseRetail: retail,
      cost,
      combos: [
        {
          type: 'Unitario (x1)',
          retailPrice: retail,
          totalCost: cost,
          estimatedProfit: profitX1,
          marginPct: marginPctX1,
          adCpaLimit: Math.round(profitX1 * 0.6), // 60% of profit can go to Meta CPA
          roasTarget: 2.8
        },
        {
          type: 'Combo Combo (x2)',
          retailPrice: comboX2Price,
          totalCost: cost * 2,
          estimatedProfit: profitX2,
          marginPct: marginPctX2,
          adCpaLimit: Math.round(profitX2 * 0.6),
          roasTarget: 2.1,
          savingVsSingle: Math.round((retail * 2) - comboX2Price)
        },
        {
          type: 'Megapack Ahorro (x3)',
          retailPrice: comboX3Price,
          totalCost: cost * 3,
          estimatedProfit: profitX3,
          marginPct: marginPctX3,
          adCpaLimit: Math.round(profitX3 * 0.6),
          roasTarget: 1.8,
          savingVsSingle: Math.round((retail * 3) - comboX3Price)
        }
      ]
    };
  }

  // ── Build LIAM Dropi context string for prompt injection ─────────────────
  async buildLIAMContext(storeId = 1, productId = null) {
    const suppliers = await this.getSupplierViability(storeId);
    let comboStr = '';

    if (productId) {
      const combosInfo = await this.getOptimizedCombos(productId);
      if (combosInfo) {
        comboStr = `\nPROPUESTAS DE COMBOS COMERCIALES PARA ${combosInfo.name}:
${combosInfo.combos.map(c => `  - ${c.type}: Precio Sugerido=$${c.retailPrice.toLocaleString()} COP | Utilidad Est.=$${c.estimatedProfit.toLocaleString()} COP | Margen Neto=${c.marginPct}% | CPA Máx. Meta=$${c.adCpaLimit.toLocaleString()} COP`).join('\n')}`;
      }
    } else if (suppliers.length > 0) {
      // Get combos for the first product
      const combosInfo = await this.getOptimizedCombos(suppliers[0].productId);
      if (combosInfo) {
        comboStr = `\nPROPUESTAS DE COMBOS COMERCIALES PARA ${combosInfo.name}:
${combosInfo.combos.map(c => `  - ${c.type}: Precio Sugerido=$${c.retailPrice.toLocaleString()} COP | Utilidad Est.=$${c.estimatedProfit.toLocaleString()} COP | Margen Neto=${c.marginPct}%`).join('\n')}`;
      }
    }

    const supplierReport = suppliers.length > 0
      ? `=== REPORTE DE PROVEEDORES Y LOGÍSTICA DROPI ===
${suppliers.map((s, i) => `${i+1}. Producto: ${s.name}
   - Proveedor Preferido: ${s.supplierName}
   - Tiempo de Despacho (Lead Time): ${s.leadTimeHours} horas
   - Viabilidad Logística: ${s.logisticScore}/100 | Stock Disponible: ${s.stock}
   - Margen Neto Unitario: ${s.marginPercent}% | Utilidad Est.: $${s.estimatedNetProfit.toLocaleString()} COP
   - Recomendación LIAM: ${s.recommendation}`).join('\n\n')}`
      : '=== REPORTE DROPI ===\nNo hay productos importados de Dropi para auditar.';

    return `${supplierReport}\n${comboStr}\n=== FIN REPORTE DROPI ===`;
  }
}
