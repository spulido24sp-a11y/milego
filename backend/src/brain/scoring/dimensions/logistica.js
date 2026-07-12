/**
 * logistica.js — Scoring dimension
 * Scores logistics viability based on weight.
 */

export function scoreLogistica({ weightKg = 0, facts = [] }) {
  let score = 100;
  let explanation = null;

  if (facts.includes('weight_unknown')) {
    score = 70;
    explanation = 'Peso no especificado. Se asume envío estándar.';
  } else if (facts.includes('weight_optimal')) {
    score = 100;
  } else if (facts.includes('weight_acceptable')) {
    score = 80;
    explanation = `Peso de ${weightKg}kg incrementa costo de envío moderadamente.`;
  } else if (facts.includes('weight_high')) {
    score = 55;
    explanation = `Peso de ${weightKg}kg puede reducir el ROAS por costos logísticos elevados.`;
  } else if (facts.includes('weight_critical')) {
    score = 20;
    explanation = `Peso de ${weightKg}kg hace el envío COD inviable en la mayoría de rutas.`;
  }

  if (facts.includes('fragile_product')) {
    score = Math.max(0, score - 15);
    explanation = (explanation ?? '') + ' Producto frágil: riesgo adicional de devoluciones por daño.';
  }

  return { score: Math.round(score), explanation: explanation?.trim() ?? null };
}
