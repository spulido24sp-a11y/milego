/**
 * seo.js — Scoring dimension
 * Evaluates SEO readiness: keyword presence in name/description, length, structure.
 */

// Common high-converting keywords by category (simplified baseline)
const HIGH_VALUE_SIGNALS = [
  'envío gratis', 'envio gratis', 'contra entrega', 'garantía', 'garantia',
  'oferta', 'descuento', 'original', 'premium', 'calidad'
];

/**
 * @param {Object} product
 * @returns {{ score: number, explanation: string|null }}
 */
export function scoreSeo(product) {
  let score = 50; // baseline
  const explanations = [];

  const name = (product.name ?? '').toLowerCase();
  const descRaw = product.description ?? product.launch_blueprint?.content?.description ?? '';
  const desc = descRaw.replace(/<[^>]*>/g, '').toLowerCase();

  // Name length signal
  if (name.length >= 30 && name.length <= 80) {
    score += 15; // ideal SEO title length
  } else if (name.length < 15) {
    score -= 15;
    explanations.push('Nombre muy corto para posicionamiento SEO.');
  }

  // Description length signals
  if (desc.length >= 300) {
    score += 20;
  } else if (desc.length >= 80) {
    score += 10;
  } else {
    score -= 10;
    explanations.push('Descripción corta reduce visibilidad orgánica.');
  }

  // High-value keyword presence
  const foundSignals = HIGH_VALUE_SIGNALS.filter(k => name.includes(k) || desc.includes(k));
  if (foundSignals.length >= 2) {
    score += 15;
  } else if (foundSignals.length === 1) {
    score += 5;
  } else {
    explanations.push('No se detectaron keywords de alto valor en nombre o descripción.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    explanation: explanations.length > 0 ? explanations.join(' | ') : null
  };
}
