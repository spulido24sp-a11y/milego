const HOOK_PATTERNS = {
  home: {
    hooks: [
      '¿Tu clóset parece un campo de batalla? OrganiMax lo arregla en 5 minutos.',
      'Duplica el espacio de tu clóset sin obras, sin remodelar, sin gastar de más.',
      'La mañana deja de ser una lucha: encuentra todo en segundos con OrganiMax.',
      'Pierdes 10 minutos al día buscando ropa. Con OrganiMax, nunca más.',
      'El secreto de los hogares organizados en Colombia ya está aquí.',
      'Deja de comprar organizadores que no funcionan. El último que necesitas.',
      'Tu clóset puede verse como los de revista. Sin pagar una fortuna.',
      'OrganiMax: la solución que 2.000+ colombianos ya tienen en su casa.',
      '¿Cansado del desorden? En 5 minutos transformas tu clóset para siempre.',
      'Paga contra entrega y recibe OrganiMax en la puerta de tu casa.',
    ],
    copies: [
      'Cada mañana es la misma historia: buscas, revuelves, te frustras y llegas tarde. OrganiMax termina con eso para siempre.',
      'No necesitas un clóset más grande. Necesitas OrganiMax. Duplica tu espacio sin remodelar.',
      'Un hogar ordenado cambia tu estado de ánimo. OrganiMax te da la tranquilidad que mereces.',
      'Olvídate de los organizadores que se rompen al mes. Hecho con materiales que duran.',
      'Imagina abrir tu clóset y encontrar todo en su lugar. Eso es lo que OrganiMax hace por ti.',
      'La mayoría de colombianos pierde 2 días al año buscando cosas en su clóset. Hemos hecho los cálculos.',
      'Sin herramientas. Sin conocimientos. Sin obras. Solo 5 minutos y tu clóset transformado.',
      'Precio directo de fábrica, envío a toda Colombia, pago contra entrega. Sin excusas.',
      'Tu hogar merece orden. Tú mereces empezar el día sin estrés. OrganiMax te lo da.',
      'No es solo un organizador. Es el fin del desorden en tu hogar.',
    ],
    headlines: [
      'Duplica el espacio de tu clóset hoy',
      'Adiós al desorden: OrganiMax',
      'El organizador que 2.000+ colombianos aman',
      'Tu clóset más ordenado en 5 minutos',
      'Vive sin desorden: OrganiMax',
      'La solución definitiva para tu hogar',
      'Más espacio, menos estrés',
      'OrganiMax: orden que dura',
      'Encuentra todo en segundos',
      'Colombia ya se organizó con OrganiMax',
    ],
    creativeBriefs: [
      { angle: 'Antes/Después', concept: 'Clóset desordenado vs. clóset organizado con OrganiMax. Transición visual impactante.', visual: 'Split screen: antes (caos) → después (orden perfecto)', hook: 'Mira la diferencia que hace un solo producto.' },
      { angle: 'Ahorro de tiempo', concept: 'Mostrar a una persona encontrando su ropa en segundos vs. revolviendo por minutos.', visual: 'Cronómetro corriendo mientras busca → se detiene cuando abre el clóset organizado', hook: 'Recupera esos 10 minutos perdidos cada mañana.' },
      { angle: 'Fácil instalación', concept: 'Una persona instala OrganiMax en segundos sin herramientas.', visual: 'Time-lapse de instalación: abre la caja, coloca, listo. 5 minutos reales.', hook: 'Sin taladros, sin tornillos, sin estrés.' },
      { angle: 'Estilo de vida', concept: 'Hogar colombiano real con familia. El orden trae paz y armonía.', visual: 'Escena cotidiana: mamá/papá abre el clóset, todo ordenado, sonrisa de satisfacción', hook: 'Cuando tu hogar está en orden, todo fluye mejor.' },
      { angle: 'Oferta + Envío', concept: 'Precio increíble + envío gratis + pago contra entrega. Sin riesgo.', visual: 'Producto con badges: "Envío gratis", "Pago contra entrega", "30 días de garantía"', hook: 'Pruébalo 30 días sin riesgo. Paga cuando lo recibas.' },
    ],
  },
};

