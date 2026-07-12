const ARCHETYPE_KEYWORDS = {
  health:   ['salud', 'bienestar', 'vitamina', 'suplemento', 'natural', 'orgánico', 'medicina', 'terapia', 'relajación', 'masaje', 'ejercicio', 'fitness', 'dieta', 'nutrición', 'colágeno', 'proteína'],
  beauty:   ['belleza', 'cosmético', 'maquillaje', 'crema', 'sérum', 'shampoo', 'cabello', 'piel', 'facial', 'antiaging', 'perfume', 'labial', 'uñas', 'hidratante'],
  home:     ['hogar', 'casa', 'organizador', 'cocina', 'baño', 'dormitorio', 'mueble', 'decoración', 'limpieza', 'almacenamiento', 'estante', 'clóset', 'armario'],
  tech:     ['tecnología', 'electrónico', 'cargador', 'audífono', 'celular', 'tablet', 'laptop', 'gadget', 'smart', 'bluetooth', 'USB', 'digital', 'robot', 'inteligente'],
  fashion:  ['moda', 'ropa', 'zapato', 'accesorio', 'bolso', 'reloj', 'joyería', 'vestido', 'camisa', 'pantalón', 'gorra', 'mochila', 'cartera'],
  food:     ['comida', 'alimento', 'bebida', 'snack', 'gourmet', 'café', 'té', 'chocolate', 'deshidratado', 'orgánico', 'salsa', 'condimento'],
};

const ARCHETYPE_AUDIENCE = {
  health:  ['Personas que buscan mejorar su salud', 'Familias conscientes de su bienestar', 'Deportistas y fitness'],
  beauty:  ['Mujeres interesadas en cuidado personal', 'Personas de 25-50 años', 'Consumidores de cosmética natural'],
  home:    ['Dueños de casa', 'Familias', 'Personas organizadas', 'Compradores de hogar'],
  tech:    ['Hombres 18-45 años', 'Geeks y early adopters', 'Profesionales'],
  fashion: ['Mujeres 18-40 años', 'Jóvenes urbanos', 'Amantes de la moda'],
  food:    ['Amantes de la cocina', 'Personas saludables', 'Familias'],
  general: ['Público general', 'Compradores online', 'Colombianos'],
};

const ARCHETYPE_PAIN_POINTS = {
  health:  ['Falta de energía', 'Problemas de sueño', 'Estrés diario', 'Malos hábitos alimenticios'],
  beauty:  ['Piel maltratada', 'Cabello dañado', 'Falta de tiempo para cuidado personal', 'Productos caros que no funcionan'],
  home:    ['Espacio desordenado', 'Falta de almacenamiento', 'Casa desorganizada', 'No encuentra lo que busca'],
  tech:    ['Tecnología obsoleta', 'Cables enredados', 'Batería que no dura', 'Dispositivos lentos'],
  fashion: ['Ropa desactualizada', 'No encuentra su estilo', 'Ropa de baja calidad', 'Precios elevados'],
  food:    ['Come mal por falta de tiempo', 'Snacks poco saludables', 'Comida sin sabor', 'Dieta aburrida'],
  general: ['Necesita una solución práctica', 'Busca calidad-precio', 'Quiere algo diferente'],
};

const ARCHETYPE_LEVERS = {
  health:  ['salud', 'confianza', 'resultados', 'bienestar', 'testimonios'],
  beauty:  ['autoestima', 'transformación', 'exclusividad', 'resultados', 'calidad'],
  home:    ['orden', 'practicidad', 'ahorro-espacio', 'confort', 'durabilidad'],
  tech:    ['innovación', 'velocidad', 'conveniencia', 'estatus', 'eficiencia'],
  fashion: ['estilo', 'tendencia', 'exclusividad', 'identidad', 'calidad'],
  food:    ['sabor', 'salud', 'practicidad', 'natural', 'variedad'],
  general: ['calidad', 'confianza', 'precio', 'garantía', 'facilidad'],
};

export class ProductAnalyzer {
  analyze(product) {
    const name = (product.name || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const text = `${name} ${description}`;

    const archetype = this._detectArchetype(text);
    const price = parseFloat(product.price) || 0;
    const costPrice = parseFloat(product.cost_price) || 0;

    return {
      archetype,
      audience: ARCHETYPE_AUDIENCE[archetype],
      priceTier: this._getPriceTier(price),
      levers: ARCHETYPE_LEVERS[archetype],
      painPoints: ARCHETYPE_PAIN_POINTS[archetype],
      margin: costPrice > 0 ? Math.round(((price - costPrice) / price) * 100) : 0,
    };
  }

  _detectArchetype(text) {
    const scores = {};
    for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
      scores[archetype] = keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return best[0][1] > 0 ? best[0][0] : 'general';
  }

  _getPriceTier(price) {
    if (price < 30000) return 'impulse';
    if (price < 80000) return 'básico';
    if (price < 150000) return 'estándar';
    if (price < 500000) return 'premium';
    return 'ultra_premium';
  }
}
