export class ConversionScorer {
  constructor() {
    this.dimensions = ['hero', 'oferta', 'confianza', 'urgencia', 'checkout', 'seo', 'mobile'];
    this.maxScores = {
      hero: 100,
      oferta: 100,
      confianza: 100,
      urgencia: 100,
      checkout: 100,
      seo: 100,
      mobile: 100,
    };
  }

  score(product, blueprint, extra = {}) {
    const customer = blueprint.customer || {};
    const offer = blueprint.offer || {};
    const content = blueprint.content || {};
    const marketing = blueprint.marketing || {};
    const seo = blueprint.seo || {};
    const blocks = blueprint.blocks || [];

    const results = {};
    const recommendations = [];

    const push = (dim, rec) => recommendations.push({ dimension: dim, ...rec });

    // ── HERO ──
    {
      let score = 100;
      const hooks = marketing.hooks || [];
      if (!hooks[0] || hooks[0].length < 10) { score -= 15; push('hero', { type: 'critical', message: 'El hook principal es demasiado corto o genérico. Debe comunicar el beneficio en segundos.' }); }
      if (!hooks[1] || hooks[1].length < 20) { score -= 10; push('hero', { type: 'improvement', message: 'El subtítulo no explica claramente por qué este producto es diferente.' }); }
      if (!offer.price_unit && !offer.bundle_x2_price) { score -= 20; push('hero', { type: 'critical', message: 'No se muestra un precio claro en el hero. El visitante necesita saber cuánto cuesta en menos de 3 segundos.' }); }
      if (marketing.cta_text && marketing.cta_text.length < 10) { score -= 10; push('hero', { type: 'improvement', message: `El CTA "${marketing.cta_text}" es muy corto. Usa frases como "Quiero mi OrganiMax ahora".` }); }
      if (!offer.has_free_shipping) { score -= 5; push('hero', { type: 'improvement', message: 'No se menciona envío gratis. Es uno de los mayores motivadores de compra en Colombia.' }); }
      if (!customer.levers || customer.levers.length === 0) { score -= 10; push('hero', { type: 'improvement', message: 'No hay un diferenciador único en el hero. ¿Por qué este producto y no otro?' }); }
      results.hero = Math.min(100, Math.max(0, score));
    }

    // ── OFERTA ──
    {
      let score = 100;
      const priceUnit = parseFloat(offer.price_unit) || 0;
      const bx2 = parseFloat(offer.bundle_x2_price) || 0;
      const bx3 = parseFloat(offer.bundle_x3_price) || 0;

      if (priceUnit <= 0) { score -= 30; push('oferta', { type: 'critical', message: 'No hay precio unitario definido. Sin precio no hay venta.' }); }
      if (bx2 <= 0 && bx3 <= 0) { score -= 20; push('oferta', { type: 'improvement', message: 'No hay paquetes múltiples (x2/x3). Los bundles aumentan el ticket promedio entre un 20% y un 30%.' }); }
      if (offer.discount_pct <= 0) { score -= 15; push('oferta', { type: 'improvement', message: 'No hay descuento visible. Un 10-20% OFF aumenta significativamente la conversión.' }); }
      if (bx2 > 0 && bx3 > 0) { score += 5; }
      if (!offer.has_free_shipping) { score -= 10; push('oferta', { type: 'improvement', message: 'Considera ofrecer envío gratis. Reduce la fricción en el checkout.' }); }
      if (bx2 > 0) {
        const savingsPct = Math.round((1 - bx2 / (priceUnit * 2)) * 100);
        if (savingsPct < 10) { score -= 5; push('oferta', { type: 'improvement', message: `El ahorro en el bundle x2 es solo del ${savingsPct}%. Un ahorro del 15%+ haría la oferta más atractiva.` }); }
      }
      results.oferta = Math.min(100, Math.max(0, score));
    }

    // ── CONFIANZA ──
    {
      let score = 100;
      const testimonials = content.testimonials || [];
      if (testimonials.length === 0) { score -= 20; push('confianza', { type: 'critical', message: 'No hay testimonios reales. Sin prueba social, la desconfianza mata la conversión.' }); }
      if (testimonials.length < 3) { score -= 10; push('confianza', { type: 'improvement', message: 'Solo hay 1-2 testimonios. Agrega al menos 3 con nombre, ciudad y foto real para mayor credibilidad.' }); }
      if (blueprint.confidence && blueprint.confidence < 50) { score -= 15; push('confianza', { type: 'critical', message: 'El score de confianza es bajo. Revisa los testimonios, la garantía y las señales de seguridad.' }); }
      const hasGuarantee = blocks.includes('guarantee');
      if (!hasGuarantee) { score -= 15; push('confianza', { type: 'critical', message: 'No hay sección de garantía visible. Una garantía clara aumenta la conversión entre un 15% y un 30%.' }); }
      const hasTrustMicro = blueprint.blocks?.includes('hero') && blocks.includes('hero');
      if (hasTrustMicro) { score += 5; }
      push('confianza', { type: 'tip', message: 'Agrega fotos reales de clientes usando el producto. El contenido UGC convierte 4x más que fotos de stock.', impact: 'high' });
      results.confianza = Math.min(100, Math.max(0, score));
    }

    // ── URGENCIA ──
    {
      let score = 100;
      const stock = parseInt(extra.stock || product.stock || 0, 10);
      if (stock <= 0 || stock > 100) { score -= 15; push('urgencia', { type: 'improvement', message: 'No hay escasez real o el stock es muy alto. La escasez percibida acelera la decisión de compra.' }); }
      if (stock > 0 && stock <= 20) { score += 10; push('urgencia', { type: 'tip', message: `Quedan solo ${stock} unidades. Mantén este mensaje visible en el hero.`, impact: 'high' }); }
      const hasTimer = extra.html?.includes('countdownTimer') || false;
      if (!hasTimer) { score -= 10; push('urgencia', { type: 'improvement', message: 'Un temporizador de cuenta regresiva en el hero puede aumentar la urgencia. Recomendamos 2-4 horas reales.' }); }
      if (hasTimer) { score += 5; push('urgencia', { type: 'tip', message: 'El countdown timer está visible. Asegúrate de que el tiempo sea real (no hardcodeado a 6h).', impact: 'medium' }); }
      const hasDiscount = offer.discount_pct > 0;
      if (hasDiscount) { score += 5; }
      if (!stock && !hasTimer && !hasDiscount) { score -= 20; push('urgencia', { type: 'critical', message: 'No hay ningún elemento de urgencia o escasez. Sin urgencia, el visitante pospone la compra y nunca vuelve.' }); }
      results.urgencia = Math.min(100, Math.max(0, score));
    }

    // ── CHECKOUT ──
    {
      let score = 100;
      const hasOptions = extra.checkoutOptions || false;
      if (!hasOptions) { score -= 10; push('checkout', { type: 'improvement', message: 'No hay opciones de variante (cantidad/talla/color). Ofrecer opciones aumenta el valor del pedido.' }); }
      if (!offer.has_free_shipping) { score -= 10; push('checkout', { type: 'improvement', message: 'Considera ofrecer envío gratis en el checkout. Es la principal razón de abandono de carrito en Colombia.' }); }
      const paymentMethods = extra.paymentMethods || 1;
      if (paymentMethods <= 1) { score -= 10; push('checkout', { type: 'improvement', message: 'Solo hay un método de pago. Agregar pagos con tarjeta (Wompi) además de contra entrega puede aumentar conversión.' }); }
      const hasSecurity = extra.html?.includes('lock') || extra.html?.includes('segura') || false;
      if (hasSecurity) { score += 5; }
      push('checkout', { type: 'tip', message: 'Reduce los campos del formulario al mínimo: nombre, teléfono, ciudad y dirección son suficientes.', impact: 'medium' });
      results.checkout = Math.min(100, Math.max(0, score));
    }

    // ── SEO ──
    {
      let score = 100;
      if (!seo.title || seo.title.length < 20) { score -= 20; push('seo', { type: 'critical', message: 'El title tag es muy corto o no está optimizado. Debe tener 50-60 caracteres con la keyword principal.' }); }
      if (!seo.description || seo.description.length < 50) { score -= 15; push('seo', { type: 'critical', message: 'La meta description es muy corta. Debe tener 120-158 caracteres e incluir beneficios y CTA.' }); }
      if (!seo.keywords || seo.keywords.length < 3) { score -= 10; push('seo', { type: 'improvement', message: 'Hay menos de 3 keywords. Agrega palabras clave de cola larga como "organizador de clóset Colombia".' }); }
      if (!extra.hasSchema) { score -= 10; push('seo', { type: 'improvement', message: 'No hay Schema.org markup. El rich snippet puede aumentar el CTR orgánico hasta un 30%.' }); }
      if (extra.hasOgTags) { score += 5; }
      results.seo = Math.min(100, Math.max(0, score));
    }

    // ── MOBILE ──
    {
      let score = 100;
      const html = extra.html || '';
      const hasViewport = html.includes('width=device-width, initial-scale=1') || html.includes('width=device-width');
      if (!hasViewport) { score -= 25; push('mobile', { type: 'critical', message: 'No hay viewport meta tag. La landing no es responsive en móvil.' }); }
      if (hasViewport) { score += 5; }
      const btnSizes = (html.match(/btn-lg/g) || []).length + (html.match(/btn-block/g) || []).length;
      if (btnSizes < 2) { score -= 10; push('mobile', { type: 'improvement', message: 'Los botones no están optimizados para touch. Usa botones de al menos 48px de altura.' }); }
      const hasMobileQuery = html.includes('@media');
      if (!hasMobileQuery) { score -= 15; push('mobile', { type: 'critical', message: 'No hay media queries. La landing no está optimizada para pantallas pequeñas.' }); }
      const hasFontClamp = html.includes('clamp(');
      if (hasFontClamp) { score += 5; }
      results.mobile = Math.min(100, Math.max(0, score));
    }

    const total = Math.round(
      Object.values(results).reduce((s, v) => s + v, 0) / Object.values(results).length
    );

    return {
      total,
      dimensions: results,
      recommendations: recommendations.slice(0, 8),
      summary: this._generateSummary(total, results),
    };
  }

