/**
 * LIAM Theme Registry V3 (Conceptual / Design Phase)
 * Matches each available theme with its relative path of static modular component templates.
 */
export const THEMES_REGISTRY = {
  premium: {
    id: 'premium',
    name: 'Premium V3 (Super-Conversion)',
    path: 'src/landing/themes/premium',
    components: ['hero.html', 'offer.html', 'gallery.html', 'benefits.html', 'faq.html', 'trust.html', 'checkout.html']
  },
  pagepilot: {
    id: 'pagepilot',
    name: 'PagePilot Classic (Direct-Sale)',
    path: 'src/landing/themes/pagepilot',
    components: ['hero.html', 'offer.html', 'gallery.html', 'benefits.html', 'faq.html', 'trust.html', 'checkout.html']
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial Luxe (Magazine-Style)',
    path: 'src/landing/themes/editorial',
    components: ['hero.html', 'offer.html', 'gallery.html', 'benefits.html', 'faq.html', 'trust.html', 'checkout.html']
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Clean (Lifestyle)',
    path: 'src/landing/themes/minimal',
    components: ['hero.html', 'offer.html', 'gallery.html', 'benefits.html', 'faq.html', 'trust.html', 'checkout.html']
  }
};
