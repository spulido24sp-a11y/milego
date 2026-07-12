/**
 * margin.rule.js (v2)
 * Emits structured facts, findings, and recommendations.
 */

export const MARGIN_MIN_PERCENT   = 40;
export const MARGIN_IDEAL_PERCENT = 55;

/**
 * @param {Object} product
 * @returns {{ facts: Object, findings: Object[], recommendations: Object[] }}
 */
export function evaluateMargin(product) {
  const findings        = [];
  const recommendations = [];

  const cost   = parseFloat(product.supplier_info?.wholesale_price          ?? 0);
  const retail = parseFloat(product.supplier_info?.suggested_retail_price   ?? 0);

  // ── Facts (raw measurements) ──────────────────────────────────────────
  const facts = { cost, retail, marginPct: 0 };

  if (retail <= 0) {
    findings.push({ code: 'MISSING_RETAIL_PRICE', severity: 'critical', detail: 'El precio de venta es 0 o no está definido.' });
    recommendations.push({ action: 'set_retail_price', detail: 'Define un precio de venta antes de continuar.', expectedConfidenceGain: 25 });
    return { facts, findings, recommendations };
  }

  if (cost <= 0) {
    findings.push({ code: 'MISSING_COST', severity: 'high', detail: 'El costo del producto no está definido.' });
    recommendations.push({ action: 'set_cost_price', detail: 'Verifica el costo de adquisición en Dropi.', expectedConfidenceGain: 10 });
    return { facts, findings, recommendations };
  }

  if (retail < cost) {
    facts.marginPct = 0;
    findings.push({ code: 'RETAIL_BELOW_COST', severity: 'critical', detail: `El precio de venta ($${retail.toLocaleString()}) es menor que el costo ($${cost.toLocaleString()}).` });
    recommendations.push({ action: 'increase_retail_price', detail: `Sube el precio al menos a $${Math.ceil(cost * 1.5).toLocaleString()} para tener margen viable.`, expectedConfidenceGain: 30 });
    return { facts, findings, recommendations };
  }

  const marginPct = ((retail - cost) / retail) * 100;
  facts.marginPct = parseFloat(marginPct.toFixed(2));

  if (marginPct < MARGIN_MIN_PERCENT) {
    findings.push({ code: 'LOW_MARGIN', severity: 'high', detail: `Margen de ${marginPct.toFixed(1)}% está por debajo del mínimo requerido de ${MARGIN_MIN_PERCENT}%.` });
    const targetRetail = Math.ceil(cost / (1 - MARGIN_MIN_PERCENT / 100));
    recommendations.push({ action: 'increase_retail_price', detail: `Sube el precio a $${targetRetail.toLocaleString()} para alcanzar el margen mínimo del ${MARGIN_MIN_PERCENT}%.`, expectedConfidenceGain: 12, expectedRoasGain: 0.3 });
  } else if (marginPct < MARGIN_IDEAL_PERCENT) {
    findings.push({ code: 'ACCEPTABLE_MARGIN', severity: 'info', detail: `Margen de ${marginPct.toFixed(1)}% es aceptable pero mejorable.` });
  } else {
    findings.push({ code: 'EXCELLENT_MARGIN', severity: 'ok', detail: `Margen del ${marginPct.toFixed(1)}% es excelente para dropshipping COD.` });
  }

  return { facts, findings, recommendations };
}