const FALLBACK_HOOKS = {
  hooks: ['El producto que necesitas está aquí.', 'Calidad y precio justo, directo a tu puerta.', 'La solución que estabas buscando.', 'No busques más. Esto es lo mejor que vas a encontrar.', 'Miles de colombianos ya confían en nosotros.'],
  copies: ['Producto de alta calidad al mejor precio. Envío a toda Colombia.', 'Compra con confianza. Paga contra entrega. 30 días de garantía.', 'Directo de fábrica a tu casa. Sin intermediarios, mejores precios.', 'La satisfacción de nuestros clientes es nuestra mejor carta de presentación.', 'Calidad, precio y confianza en un solo lugar.'],
  headlines: ['El producto que necesitas', 'Calidad garantizada', 'Envío a toda Colombia', 'Compra segura', '30 días de garantía'],
  creativeBriefs: [
    { angle: 'Calidad', concept: 'Muestra el producto en uso.', visual: 'Imagen limpia del producto en contexto real.', hook: 'Diseñado para durar.' },
    { angle: 'Confianza', concept: 'Garantía y pago contra entrega.', visual: 'Badges de seguridad y confianza.', hook: 'Compra sin riesgo.' },
  ],
};

export class AdCreator {
  generate(product, blueprint) {
    const customer = blueprint.customer || {};
    const archetype = customer.archetype || 'general';
    const patterns = HOOK_PATTERNS[archetype] || FALLBACK_HOOKS;
    const name = product.name || 'este producto';

    const hooks = patterns.hooks.map(h => h.replace(/OrganiMax/g, name));
    const copies = patterns.copies.map(c => c.replace(/OrganiMax/g, name));
    const headlines = patterns.headlines;

    const totalAudience = customer.audience || ['colombianos'];
    const pain = customer.pain_points || [];
    const angle = blueprint.marketing?.emotional_angle || 'calidad y confianza';

    const creatives = patterns.creativeBriefs.map((b, i) => ({
      id: `creative_${i + 1}`,
      angle: b.angle,
      concept: b.concept.replace(/OrganiMax/g, name),
      visual: b.visual,
      hook: b.hook,
      target_audience: totalAudience.slice(0, 2).join(', '),
      pain_point: pain[i] || 'desorden y falta de espacio',
    }));

    const audienceTargeting = {
      main: totalAudience.slice(0, 3),
      interests: ['Hogar', 'Organización', 'Decoración', 'Familia'],
      age_range: '25-55',
      gender: 'all',
      platforms: ['Instagram Feed', 'Instagram Stories', 'Facebook Feed'],
    };

    return {
      product: name,
      archetype,
      emotional_angle: angle,
      audience: audienceTargeting,
      ads: hooks.slice(0, 3).map((hook, i) => ({
        id: `ad_${i + 1}`,
        hook,
        headline: headlines[i] || headlines[0],
        copy: copies[i * 2] || copies[0],
        creative: creatives[i] || creatives[0],
        cta: 'Comprar Ahora',
      })),
      hooks: hooks.slice(0, 10),
      copies: copies.slice(0, 10),
      headlines: headlines.slice(0, 10),
      creatives: creatives.slice(0, 5),
      suggestedBudget: {
        daily: '$20.000 - $50.000 COP',
        weekly: '$140.000 - $350.000 COP',
        objective: 'VENTAS (Conversiones)',
        pixel_event: 'Purchase',
        bid_strategy: 'Monto de costo por resultado más bajo',
      },
      recommendations: [
        'Empieza con $30.000/día durante 3 días para validar la creatividad',
        'Usa el hook #1 como texto principal y el headline #1 como título',
        'Segmenta a "Personas que viven en casa" + "Interesados en organización del hogar"',
        'Activa pago contra entrega como diferenciador en el copy',
      ],
    };
  }
}