  _generateSummary(total, dims) {
    if (total >= 90) return 'Excelente. Esta landing está lista para producir resultados. Monitorea y optimiza continuamente.';
    if (total >= 80) return 'Buena base. Con algunos ajustes en las áreas débiles puede alcanzar un nivel competitivo.';
    if (total >= 70) return 'Funcional pero mejorable. Hay oportunidades claras de mejora que pueden aumentar la conversión significativamente.';
    if (total >= 50) return 'Necesita trabajo importante. Varias áreas críticas están afectando la conversión. Revisa las recomendaciones urgentes.';
    return 'Requiere reconstrucción. Demasiados problemas fundamentales. Recomendamos revisar desde la estrategia de producto.';
  }

  formatReport(scoreResult) {
    const bar = n => {
      const filled = Math.round(n / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };
    let report = `\n━━━ LIAM Conversion Score ━━━\n\n`;
    report += `  Score Total: ${scoreResult.total}/100\n\n`;
    for (const [dim, score] of Object.entries(scoreResult.dimensions)) {
      const label = dim.charAt(0).toUpperCase() + dim.slice(1);
      report += `  ${label.padEnd(12)} ${bar(score)} ${score}/100\n`;
    }
    report += `\n  ${scoreResult.summary}\n`;
    if (scoreResult.recommendations.length > 0) {
      report += `\n  Recomendaciones:\n`;
      for (const r of scoreResult.recommendations.slice(0, 5)) {
        const icon = r.type === 'critical' ? '🔴' : r.type === 'improvement' ? '🟡' : '💡';
        report += `  ${icon} [${r.dimension}] ${r.message}\n`;
      }
    }
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    return report;
  }
}
