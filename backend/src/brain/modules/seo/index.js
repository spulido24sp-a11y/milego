export class SeoEngine {
  /**
   * Generates clean SEO URL slugs, titles, and localized keywords.
   * @param {Object} product 
   * @returns {Object} SEO metadata profile
   */
  generateSeoMetadata(product) {
    const slug = (product.name || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return {
      slug,
      title: `${product.name} - Envío Gratis Contra Entrega en Colombia`,
      keywords: [
        `${product.name.toLowerCase()}`,
        `comprar ${product.name.toLowerCase()}`,
        `${product.name.toLowerCase()} colombia`
      ]
    };
  }
}
