/**
 * data-quality.rule.js (v2)
 */

const MIN_IMAGES          = 3;
const MIN_DESCRIPTION_LEN = 80;
const MIN_NAME_LEN        = 10;

export function evaluateDataQuality(product) {
  const findings        = [];
  const recommendations = [];
  let   penaltyPoints   = 0;

  const name     = (product.name ?? '').trim();
  const descRaw  = product.description ?? product.launch_blueprint?.content?.description ?? '';
  const descText = descRaw.replace(/<[^>]*>/g, '').trim();
  const images   = Array.isArray(product.images) ? product.images : [];
  const retail   = parseFloat(product.supplier_info?.suggested_retail_price ?? 0);

  const facts = {
    nameLength:   name.length,
    descLength:   descText.length,
    imageCount:   images.length,
    hasPrice:     retail > 0,
    qualityScore: 0
  };

  // ── Name ──────────────────────────────────────────────────────────────
  if (name.length === 0) {
    findings.push({ code: 'MISSING_NAME', severity: 'critical', detail: 'El producto no tiene nombre.' });
    recommendations.push({ action: 'add_product_name', detail: 'Agrega un nombre descriptivo de al menos 10 caracteres.', expectedConfidenceGain: 20 });
    penaltyPoints += 30;
  } else if (name.length < MIN_NAME_LEN) {
    findings.push({ code: 'SHORT_NAME', severity: 'medium', detail: `Nombre de ${name.length} caracteres. Mínimo recomendado: ${MIN_NAME_LEN}.` });
    recommendations.push({ action: 'improve_product_name', detail: 'Un nombre más descriptivo mejora el CTR en anuncios y el SEO orgánico.', expectedConfidenceGain: 5 });
    penaltyPoints += 10;
  } else {
    findings.push({ code: 'NAME_OK', severity: 'ok', detail: 'El nombre del producto cumple con los estándares mínimos.' });
  }

  // ── Description ───────────────────────────────────────────────────────
  if (descText.length === 0) {
    findings.push({ code: 'MISSING_DESCRIPTION', severity: 'high', detail: 'No hay descripción del producto. LIAM no puede generar copy de calidad sin ella.' });
    recommendations.push({ action: 'add_description', detail: 'Agrega una descripción de al menos 80 caracteres con los beneficios principales del producto.', expectedConfidenceGain: 15 });
    penaltyPoints += 25;
  } else if (descText.length < MIN_DESCRIPTION_LEN) {
    findings.push({ code: 'SHORT_DESCRIPTION', severity: 'medium', detail: `Descripción de ${descText.length} caracteres. Mínimo recomendado: ${MIN_DESCRIPTION_LEN}.` });
    recommendations.push({ action: 'expand_description', detail: 'Amplía la descripción con beneficios, características técnicas y casos de uso.', expectedConfidenceGain: 8 });
    penaltyPoints += 10;
  } else {
    findings.push({ code: 'DESCRIPTION_OK', severity: 'ok', detail: `Descripción de ${descText.length} caracteres. Suficiente para generar contenido de calidad.` });
  }

  // ── Images ────────────────────────────────────────────────────────────
  if (facts.imageCount === 0) {
    findings.push({ code: 'NO_IMAGES', severity: 'critical', detail: 'El producto no tiene imágenes. No puede publicarse.' });
    recommendations.push({ action: 'add_product_images', detail: `Agrega mínimo ${MIN_IMAGES} imágenes: hero, detalle, contexto de uso.`, expectedConfidenceGain: 25 });
    penaltyPoints += 30;
  } else if (facts.imageCount < MIN_IMAGES) {
    findings.push({ code: 'LOW_IMAGE_COUNT', severity: 'medium', detail: `Solo ${facts.imageCount} imagen(es). Se recomiendan mínimo ${MIN_IMAGES} para mejorar conversión.` });
    recommendations.push({ action: 'add_more_images', detail: `Agrega ${MIN_IMAGES - facts.imageCount} imagen(es) más. Los anuncios con 3+ imágenes tienen mayor CTR.`, expectedConfidenceGain: 10 });
    penaltyPoints += 15;
  } else {
    findings.push({ code: 'IMAGES_OK', severity: 'ok', detail: `${facts.imageCount} imágenes disponibles. Suficientes para los creativos de anuncios.` });
  }

  // ── Price ─────────────────────────────────────────────────────────────
  if (!facts.hasPrice) {
    findings.push({ code: 'MISSING_PRICE', severity: 'high', detail: 'No hay precio de venta definido.' });
    recommendations.push({ action: 'set_retail_price', detail: 'Define el precio de venta antes del análisis de viabilidad.', expectedConfidenceGain: 15 });
    penaltyPoints += 20;
  } else {
    findings.push({ code: 'PRICE_PRESENT', severity: 'ok', detail: 'Precio de venta definido.' });
  }

  facts.qualityScore = Math.max(0, 100 - penaltyPoints);

  return { facts, findings, recommendations };
}
