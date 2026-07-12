/**
 * viabilidad.js — Scoring dimension
 * Computes a 0–100 viability score based on margin + ROAS.
 */

export function scoreViabilidad({ marginPct = 0, expectedRoas = 0 }) {
  // Margin component: 0-60 points
  // 40% margin → 40pts, 55%+ → 60pts
  const marginScore = Math.min(60, Math.max(0, marginPct * (60 / 55)));

  // ROAS component: 0-40 points
  // 1.5x ROAS → 20pts, 3x+ → 40pts
  const roasScore = Math.min(40, Math.max(0, (expectedRoas / 3) * 40));

  const score = Math.round(marginScore + roasScore);

  let explanation = null;
  if (score < 40) {
    explanation = `Viabilidad baja. Margen del ${marginPct.toFixed(1)}% y ROAS de ${expectedRoas.toFixed(2)}x no garantizan rentabilidad con pauta pagada.`;
  } else if (score < 70) {
    explanation = `Viabilidad moderada. El producto es rentable pero puede ser sensible a variaciones en costo de adquisición.`;
  }

  return { score, explanation };
}
