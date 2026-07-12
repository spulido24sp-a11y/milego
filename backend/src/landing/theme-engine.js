/**
 * LIAM Theme Engine — Conversion-optimized Landing Page Templates
 *
 * Defines the templates library (Minimal, Premium, Flash Sale, Luxury, TikTok Style, UGC)
 * and determines the best template to use dynamically for each product.
 */
export class LIAMThemeEngine {
  constructor() {
    this.themes = {
      minimal: {
        name: 'Minimal Clean',
        description: 'Enfoque en simplicidad, tipografía elegante y grandes espacios en blanco. Ideal para productos de estilo de vida y minimalismo.',
        conversionScore: 90,
        category: 'Hogar / Organización',
        cssClass: 'theme-minimal'
      },
      premium: {
        name: 'Premium Glass',
        description: 'Efectos de vidrio (glassmorphism), gradientes oscuros/neón y micro-animaciones fluidas. Ideal para tecnología premium y gadgets.',
        conversionScore: 96,
        category: 'Gadgets / Tecnología',
        cssClass: 'theme-premium'
      },
      flash_sale: {
        name: 'Oferta Flash',
        description: 'Contadores de cuenta regresiva, insignias de descuento agresivas y CTAs de alta visibilidad. Maximiza la compra por impulso.',
        conversionScore: 92,
        category: 'Oferta Limitada',
        cssClass: 'theme-flash'
      },
      tiktok_ugc: {
        name: 'TikTok Style UGC',
        description: 'Contenido creado por el usuario (UGC) en formato vertical, burbujas de testimonios tipo red social. Ideal para productos virales.',
        conversionScore: 94,
        category: 'Belleza / Fitness / Virales',
        cssClass: 'theme-ugc'
      },
      luxury: {
        name: 'Luxury Black',
        description: 'Fondo oscuro profundo, bordes dorados, fuentes serifadas de alta costura. Diseñado para productos de alto valor percibido (high ticket).',
        conversionScore: 88,
        category: 'Belleza / Joyería / Premium',
        cssClass: 'theme-luxury'
      }
    };
  }

  /**
   * Recommends the best theme based on product details.
   * @param {Object} product - Database product record
   * @returns {string} Recommended theme key
   */
  recommendTheme(product) {
    const categoryName = String(product.category_name || '').toLowerCase();
    const productName = String(product.name || '').toLowerCase();
    const price = parseFloat(product.price || 0);

    // Rule 1: High ticket -> Luxury
    if (price >= 150000) {
      return 'luxury';
    }

    // Rule 2: Viral Gadgets -> Premium
    if (categoryName.includes('gadget') || categoryName.includes('tech') || productName.includes('smart') || productName.includes('proyector') || productName.includes('lámpara') || productName.includes('lampara')) {
      return 'premium';
    }

    // Rule 3: Beauty, Fashion, Fitness -> TikTok Style UGC
    if (categoryName.includes('belleza') || categoryName.includes('salud') || categoryName.includes('fitness') || categoryName.includes('moda') || productName.includes('corrector')) {
      return 'tiktok_ugc';
    }

    // Rule 4: Home, kitchen, organization -> Minimal
    if (categoryName.includes('hogar') || categoryName.includes('organiza') || productName.includes('zapato') || productName.includes('organizador')) {
      return 'minimal';
    }

    // Default Fallback
    return 'flash_sale';
  }

  /**
   * Recommends the complete CRO Landing Page configuration (Theme & Block Sequence)
   * based on product data and campaigns/traffic context.
   * @param {Object} product - Database product record
   * @param {Object} [trafficContext] - Optional context of campaigns (source, audience, etc.)
   * @returns {Object} { theme: string, blocks: string[], reason: string }
   */
  recommendCROConfig(product, trafficContext = {}) {
    const source = String(trafficContext.source || 'facebook').toLowerCase();
    const price = parseFloat(product.price || 0);
    const category = String(product.category_name || '').toLowerCase();

    // Decision Layer 1: TikTok UGC Virality Angle
    if (source === 'tiktok' || category.includes('belleza') || category.includes('salud') || category.includes('fitness')) {
      return {
        theme: 'tiktok_ugc',
        blocks: ['hero', 'gallery', 'testimonials', 'benefits', 'faq', 'checkout'],
        reason: 'Tráfico social/viral detectado. Priorización de demostración UGC y testimonios interactivos arriba de la llamada a la acción (AOV alto).'
      };
    }

    // Decision Layer 2: High Ticket Luxury Persuasion Angle
    if (price >= 150000 || source === 'luxury_search') {
      return {
        theme: 'luxury',
        blocks: ['hero', 'problem', 'transformation', 'benefits', 'offer', 'guarantee', 'checkout'],
        reason: 'Activo de ticket alto (>150.000 COP). Enfoque en valor percibido mediante transformaciones y minimización del riesgo (Garantía).'
      };
    }

    // Decision Layer 3: Google Search / Lifestyle Angle (Minimal)
    if (source === 'google' || category.includes('hogar') || category.includes('organiza')) {
      return {
        theme: 'minimal',
        blocks: ['hero', 'benefits', 'gallery', 'faq', 'checkout'],
        reason: 'Tráfico enfocado a la intención de búsqueda directa. Estructura minimalista, carga rápida y respuestas rápidas (FAQ).'
      };
    }

    // Decision Layer 4: Default Flash Impulse Sale Angle
    return {
      theme: 'flash_sale',
      blocks: ['hero', 'benefits', 'offer', 'faq', 'checkout'],
      reason: 'Tráfico estándar de conversión por impulso. Habilitados ganchos de urgencia agresivos y tiers de precios directos.'
    };
  }

  /**
   * Retrieves all available themes with details
   * @returns {Object}
   */
  getThemesList() {
    return Object.keys(this.themes).map(key => ({
      key,
      ...this.themes[key]
    }));
  }
}

