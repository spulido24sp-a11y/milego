const HOOK_TEMPLATES = {
  health: {
    headline: 'Transforma tu salud {product}',
    subheadline: 'Resultados visibles desde la primera semana. Fórmula natural respaldada por cientos de colombianos.',
    cta: '¡Quiero mejorar mi salud!',
  },
  beauty: {
    headline: 'Descubre tu mejor versión con {product}',
    subheadline: 'Realza tu belleza natural con ingredientes que amarán tu piel.',
    cta: 'Quiero verte hermosa',
  },
  home: {
    headline: 'El organizador que tu hogar necesita: {product}',
    subheadline: 'Recupera el orden y la armonía en tu casa en minutos.',
    cta: 'Ordena mi hogar ahora',
  },
  tech: {
    headline: '{product} — La tecnología que estabas esperando',
    subheadline: 'Innovación, rendimiento y diseño en un solo producto.',
    cta: 'Lo quiero ya',
  },
  fashion: {
    headline: 'Marca tendencia con {product}',
    subheadline: 'Estilo único con la calidad que mereces.',
    cta: 'Renueva mi estilo',
  },
  food: {
    headline: 'El sabor que estabas buscando: {product}',
    subheadline: 'Ingredientes seleccionados para los paladares más exigentes.',
    cta: 'Quiero probarlo',
  },
  general: {
    headline: '{product} — La solución que necesitas',
    subheadline: 'Calidad y precio justo, directo a tu puerta.',
    cta: 'Comprar ahora',
  },
};

const EMOTIONAL_ANGLES = {
  health:  'transformación personal y bienestar integral',
  beauty:  'amor propio y confianza',
  home:    'tranquilidad y armonía familiar',
  tech:    'eficiencia y modernidad',
  fashion: 'expresión personal y estilo único',
  food:    'placer y calidad de vida',
  general: 'satisfacción y tranquilidad',
};

const BENEFITS_TEMPLATES = {
  health: [
    'Ingredientes 100% naturales sin químicos agresivos',
    'Resultados visibles desde la primera semana',
    'Respaldo de expertos en salud y bienestar',
    'Fácil de incorporar a tu rutina diaria',
    'Satisfacción garantizada o te devolvemos tu dinero',
  ],
  beauty: [
    'Fórmula avanzada con ingredientes naturales',
    'Resultados profesionales desde casa',
    'Apto para todo tipo de piel',
    'Libre de parabenos y sulfatos',
    'Probado dermatológicamente',
  ],
  home: [
    'Fácil de instalar en minutos',
    'Materiales resistentes y duraderos',
    'Diseño elegante que combina con todo',
    'Ahorra espacio y mantén todo organizado',
    'Limpieza y mantenimiento sencillos',
  ],
  tech: [
    'Tecnología de última generación',
    'Fácil configuración lista para usar',
    'Compatible con todos tus dispositivos',
    'Diseño compacto y portátil',
    'Actualizaciones y soporte garantizados',
  ],
  fashion: [
    'Diseño exclusivo que marca la diferencia',
    'Materiales premium de alta durabilidad',
    'Cómodo y perfecto para el día a día',
    'Combinable con cualquier outfit',
    'Edición limitada — pocas unidades disponibles',
  ],
  food: [
    'Ingredientes seleccionados de origen natural',
    'Sabor artesanal como hecho en casa',
    'Empaque sellado que conserva la frescura',
    'Perfecto para cualquier momento del día',
    'Opción saludable sin sacrificar el sabor',
  ],
  general: [
    'Calidad premium que supera tus expectativas',
    'Precio justo directo de fábrica',
    'Envío gratis a toda Colombia',
    'Paga contra entrega sin riesgo',
    '30 días de garantía de satisfacción',
  ],
};

export class CopyGenerator {
  generateHooks(analysis, product) {
    const archetype = analysis.archetype;
    const tmpl = HOOK_TEMPLATES[archetype] || HOOK_TEMPLATES.general;
    const name = product.name || 'este producto';
    return {
      headline: tmpl.headline.replace('{product}', name),
      subheadline: tmpl.subheadline.replace('{product}', name.toLowerCase()),
      cta: tmpl.cta,
    };
  }

  generateBenefits(analysis) {
    return BENEFITS_TEMPLATES[analysis.archetype] || BENEFITS_TEMPLATES.general;
  }

  generatePricing(analysis, product) {
    const priceUnit = parseFloat(product.price) || 0;
    const margin = analysis.margin;

    const discount_x2 = margin >= 50 ? 15 : margin >= 30 ? 10 : 5;
    const discount_x3 = margin >= 50 ? 25 : margin >= 30 ? 18 : 10;

    const bundle_x2_price = Math.round(priceUnit * 2 * (1 - discount_x2 / 100));
    const bundle_x3_price = Math.round(priceUnit * 3 * (1 - discount_x3 / 100));
    const bundle_x2_savings = Math.round(priceUnit * 2 - bundle_x2_price);
    const bundle_x3_savings = Math.round(priceUnit * 3 - bundle_x3_price);

    return {
      price_unit: priceUnit,
      price_cost: parseFloat(product.cost_price) || 0,
      bundle_x2_price,
      bundle_x2_label: 'Paga 1 Lleva 2',
      bundle_x2_savings,
      bundle_x3_price,
      bundle_x3_label: 'Paga 2 Lleva 3',
      bundle_x3_savings,
      discount_pct: priceUnit > 0 ? Math.round((1 - bundle_x3_price / (3 * priceUnit)) * 100) : 0,
      has_free_shipping: true,
    };
  }

