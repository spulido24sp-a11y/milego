/**
 * calidad-datos.js — Scoring dimension
 * Scores data completeness for launch and LLM readiness.
 */

export function scoreCalidadDatos({ qualityScore = 0, imageCount = 0, descLength = 0, facts = [] }) {
  // Base: use the raw qualityScore from data-quality rule (0–100)
  let score = qualityScore;
  const explanations = [];

  if (facts.includes('no_images')) {
    explanations.push('Sin imágenes — el producto no puede lanzarse.');
  } else if (facts.includes('low_image_count')) {
    explanations.push(`Solo ${imageCount} imagen(es). Agregar más mejora conversión y CTR en anuncios.`);
  }

  if (facts.includes('missing_description')) {
    explanations.push('Sin descripción — LIAM no puede generar copy de calidad.');
  } else if (facts.includes('short_description')) {
    explanations.push(`Descripción de ${descLength} caracteres. Se recomiendan mínimo 80.`);
  }

  if (facts.includes('missing_name') || facts.includes('short_name')) {
    explanations.push('Nombre del producto demasiado corto o ausente.');
  }

  return {
    score: Math.round(score),
    explanation: explanations.length > 0 ? explanations.join(' | ') : null
  };
}
