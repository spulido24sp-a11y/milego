/**
 * logistics.rule.js (v2)
 * Structured facts/findings/recommendations for shipping viability.
 */

const MAX_WEIGHT_LOW  = 1.0;
const MAX_WEIGHT_MED  = 2.5;
const MAX_WEIGHT_HIGH = 5.0;

export function evaluateLogistics(product) {
  const findings        = [];
  const recommendations = [];

  const weightKg = parseFloat(product.weight_kg ?? product.weight ?? 0);
  const name     = (product.name ?? '').toLowerCase();

  const facts = { weightKg, isFragile: false };

  // ── Weight ────────────────────────────────────────────────────────────
  if (weightKg === 0) {
    findings.push({ code: 'WEIGHT_UNKNOWN', severity: 'low', detail: 'El peso del producto no está especificado.' });
    recommendations.push({ action: 'add_weight', detail: 'Especifica el peso del producto para calcular costos de envío correctamente.', expectedConfidenceGain: 3 });
  } else if (weightKg <= MAX_WEIGHT_LOW) {
    findings.push({ code: 'WEIGHT_OPTIMAL', severity: 'ok', detail: `Peso de ${weightKg}kg es ideal para envío COD en Colombia.` });
  } else if (weightKg <= MAX_WEIGHT_MED) {
    findings.push({ code: 'WEIGHT_ACCEPTABLE', severity: 'low', detail: `Peso de ${weightKg}kg incrementa el costo de envío moderadamente.` });
    recommendations.push({ action: 'optimize_packaging', detail: 'Considera empaques más compactos para reducir el peso volumétrico.', expectedConfidenceGain: 2 });
  } else if (weightKg <= MAX_WEIGHT_HIGH) {
    findings.push({ code: 'WEIGHT_HIGH', severity: 'medium', detail: `Peso de ${weightKg}kg puede reducir el ROAS por costos logísticos elevados.` });
    recommendations.push({ action: 'review_shipping_cost', detail: 'Negocia tarifas especiales con la transportadora o ajusta el precio de venta.', expectedConfidenceGain: 5, expectedRoasGain: 0.2 });
  } else {
    findings.push({ code: 'WEIGHT_CRITICAL', severity: 'high', detail: `Peso de ${weightKg}kg hace el envío COD inviable en la mayoría de rutas de Colombia.` });
    recommendations.push({ action: 'reconsider_product', detail: 'Evalúa si este producto puede venderse con recogida en punto o modalidad distinta a COD.', expectedConfidenceGain: 0 });
  }

  // ── Fragility ─────────────────────────────────────────────────────────
  const fragileKeywords = ['vidrio', 'cristal', 'cerámica', 'porcelana', 'espejo'];
  if (fragileKeywords.some(k => name.includes(k))) {
    facts.isFragile = true;
    findings.push({ code: 'FRAGILE_PRODUCT', severity: 'medium', detail: 'Producto potencialmente frágil. Alto riesgo de devoluciones por daños en tránsito.' });
    recommendations.push({ action: 'add_fragile_packaging', detail: 'Incluye embalaje reforzado y comunícalo en el anuncio para reducir expectativas erróneas.', expectedConfidenceGain: 3 });
  }

  return { facts, findings, recommendations };
}