  generateSeo(analysis, product) {
    const name = product.name || 'Producto';
    const audience = analysis.audience[0] || 'colombianos';
    const slug = this._toSlug(name);

    return {
      title: `${name} | Compra Online en Colombia | MIleGo`,
      description: `Compra ${name.toLowerCase()} al mejor precio. ${audience}. Envío gratis a toda Colombia. Paga contra entrega. ${analysis.painPoints[0] || 'Calidad garantizada'}.`,
      keywords: [name, ...analysis.painPoints.slice(0, 2), 'comprar online', 'Colombia', 'MIleGo', 'envío gratis', 'pago contra entrega'],
      slug,
    };
  }

  generateFaqs(analysis) {
    const archetype = analysis?.archetype || 'general';
    const name = analysis?.name || 'este producto';

    const faqs = [
      {
        question: '¿Cuánto tiempo tarda el envío?',
        answer: 'El envío tarda entre 2 y 5 días hábiles dependiendo de tu ciudad. Hacemos envíos a toda Colombia.',
      },
      {
        question: '¿Cómo puedo pagar?',
        answer: 'Puedes pagar contra entrega (recibes el producto y pagas en efectivo al recibirlo) o por transferencia bancaria.',
      },
      {
        question: '¿Tiene garantía?',
        answer: 'Sí, todos nuestros productos tienen 30 días de garantía. Si no estás satisfecho, te devolvemos tu dinero.',
      },
      {
        question: '¿Hacen envíos a toda Colombia?',
        answer: 'Sí, enviamos a cualquier ciudad o municipio del país con nuestras alianzas de logística.',
      },
    ];

    if (archetype === 'health') {
      faqs.splice(1, 0, {
        question: `¿${name} tiene efectos secundarios?`,
        answer: `${name} está formulado con ingredientes naturales seguros. Siempre recomendamos consultar con un especialista si tienes condiciones médicas preexistentes.`,
      });
    }

    if (archetype === 'beauty') {
      faqs.splice(1, 0, {
        question: `¿${name} es apto para todo tipo de piel?`,
        answer: 'Sí, está diseñado para ser seguro y efectivo en todo tipo de piel, incluyendo piel sensible. Siempre recomendamos hacer una prueba en una pequeña área.',
      });
    }

    if (archetype === 'home' || archetype === 'tech') {
      faqs.splice(1, 0, {
        question: `¿Es fácil de instalar ${name}?`,
        answer: `Sí, ${name} está diseñado para instalarse en minutos sin necesidad de herramientas especiales ni conocimientos técnicos.`,
      });
    }

    return faqs;
  }

  generateTestimonials(analysis, product) {
    const name = product?.name || 'este producto';
    const archetype = analysis?.archetype || 'general';
    const testimonialsByArchetype = {
      home: [
        { name: 'María García', city: 'Bogotá', avatar: 'https://i.pravatar.cc/48?img=1', text: `${name} cambió mi clóset por completo. Antes todo era un desorden y no encontraba nada. Ahora cada cosa tiene su lugar y me visto en la mitad del tiempo.`, rating: 5 },
        { name: 'Carlos Martínez', city: 'Medellín', avatar: 'https://i.pravatar.cc/48?img=3', text: `Compré dos unidades y fue la mejor decisión. La calidad supera lo que esperaba por el precio. En 3 días lo tenía en mi casa. Pagué contra entrega.`, rating: 5 },
        { name: 'Ana Rodríguez', city: 'Cali', avatar: 'https://i.pravatar.cc/48?img=5', text: `Vivo en un apartamento pequeño y el espacio siempre fue un problema. Con ${name} dupliqué mi capacidad sin obras ni remodelaciones. 100% recomendado.`, rating: 5 },
        { name: 'Pedro Sánchez', city: 'Barranquilla', avatar: 'https://i.pravatar.cc/48?img=8', text: `Mi esposa compró uno y al verlo pedí otro para mi oficina. La relación calidad-precio es increíble.`, rating: 5 },
      ],
      health: [
        { name: 'Laura Mendoza', city: 'Bogotá', avatar: 'https://i.pravatar.cc/48?img=9', text: `En un mes ya veo resultados. Mi energía mejoró y mi ropa me queda mejor.`, rating: 5 },
        { name: 'Andrés Torres', city: 'Pereira', avatar: 'https://i.pravatar.cc/48?img=11', text: `Probé de todo y nada funcionaba como ${name}. Vale cada peso.`, rating: 5 },
      ],
      beauty: [
        { name: 'Camila Restrepo', city: 'Medellín', avatar: 'https://i.pravatar.cc/48?img=5', text: `Mi piel nunca había lucido así. ${name} se volvió parte de mi rutina diaria.`, rating: 5 },
      ],
      general: [
        { name: 'Cliente Verificado', city: 'Colombia', avatar: 'https://i.pravatar.cc/48?img=12', text: `Excelente producto. Llegó rápido y en perfecto estado. Muy recomendado.`, rating: 5 },
      ],
    };
    return testimonialsByArchetype[archetype] || testimonialsByArchetype.general;
  }

  getEmotionalAngle(analysis) {
    return EMOTIONAL_ANGLES[analysis.archetype] || EMOTIONAL_ANGLES.general;
  }

  _toSlug(text) {
    return text.toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, '')
      .replace(/[áéíóú]/g, c => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[c] || c)
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
