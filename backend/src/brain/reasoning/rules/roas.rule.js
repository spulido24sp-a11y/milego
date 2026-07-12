/**
 * roas.rule.js (v2)
 */

const MIN_ROAS_VIABLE   = 1.5;
const MIN_ROAS_GOOD     = 2.0;
const MIN_ROAS_EXCELLENT = 3.0;
const AD_SPEND_RATIO    = 0.30; // Conservative COD Colombia baseline

export function evaluateRoas(product) {
  const findings        = [];
  const recommendations = [];

  const cost   = parseFloat(product.supplier_info?.wholesale_price          ?? 0);
  const retail = parseFloat(product.supplier_info?.suggested_retail_price   ?? 0);

  const facts = { cost, retail, expectedRoas: 0, estimatedAdSpend: 0 };

  if (retail <= 0 || cost <= 0) {
    findings.push({ code: 'ROAS_UNCOMPUTABLE', severity: 'medium', detail: 'No se puede calcular ROAS estimado porque faltan costo o precio.' });
    return { facts, findings, recommendations };
  }

  const estimatedAdSpend = retail * AD_SPEND_RATIO;
  const totalCost        = cost + estimatedAdSpend;
  const expectedRoas     = retail / totalCost;

  facts.estimatedAdSpend = parseFloat(estimatedAdSpend.toFixed(0));
  facts.expectedRoas     = parseFloat(expectedRoas.toFixed(2));

  if (expectedRoas < MIN_ROAS_VIABLE) {
    findings.push({
      code: 'ROAS_NONVIABLE', severity: 'critical',
      detail: `ROAS esperado de ${expectedRoas.toFixed(2)}x está por debajo del mínimo viable de ${MIN_ROAS_VIABLE}x. El producto probablemente genere pérdidas con pauta pagada.`
    });

    // Simulate what bundle x2 would do: revenue doubles, ad spend stays similar
    const bundleRetail    = retail * 2;
    const bundleAdSpend   = bundleRetail * 0.25; // slightly lower % for bundles
    const bundleRoas      = bundleRetail / (cost * 2 + bundleAdSpend);
    recommendations.push({
      action: 'create_bundle_x2', detail: `Un bundle x2 elevaría el ROAS de ${expectedRoas.toFixed(2)}x a ~${bundleRoas.toFixed(2)}x.`,
      expectedConfidenceGain: 15, expectedRoasGain: parseFloat((bundleRoas - expectedRoas).toFixed(2))
    });

    // Also suggest price increase
    const targetRetail = Math.ceil(cost / (1 - 0.45) + estimatedAdSpend * 1.2);
    recommendations.push({
      action: 'increase_retail_price', detail: `Subir el precio a $${targetRetail.toLocaleString()} podría hacer el ROAS viable.`,
      expectedConfidenceGain: 10, expectedRoasGain: 0.5
    });
  } else if (expectedRoas < MIN_ROAS_GOOD) {
    findings.push({ code: 'ROAS_ACCEPTABLE', severity: 'low', detail: `ROAS de ${expectedRoas.toFixed(2)}x es aceptable pero ajustado. Cualquier aumento en costos puede comprometer la rentabilidad.` });
    recommendations.push({
      action: 'optimize_offer', detail: 'Considera un bundle x2 para mejorar el ticket promedio y el ROAS.',
      expectedConfidenceGain: 8, expectedRoasGain: 0.4
    });
  } else if (expectedRoas >= MIN_ROAS_EXCELLENT) {
    findings.push({ code: 'ROAS_EXCELLENT', severity: 'ok', detail: `ROAS esperado de ${expectedRoas.toFixed(2)}x es excelente. Escalable con pauta pagada.` });
  } else {
    findings.push({ code: 'ROAS_GOOD', severity: 'ok', detail: `ROAS de ${expectedRoas.toFixed(2)}x es bueno para dropshipping COD.` });
  }

  return { facts, findings, recommendations };
}
