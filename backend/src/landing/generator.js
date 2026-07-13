import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { LIAMThemeEngine } from './theme-engine.js';
import { LIAMConversionCompiler } from './conversion-compiler.js';


const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_HEAD = readFileSync(join(__dirname, 'template-head.html'), 'utf-8');
const TEMPLATE_FOOT = readFileSync(join(__dirname, 'template-foot.html'), 'utf-8');

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(n) {
  if (!n || isNaN(n)) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function formatOldPrice(n) {
  if (!n || isNaN(n)) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

// Branded placeholder so missing product photos still look premium (not gray boxes)
function placeholderFor(name, category, size = 500) {
  const p = new URLSearchParams();
  if (name) p.set('label', String(name).slice(0, 60));
  if (category) p.set('sub', String(category).slice(0, 40));
  const q = p.toString();
  return `/api/placeholder/${size}${q ? `?${q}` : ''}`;
}

function renderHero(product, bp) {
  const offer = bp.offer || {};
  const marketing = bp.marketing || {};
  const hooks = marketing.hooks || [];
  const confidence = bp.confidence || 0;
  const priceUnit = parseFloat(offer.price_unit) || parseFloat(product.price) || 0;
  const images = (product.images || []).length > 0 ? product.images : [{ url: placeholderFor(product.name, product.category) }];
  const mainImage = images[0]?.url || placeholderFor(product.name, product.category);
  const productName = product.name || 'Producto';

  const oldPrice = priceUnit > 0 ? Math.round(priceUnit * 1.3) : 0;
  const discountPct = oldPrice > 0 ? Math.round((1 - priceUnit / oldPrice) * 100) : 0;

  const ctaText = hooks[2] || 'QUIERO EL MÍO AHORA';

  const bx2 = parseFloat(offer.bundle_x2_price);
  const bx3 = parseFloat(offer.bundle_x3_price);

  let priceHtml = '';
  if (priceUnit > 0) {
    priceHtml = `
          <div class="hero-price">
            <span class="hero-price-value">${formatPrice(priceUnit)}</span>
            <span class="hero-price-label">por unidad</span>
            ${oldPrice > 0 ? `<span class="hero-price-old">${formatOldPrice(oldPrice)}</span>` : ''}
            ${discountPct > 0 ? `<span class="hero-price-save">${discountPct}% OFF</span>` : ''}
          </div>`;
  }

  const stock = parseInt(product.stock, 10) || 0;
  const stockUrgency = stock > 0 && stock < 50 ? `🔥 Solo quedan ${stock} unidades — ${stock < 20 ? 'Últimos disponibles' : 'Disponibles hoy'}` : '';

  const socialProof = confidence >= 70
    ? '<span class="hero-tag-icon"><i class="fa-solid fa-circle-check"></i></span> +2.000 clientes satisfechos en Colombia'
    : '<span class="hero-tag-icon"><i class="fa-solid fa-circle-check"></i></span> Producto verificado';

  return `<section class="hero">
  <div class="hero-bg"></div>
  <div class="container">
    <div class="hero-grid">
      <div class="hero-content">
        <div class="hero-tag">${socialProof}</div>
        <h1 class="hero-title">${esc(hooks[0] || productName)}</h1>
        <p class="hero-subtitle">${esc(hooks[1] || `Compra ${productName} al mejor precio. Paga contra entrega.`)}</p>
        ${priceHtml}
        <div class="hero-cta-wrap">
          <a href="#checkout" class="btn btn-primary btn-lg hero-cta-pulse">${esc(ctaText)}</a>
        </div>
        <div class="hero-trust-micro">
          <span>✔ Pago contra entrega</span>
          <span>✔ Envío a toda Colombia</span>
          <span>✔ 30 días de garantía</span>
          <span>✔ Devolución gratis</span>
        </div>
        ${stockUrgency ? `<div class="hero-urgency">${stockUrgency}</div>` : ''}
        <div class="hero-carriers">
          <span class="hero-carriers-label">Envío con:</span>
          <span class="carrier-badge"><i class="fa-solid fa-truck"></i> Coordinadora</span>
          <span class="carrier-badge"><i class="fa-solid fa-truck"></i> Servientrega</span>
          <span class="carrier-badge"><i class="fa-solid fa-truck"></i> Interrapadísimo</span>
        </div>
      </div>
      <div class="hero-image-wrap">
        <div class="hero-glow"></div>
        <img src="${esc(mainImage)}" alt="${esc(productName)}" width="500" height="500" fetchpriority="high">
      </div>
    </div>
  </div>
</section>`;
}

function renderProblem(product, bp) {
  const customer = bp.customer || {};
  const archetype = customer.archetype || 'general';
  const painPoints = customer.pain_points || [];
  if (painPoints.length === 0) return '';

  const painDescriptionsByArchetype = {
    home: {
      'Espacio desordenado': 'Pasas más tiempo buscando tus cosas que usándolas. Tu clóset o tu casa parece un campo de batalla cada mañana.',
      'Falta de almacenamiento': 'Compraste organizadores que no funcionan, acumulas cosas y el espacio nunca es suficiente.',
      'Casa desorganizada': 'El desorden te genera estrés antes de empezar el día. Llegas tarde porque no encuentras lo que buscas.',
      'No encuentra lo que busca': 'Tu dinero se pierde comprando cosas repetidas porque no sabías que ya las tenías en casa.'
    },
    tech: {
      'Tecnología obsoleta': 'Dispositivos lentos, cables enredados y configuraciones confusas que te hacen perder tiempo y paciencia.',
      'Batería deficiente': 'Tener que vivir atado a un cargador de pared. El dispositivo se apaga cuando más lo necesitas.',
      'Mala conectividad': 'Cortes constantes y retraso en la transmisión que arruinan tu experiencia de entretenimiento o trabajo.',
      'Configuración compleja': 'Manuales eternos en otros idiomas y cables innecesarios para poner a funcionar lo que compraste.'
    },
    beauty: {
      'Piel apagada y sin vida': 'El cansancio y la contaminación se notan en tu rostro. Las cremas tradicionales solo humectan por encima.',
      'Manchas e imperfecciones': 'Ciertos brotes o marcas de expresión afectan tu confianza al mirarte al espejo y al salir de casa.',
      'Ingredientes agresivos': 'Productos llenos de químicos pesados y parabenos que irritan tu piel en lugar de cuidarla.',
      'Tratamientos costosos': 'Procedimientos de cabina impagables que exigen semanas de recuperación para ver un cambio mínimo.'
    },
    health: {
      'Falta de energía': 'Sentirte agotado desde la mañana. El cansancio no te permite concentrarte ni disfrutar el día con tu familia.',
      'Dolores constantes': 'Molestias en la espalda, articulaciones o cuello causadas por el estrés y la mala postura diaria.',
      'Dependencia de químicos': 'Consumir pastillas llenas de contraindicaciones que alivian un síntoma pero dañan otras partes de tu cuerpo.',
      'Falta de descanso': 'Dar vueltas en la cama por horas sin lograr un sueño reparador, despertándote más cansado de lo que te acostaste.'
    },
    fashion: {
      'Ropa rígida e incómoda': 'Prendas que se ven bien pero limitan tus movimientos y te hacen sentir acalorado durante el día.',
      'Desgaste rápido': 'Telas baratas que pierden su color y forma tras el primer lavado, obligándote a gastar más dinero.',
      'Diseños genéricos': 'Vestir igual que el resto. No encontrar prendas que reflejen tu personalidad única y buen gusto.',
      'Tallas inconsistentes': 'Prendas que no se ajustan a tu cuerpo y horman de manera extraña, restando elegancia a tu silueta.'
    },
    food: {
      'Comida procesada': 'Consumir alimentos llenos de sodio y conservantes químicos por falta de tiempo para cocinar de forma saludable.',
      'Falta de sabor': 'Dietas aburridas e insípidas que te hacen abandonar tus metas saludables al tercer día por frustración.',
      'Preparación lenta': 'Pasar horas en la cocina picando y cocinando ingredientes cuando tu tiempo libre es sumamente limitado.',
      'Desperdicio de comida': 'Verduras y carnes que se dañan en la nevera antes de que puedas cocinarlas de forma fresca.'
    },
    general: {
      'Productos de mala calidad': 'Gastar dinero en imitaciones baratas que se rompen o dejan de funcionar al mes de compradas.',
      'Proceso de compra inseguro': 'El miedo constante a comprar en internet y que nunca llegue tu pedido o te clonen la tarjeta.',
      'Envíos demorados': 'Esperar semanas sin saber el estado de tu pedido, con transportadoras que nunca responden.',
      'Sin garantía clara': 'Tiendas virtuales que desaparecen cuando necesitas cambiar un producto defectuoso o pedir soporte.'
    }
  };

  const currentDesc = painDescriptionsByArchetype[archetype] || painDescriptionsByArchetype.general;

  return `<section class="section" style="background:var(--bg-secondary);border-top:1px solid var(--border-color);">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>¿Te suena familiar?</h2>
        <p>Cada día es la misma historia de frustración. Te mereces una solución real. ${esc(product.name || '')} está aquí para ayudarte.</p>
      </div>
      <div class="benefits-grid">
        ${painPoints.slice(0, 4).map(p => {
          const detail = currentDesc[p] || currentDesc[Object.keys(currentDesc)[0]] || 'Un problema molesto que afecta tu tranquilidad y tu rutina diaria en Colombia.';
          return `<div class="card card-hover" data-reveal>
            <div class="card-icon"><i class="fa-solid fa-circle-exclamation" style="color:var(--brand-danger)"></i></div>
            <h3>${esc(p)}</h3>
            <p class="text-sm text-muted">${esc(detail)}</p>
          </div>`;
        }).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function renderEnemy(product, bp) {
  return `<section class="section">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>El verdadero enemigo</h2>
        <p>No es la falta de productos en el mercado. Es no encontrar el que realmente funciona para ti.</p>
      </div>
      <div style="max-width:640px;margin:0 auto;text-align:center;">
        <p class="text-lg" style="color:var(--text-secondary);line-height:var(--leading-relaxed);">
          Marcas que prometen milagros en publicidad pero entregan materiales baratos y resultados vacíos al abrir el paquete. 
          Te mereces honestidad. <strong>${esc(product.name || '')}</strong> fue diseñado bajo altos estándares para ofrecerte el resultado real que estás buscando hoy.
        </p>
      </div>
    </div>
  </section>`;
}

function renderTransformation(product, bp) {
  const productName = product.name || 'este producto';
  const customer = bp.customer || {};
  const archetype = customer.archetype || 'general';

  const transMap = {
    home: {
      before: [
        '❌ Pasabas 10+ minutos buscando tus cosas cada mañana',
        '❌ Tu hogar desordenado sin importar cuánto organizaras',
        '❌ Comprabas organizadores plásticos que se rompían al mes',
        '❌ Sentías frustración y estrés al llegar a tu propia casa'
      ],
      after: [
        '✅ Encuentras lo que buscas en 3 segundos. Garantizado.',
        '✅ Espacios ordenados y limpios que se mantienen solos',
        '✅ Solución resistente y duradera que eleva tu decoración',
        '✅ Empiezas y terminas tu día en un ambiente de armonía'
      ]
    },
    tech: {
      before: [
        '❌ Lidiabas con lentitud y configuraciones confusas',
        '❌ Cables tirados por todos lados y adaptadores costosos',
        '❌ Dispositivos rígidos que no se adaptan a tu espacio',
        '❌ Frustración constante por batería que no dura nada'
      ],
      after: [
        '✅ Disfrutas de rendimiento y fluidez inmediata',
        '✅ Espacio limpio, moderno y libre de desorden de cables',
        '✅ Diseño portátil que va contigo a donde lo necesites',
        '✅ Batería de larga duración para usar sin límites'
      ]
    },
    beauty: {
      before: [
        '❌ Gastabas fortunas en cremas mágicas que no daban resultados',
        '❌ Sentías inseguridad al salir de casa por brotes o manchas',
        '❌ Rutinas de maquillaje pesadas de 30 minutos para ocultar imperfecciones',
        '❌ Productos abrasivos que irritaban o resecaban tu rostro'
      ],
      after: [
        '✅ Piel visiblemente más luminosa, hidratada y saludable',
        '✅ Recuperas la confianza de lucir tu rostro al natural',
        '✅ Rutina de belleza simplificada y efectiva en 3 minutos',
        '✅ Nutrición profunda con ingredientes seguros para tu piel'
      ]
    },
    health: {
      before: [
        '❌ Sentías cansancio acumulado y dolores físicos al trabajar',
        '❌ Dependías de químicos fuertes que aliviaban por pocas horas',
        '❌ Noches de insomnio dando vueltas sin lograr descansar',
        '❌ Estrés muscular que arruinaba tu humor al final de la tarde'
      ],
      after: [
        '✅ Vitalidad renovada y cuerpo libre de dolores molestos',
        '✅ Bienestar natural prolongado sin efectos secundarios',
        '✅ Sueño reparador profundo para despertar lleno de energía',
        '✅ Músculos relajados y mente enfocada en lo importante'
      ]
    },
    fashion: {
      before: [
        '❌ Prendas rígidas que limitaban tus movimientos al caminar',
        '❌ Telas baratas que se estiraban y perdían color rápido',
        '❌ Vestías de forma idéntica a los demás sin exclusividad',
        '❌ Sudoración excesiva e incomodidad con materiales sintéticos'
      ],
      after: [
        '✅ Comodidad absoluta con libertad de movimiento total',
        '✅ Ropa que luce impecable y como nueva tras cada lavado',
        '✅ Estilo único y sofisticado que resalta tu personalidad',
        '✅ Frescura garantizada con fibras suaves y respirables'
      ]
    },
    food: {
      before: [
        '❌ Comías alimentos procesados dañinos por falta de tiempo',
        '❌ Comida insípida que te hacía romper tu dieta saludable',
        '❌ Pasabas horas de tu fin de semana picando e ingredientes',
        '❌ Gastabas de más pidiendo domicilios grasosos a domicilio'
      ],
      after: [
        '✅ Nutrición saludable hecha en casa en menos de 5 minutos',
        '✅ Sabores deliciosos que hacen fácil cuidar tu alimentación',
        '✅ Preparación ultra rápida sin ensuciar toda la cocina',
        '✅ Ahorro mensual masivo y vitalidad en tu digestión'
      ]
    },
    general: {
      before: [
        '❌ Comprabas imitaciones baratas que se dañaban de inmediato',
        '❌ Temías que te estafaran o robaran tus datos al pagar',
        '❌ Envíos eternos que tardaban semanas sin seguimiento',
        '❌ Nadie te respondía si el producto llegaba con fallas'
      ],
      after: [
        '✅ Producto original y duradero con garantía total de 30 días',
        '✅ Pago Contra Entrega: Paga seguro en efectivo al recibirlo',
        '✅ Envío express nacional con guía de rastreo activa',
        '✅ Soporte al cliente rápido por WhatsApp listo para ayudarte'
      ]
    }
  };

  const currentTrans = transMap[archetype] || transMap.general;

  return `<section class="section" style="background:var(--bg-secondary);border-top:1px solid var(--border-color);">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>Antes y después de usar ${esc(productName)}</h2>
        <p>La transformación real que cientos de colombianos ya experimentaron en su rutina diaria.</p>
      </div>
      <div class="before-after-grid">
        <div class="before-after-card" data-reveal style="text-align:center;padding:var(--space-8);border-radius:var(--radius-lg);border:1px solid var(--neutral-200);background:var(--neutral-0);">
          <span style="font-size:3rem;display:block;margin-bottom:var(--space-4);">😫</span>
          <h3 style="color:var(--brand-danger);margin-bottom:var(--space-3);">Antes de ${esc(productName)}</h3>
          <ul style="list-style:none;padding:0;text-align:left;font-size:var(--text-sm);color:var(--neutral-500);">
            ${currentTrans.before.map(li => `<li style="padding:var(--space-2) 0;border-bottom:1px solid var(--neutral-100);">${esc(li)}</li>`).join('\n            ')}
          </ul>
        </div>
        <div class="before-after-card" data-reveal style="text-align:center;padding:var(--space-8);border-radius:var(--radius-lg);border:2px solid var(--brand-accent);background:var(--neutral-0);">
          <span style="font-size:3rem;display:block;margin-bottom:var(--space-4);">😊</span>
          <h3 style="color:var(--brand-accent);margin-bottom:var(--space-3);">Después de ${esc(productName)}</h3>
          <ul style="list-style:none;padding:0;text-align:left;font-size:var(--text-sm);color:var(--neutral-500);">
            ${currentTrans.after.map(li => `<li style="padding:var(--space-2) 0;border-bottom:1px solid var(--neutral-100);">${esc(li)}</li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </div>
  </section>`;
}

function renderBenefits(product, bp) {
  const benefits = bp.content?.benefits || [];
  const customer = bp.customer || {};
  const archetype = customer.archetype || 'general';

  const benefitCopy = {
    // Home Archetype
    'Fácil de instalar en minutos': { icon: 'fa-solid fa-clock', desc: 'En menos de 5 minutos tu clóset o espacio está transformado. Sin taladros, sin herramientas, sin estrés.' },
    'Materiales resistentes y duraderos': { icon: 'fa-solid fa-shield-halved', desc: 'Olvídate de comprar organizadores o accesorios desechables. Este es el último que necesitarás.' },
    'Diseño elegante que combina con todo': { icon: 'fa-solid fa-wand-magic-sparkles', desc: 'Tu hogar se verá como de revista de decoración, con acabados estéticos de alto nivel.' },
    'Ahorra espacio y mantén todo organizado': { icon: 'fa-solid fa-expand', desc: 'Duplica la capacidad de almacenamiento disponible al instante sin remodelaciones.' },
    'Limpieza y mantenimiento sencillos': { icon: 'fa-solid fa-soap', desc: 'Material lavable o de fácil limpieza. Un paño húmedo y queda impecable.' },
    
    // Tech Archetype
    'Tecnología de última generación': { icon: 'fa-solid fa-microchip', desc: 'Equipado con los chips de procesamiento más recientes del mercado para un rendimiento óptimo.' },
    'Fácil configuración lista para usar': { icon: 'fa-solid fa-circle-play', desc: 'Plug and play. Sácalo de la caja, enciéndelo y conéctalo en segundos sin manuales eternos.' },
    'Compatible con todos tus dispositivos': { icon: 'fa-solid fa-mobile-screen-button', desc: 'Funciona perfectamente con iOS, Android, laptops, consolas de videojuegos y televisores.' },
    'Diseño compacto y portátil': { icon: 'fa-solid fa-expand-arrows-alt', desc: 'Llévalo en tu mochila a la oficina, a la universidad o de viaje sin ocupar espacio extra.' },
    'Actualizaciones y soporte garantizados': { icon: 'fa-solid fa-circle-check', desc: 'Garantía oficial y soporte técnico prioritario vía WhatsApp en Colombia.' },

    // Beauty Archetype
    'Fórmula avanzada con ingredientes naturales': { icon: 'fa-solid fa-leaf', desc: 'Nutrición profunda libre de toxinas, parabenos y químicos abrasivos para tu piel.' },
    'Resultados profesionales desde casa': { icon: 'fa-solid fa-sparkles', desc: 'Efecto spa de primer nivel en minutos, ahorrándote citas costosas de salón.' },
    'Apto para todo tipo de piel': { icon: 'fa-solid fa-hand-holding-heart', desc: 'Fórmula hipoalergénica testeada para ser segura en pieles sensibles y mixtas.' },
    'Libre de parabenos y sulfatos': { icon: 'fa-solid fa-ban', desc: 'Cuidado limpio y ético formulado respetando el PH natural de tu dermis.' },
    'Probado dermatológicamente': { icon: 'fa-solid fa-user-md', desc: 'Certificado bajo altos estándares clínicos para garantizar su eficacia real.' },

    // Health Archetype
    'Ingredientes 100% naturales sin químicos agresivos': { icon: 'fa-solid fa-seedling', desc: 'Fórmula libre de aditivos artificiales para cuidar tu organismo de forma segura.' },
    'Resultados visibles desde la primera semana': { icon: 'fa-solid fa-bolt', desc: 'Siente el aumento de energía y el alivio corporal real a los pocos días de uso constante.' },
    'Respaldo de expertos en salud y bienestar': { icon: 'fa-solid fa-award', desc: 'Recomendado por especialistas en Colombia para el cuidado diario.' },
    'Fácil de incorporar a tu rutina diaria': { icon: 'fa-solid fa-calendar-check', desc: 'Rutina simple de un paso para un bienestar sin complicaciones.' },
    'Satisfacción garantizada o te devolvemos tu dinero': { icon: 'fa-solid fa-shield-halved', desc: 'Compra 100% segura con garantía extendida de reembolso completo.' }
  };

  const defaultBenefitsByArchetype = {
    home: [
      { icon: 'fa-solid fa-gem', h3: 'Duplica el espacio de tu casa', desc: 'Instalación fácil e inmediata que duplica tu capacidad de almacenamiento sin reformas ni remodelaciones.' },
      { icon: 'fa-solid fa-truck', h3: 'Envío Gratis a tu puerta', desc: 'Despacho asegurado a nivel nacional con entrega express en 2 a 5 días hábiles.' },
      { icon: 'fa-solid fa-shield-halved', h3: 'Paga al Recibir en efectivo', desc: 'Cero riesgos. Pagas el producto en efectivo únicamente cuando el transportador te lo entregue.' }
    ],
    tech: [
      { icon: 'fa-solid fa-microchip', h3: 'Rendimiento inteligente', desc: 'Procesador de respuesta rápida que garantiza fluidez en todas tus tareas diarias.' },
      { icon: 'fa-solid fa-bolt', h3: 'Carga Express Inteligente', desc: 'Batería optimizada para largas jornadas de uso continuo con carga rápida.' },
      { icon: 'fa-solid fa-shield-halved', h3: 'Garantía MileGo de 1 Año', desc: 'Protección total ante cualquier defecto de fábrica con soporte prioritario por WhatsApp.' }
    ],
    beauty: [
      { icon: 'fa-solid fa-sparkles', h3: 'Piel luminosa al instante', desc: 'Fórmula de rápida absorción que aporta brillo y humectación natural sin sensación grasosa.' },
      { icon: 'fa-solid fa-user-md', h3: 'Clínicamente Testeado', desc: 'Formulación hipoalergénica aprobada para brindar la mayor seguridad a tu rostro.' },
      { icon: 'fa-solid fa-circle-check', h3: 'Pago Contra Entrega Seguro', desc: 'Pide hoy sin tarjetas. Pagas seguro al transportador en tu casa u oficina.' }
    ],
    health: [
      { icon: 'fa-solid fa-heartpulse', h3: 'Bienestar Natural Diario', desc: 'Ingredientes puros diseñados para revitalizar tu organismo y devolverte la energía.' },
      { icon: 'fa-solid fa-shield-halved', h3: 'Garantía de Satisfacción', desc: 'Prueba el producto sin riesgo. Si no ves resultados, te devolvemos tu dinero.' },
      { icon: 'fa-solid fa-truck', h3: 'Envío Rápido Coordinadora', desc: 'Logística integrada con las transportadoras líderes para entrega express en todo el país.' }
    ],
    general: [
      { icon: 'fa-solid fa-award', h3: 'Calidad Premium Certificada', desc: 'Seleccionamos los mejores fabricantes para asegurar que recibas un producto duradero.' },
      { icon: 'fa-solid fa-truck', h3: 'Envío Gratis Nacional', desc: 'Sin sorpresas al pagar. Envío gratis a cualquier rincón de Colombia.' },
      { icon: 'fa-solid fa-shield-halved', h3: 'Compra Contra Entrega Sin Riesgo', desc: 'No arriesgues tu dinero. Pagas seguro en efectivo en el momento de recibirlo.' }
    ]
  };

  const defaultList = defaultBenefitsByArchetype[archetype] || defaultBenefitsByArchetype.general;

  const items = benefits.length > 0
    ? benefits.slice(0, 5).map(b => {
        const copy = benefitCopy[b] || { 
          icon: archetype === 'tech' ? 'fa-solid fa-bolt' : archetype === 'beauty' ? 'fa-solid fa-sparkles' : archetype === 'health' ? 'fa-solid fa-heartpulse' : 'fa-solid fa-circle-check', 
          desc: `Un beneficio clave de ${product.name} diseñado para optimizar tu rutina diaria en Colombia.` 
        };
        return `<div class="card card-hover" data-reveal>
          <div class="card-icon"><i class="${copy.icon}"></i></div>
          <h3>${esc(b)}</h3>
          <p class="text-sm text-muted">${esc(copy.desc)}</p>
        </div>`;
      })
    : defaultList.map(b => `<div class="card card-hover" data-reveal>
        <div class="card-icon"><i class="${b.icon}"></i></div>
        <h3>${esc(b.h3)}</h3>
        <p class="text-sm text-muted">${esc(b.desc)}</p>
      </div>`);

  const subtitle = archetype === 'tech' 
    ? 'Tecnología e innovación diseñada para tu productividad y entretenimiento.'
    : archetype === 'beauty'
    ? 'Realza tu confianza y cuida tu piel con nuestra fórmula de alta conversión.'
    : archetype === 'health'
    ? 'Bienestar natural y vitalidad sin complicaciones para tu día a día.'
    : 'Beneficios premium que transforman tu rutina diaria y optimizan tu inversión.';

  return `<section id="benefits" class="section">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>¿Por qué elegir este producto?</h2>
        <p>${esc(subtitle)}</p>
      </div>
      <div class="benefits-grid">
        ${items.join('\n        ')}
      </div>
    </div>
  </section>`;
}

function renderTestimonials(product, bp) {
  const productName = product.name || 'este producto';
  const data = bp.content?.testimonials || [];
  if (data.length === 0) return ''; // sin reseñas reales: evitar nombres falsos
  const items = data.slice(0, 3);

  return `<section id="testimonials" class="testimonials section">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>Lo que dicen nuestros clientes</h2>
        <p>Colombianos como tú ya transformaron su hogar con ${esc(productName)}.</p>
      </div>
      <div class="testimonials-grid">
        ${items.map(t => `<div class="testimonial-card" data-reveal>
          <div class="testimonial-stars">${'★'.repeat(t.rating || 5)}</div>
          <p class="testimonial-text">"${esc(t.text)}"</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar"><img src="${esc(t.avatar)}" alt="${esc(t.name)}" width="48" height="48"></div>
            <div>
              <div class="testimonial-name">${esc(t.name)}</div>
              <div class="testimonial-location">${esc(t.city)}</div>
            </div>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function renderOffer(product, bp) {
  const offer = bp.offer || {};
  const priceUnit = parseFloat(offer.price_unit) || parseFloat(product.price) || 0;

  const tiers = [];

  if (priceUnit > 0) {
    const oldPrice = Math.round(priceUnit * 1.3);
    tiers.push(`<div class="pricing-card" data-reveal>
      <div class="pricing-label">Unitario</div>
      <div class="pricing-price">${formatPrice(priceUnit)}</div>
      <div class="pricing-old">${formatOldPrice(oldPrice)}</div>
      <div class="pricing-save">Ahorras ${formatPrice(Math.round(priceUnit * 0.3))}</div>
      <ul class="pricing-features">
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> 1 unidad</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Envío gratis</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Pago contra entrega</li>
      </ul>
      <a href="#checkout" class="btn btn-primary btn-block">Comprar Ahora</a>
    </div>`);
  }

  const bx2 = parseFloat(offer.bundle_x2_price);
  if (bx2 > 0) {
    const old2 = Math.round(priceUnit * 2);
    tiers.push(`<div class="pricing-card pricing-card-featured" data-reveal>
      <div class="pricing-badge">RECOMENDADO</div>
      <div class="pricing-label">${esc(offer.bundle_x2_label || 'Paga 1 Lleva 2')}</div>
      <div class="pricing-price">${formatPrice(bx2)}</div>
      <div class="pricing-old">${formatOldPrice(old2)}</div>
      <div class="pricing-save">Ahorras ${formatPrice(old2 - bx2)}</div>
      <ul class="pricing-features">
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> 2 unidades</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Mayor ahorro</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Envío gratis</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Pago contra entrega</li>
      </ul>
      <a href="#checkout" class="btn btn-primary btn-block">Comprar Ahora</a>
    </div>`);
  }

  const bx3 = parseFloat(offer.bundle_x3_price);
  if (bx3 > 0) {
    const old3 = Math.round(priceUnit * 3);
    tiers.push(`<div class="pricing-card pricing-card-featured" data-reveal>
      <div class="pricing-badge">MEJOR OFERTA</div>
      <div class="pricing-label">${esc(offer.bundle_x3_label || 'Paga 2 Lleva 3')}</div>
      <div class="pricing-price">${formatPrice(bx3)}</div>
      <div class="pricing-old">${formatOldPrice(old3)}</div>
      <div class="pricing-save">Ahorras ${formatPrice(old3 - bx3)}</div>
      <ul class="pricing-features">
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> 3 unidades</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Máximo ahorro</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Envío gratis</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Pago contra entrega</li>
      </ul>
      <a href="#checkout" class="btn btn-primary btn-block">Comprar Ahora</a>
    </div>`);
  }

  if (tiers.length === 0) {
    tiers.push(`<div class="pricing-card pricing-card-featured" data-reveal>
      <div class="pricing-badge">OFERTA</div>
      <div class="pricing-label">Precio Especial</div>
      <div class="pricing-price">${formatPrice(priceUnit)}</div>
      <ul class="pricing-features">
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Envío a todo Colombia</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> Pago contra entrega</li>
        <li><i class="fa-solid fa-check" style="color:var(--brand-accent)"></i> 30 días de garantía</li>
      </ul>
      <a href="#checkout" class="btn btn-primary btn-block">Comprar Ahora</a>
    </div>`);
  }

  return `<section id="pricing" class="section">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>Elige tu presentación</h2>
        <p>Selecciona la opción que mejor se adapte a ti.</p>
      </div>
      <div class="pricing-grid">${tiers.join('\n        ')}</div>
    </div>
  </section>`;
}

function renderGuarantee(product) {
  const productName = product.name || 'este producto';
  return `<section class="guarantee section">
    <div class="container">
      <div class="guarantee-content" data-reveal>
        <span class="guarantee-icon"><i class="fa-solid fa-shield-halved"></i></span>
        <h2>30 Días de Garantía. Sin Riesgo.</h2>
        <p>Prueba ${esc(productName)} durante 30 días en tu hogar. Si no ves la transformación que esperabas, te devolvemos cada peso. Sin preguntas, sin formularios, sin demoras.</p>
        <p style="font-size:var(--text-sm);color:rgba(255,255,255,0.45);margin-top:var(--space-4);">Así de simple. Porque confiamos en que ${esc(productName)} hablará por sí solo.</p>
      </div>
    </div>
  </section>`;
}

function renderFaq(blueprint) {
  const faqs = blueprint.content?.faq || [];

  return `<section class="section">
    <div class="container">
      <div class="section-header" data-reveal>
        <h2>Preguntas Frecuentes</h2>
        <p>Resuelve tus dudas antes de comprar.</p>
      </div>
      <div class="faq-container">
        ${faqs.map((f, i) => `
        <div class="faq-item" data-reveal>
          <button class="faq-trigger">${esc(f.question)} <i class="fa-solid fa-chevron-down"></i></button>
          <div class="faq-content"><div class="faq-content-inner">${esc(f.answer)}</div></div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function renderCta(product, bp) {
  const marketing = bp.marketing || {};
  const hooks = marketing.hooks || [];
  const productName = product.name || 'este producto';
  const ctaBtn = hooks[2] || 'Ordena ahora';

  return `<section class="cta section" data-reveal>
    <div class="container">
      <h2 class="h2 mb-4">¡Empieza a transformar tu hogar hoy!</h2>
      <p class="text-lg mb-6" style="color:rgba(255,255,255,0.75)">Pide ${esc(productName)} ahora, paga cuando lo recibas, y si no te encanta, te devolvemos tu dinero. Sin riesgo, sin excusas.</p>
      <a href="#checkout" class="btn btn-lg"><i class="fa-solid fa-cart-shopping"></i> ${esc(ctaBtn)}</a>
    </div>
  </section>`;
}

const BLOCK_RENDERERS = {
  hero: renderHero,
  problem: renderProblem,
  enemy: renderEnemy,
  transformation: renderTransformation,
  benefits: renderBenefits,
  testimonials: renderTestimonials,
  offer: renderOffer,
  guarantee: renderGuarantee,
  faq: renderFaq,
  cta: renderCta,
};

function buildPixelSnippet(pixelId, product, pageUrl) {
  if (!pixelId) return '';

  const productName = product.name || 'Producto';
  const bp = product.launch_blueprint || {};
  const offer = bp.offer || {};
  const priceUnit = parseFloat(offer.price_unit) || parseFloat(product.price) || 0;
  const productId = product.id || '';

  return `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->

<script>
fbq('track', 'ViewContent', {
  content_name: '${esc(productName)}',
  content_ids: ['${productId}'],
  content_type: 'product',
  value: ${priceUnit},
  currency: 'COP'
});
</script>`;
}

function renderTemplate(html, context) {
  let result = html;
  
  // 1. Resolver bucles: {{#each KEY}}...{{/each}}
  // Usamos RegExp simplificada y segura sin escapes de llaves conflictivos
  const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(loopRegex, (match, key, innerHtml) => {
    const list = context[key];
    if (!Array.isArray(list) || list.length === 0) return '';
    
    return list.map(item => {
      let renderedItem = innerHtml;
      Object.keys(item).forEach(prop => {
        renderedItem = renderedItem.replaceAll(`{{${prop}}}`, item[prop] !== null && item[prop] !== undefined ? String(item[prop]) : '');
      });
      return renderedItem;
    }).join('\n');
  });

  // 2. Reemplazar placeholders de variables simples
  Object.keys(context).forEach(key => {
    if (!Array.isArray(context[key])) {
      result = result.replaceAll(`{{${key}}}`, context[key] !== null && context[key] !== undefined ? String(context[key]) : '');
    }
  });

  return result;
}


export async function generateLanding(product, storeSettings) {
  const bp = product.launch_blueprint || {};
  const customer = bp.customer || {};
  const seo = bp.seo || {};
  const offer = bp.offer || {};
  const confidence = bp.confidence || 0;
  const slug = seo.slug || product.slug || `producto-${product.id}`;
  const siteUrl = (process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
  const pageUrl = `${siteUrl}/launch/${slug}`;
  const productName = product.name || 'Producto';
  const priceUnit = parseFloat(offer.price_unit) || parseFloat(product.price) || 0;
  const images = (product.images || []).length > 0 ? product.images : [{ url: placeholderFor(productName, product.category) }];
  const mainImage = images[0]?.url || placeholderFor(productName, product.category);
  const hooks = bp.marketing?.hooks || [];

  const conversionCompiler = new LIAMConversionCompiler();
  const trafficContext = product.traffic_context || { source: 'facebook' };
  const croConfig = await conversionCompiler.compileCRODecision(product, trafficContext);

  // P0: datos reales (sin placeholders falsos) — prueba social y WhatsApp desde la BD/entorno
  let _storeRow = null;
  let _orderCount = 0;
  try {
    const _orderRow = await db('orders').count('id as c').first();
    _orderCount = Number((_orderRow && _orderRow.c) || 0);
    if (product.store_id) _storeRow = await db('stores').where({ id: product.store_id }).first();
  } catch (e) {
    console.warn('[Landing] No se pudo cargar prueba social/WhatsApp:', e.message);
  }
  const _waRaw = (_storeRow && _storeRow.whatsapp_number)
    || (storeSettings && storeSettings.contact_whatsapp)
    || (process.env.WHATSAPP_DISPLAY_NUMBER || '');
  const _waDigits = _waRaw ? String(_waRaw).replace(/\D/g, '') : '';
  const WHATSAPP_LINK = _waDigits ? `https://wa.me/${_waDigits}` : '';
  const SOCIAL_PROOF = _orderCount > 0
    ? `+${_orderCount.toLocaleString('es-CO')} compras verificadas`
    : (confidence >= 70 ? 'Verificado por LIAM' : 'Producto verificado');
  const WHATSAPP_HERO_BTN = WHATSAPP_LINK
    ? `<a href="${WHATSAPP_LINK}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:#25D366;color:#fff;font-weight:700;padding:10px 14px;border-radius:8px;text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> Pregunta por WhatsApp</a>`
    : '';

  const activeTheme = bp.theme || 'stripe';

  // Cargar orden de bloques: 1. Blueprint, 2. theme.json, 3. Conversion Compiler CRO recipe
  let blocks = bp.blocks;
  if (!blocks) {
    const themeJsonPath = join(__dirname, 'themes', activeTheme, 'theme.json');
    if (existsSync(themeJsonPath)) {
      try {
        const themeConfig = JSON.parse(readFileSync(themeJsonPath, 'utf-8'));
        if (Array.isArray(themeConfig.blocks)) {
          blocks = themeConfig.blocks;
        }
      } catch (err) {
        console.warn(`[Theme Engine] Error reading theme.json for ${activeTheme}`, err);
      }
    }
    if (!blocks) {
      blocks = croConfig.blockOrder;
    }
  }



  const title = seo.title || `${productName} | Transforma tu hogar | MIleGo`;
  const metaDesc = seo.description || `Compra ${productName} al mejor precio en Colombia. Envío gratis, pago contra entrega, 30 días de garantía. ${SOCIAL_PROOF}.`;

  const pixelId = storeSettings?.meta_pixel_id || '';
  const pixelSnippet = buildPixelSnippet(pixelId, product, pageUrl);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: metaDesc,
    brand: { '@type': 'Brand', name: 'MIleGo' },
    offers: {
      '@type': 'Offer',
      price: priceUnit || 0,
      priceCurrency: 'COP',
      availability: (product.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: pageUrl,
    },
    ...(images[0]?.url ? { image: images[0].url } : {}),
  };

  const head = TEMPLATE_HEAD
    .replace(/{{PAGE_TITLE}}/g, esc(title))
    .replace(/{{META_DESCRIPTION}}/g, esc(metaDesc))
    .replace(/{{OG_TITLE}}/g, esc(title))
    .replace(/{{OG_DESCRIPTION}}/g, esc(metaDesc))
    .replace(/{{OG_IMAGE}}/g, esc(mainImage))
    .replace(/{{CANONICAL_URL}}/g, esc(pageUrl))
    .replace(/{{SCHEMA_JSON}}/g, JSON.stringify(schema))
    .replace(/{{PRODUCT_NAME}}/g, esc(productName))
    .replace(/{{HERO_IMAGE}}/g, esc(mainImage))
    .replace(/{{PIXEL_SNIPPET}}/g, pixelSnippet)
    .replace(/<body>/g, `<body class="theme-${activeTheme}">`);

  // Compilar el HTML del checkout real para inyectar si el bloque lo requiere
  const checkoutTitle = 'Último paso: completa tu pedido';
  const checkoutText = `Recibe ${esc(productName)} en la puerta de tu casa. Paga solo cuando lo recibas. Sin riesgos, sin tarjetas.`;
  const checkoutHtmlFormReal = `
    <form id="checkoutForm" class="checkout-form" style="display:flex; flex-direction:column; gap:12px;">
      <div class="form-group">
        <input type="text" id="billing_name" name="billing_name" class="form-input" placeholder="Nombre completo" required style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
      </div>
      <div class="form-group">
        <input type="tel" id="billing_phone" name="billing_phone" class="form-input" placeholder="Teléfono celular" required style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
      </div>
      <div class="form-group">
        <input type="text" id="billing_address" name="billing_address" class="form-input" placeholder="Dirección de entrega" required style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
      </div>
      <div class="form-group">
        <input type="text" id="billing_city" name="billing_city" class="form-input" placeholder="Ciudad / Municipio" required style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
      </div>
      <input type="hidden" id="productId" value="{{PRODUCT_ID}}">
      <button type="submit" class="btn btn-primary btn-block" style="padding:12px; font-weight:800; font-size:1rem; cursor:pointer;">CONFIRMAR MI PEDIDO</button>
    </form>`;

  const renderedBlocks = blocks.map(type => {
    const blockPath = join(__dirname, 'themes', activeTheme, `${type}.html`);
    if (existsSync(blockPath)) {
      try {
        const blockHtmlRaw = readFileSync(blockPath, 'utf-8');
        
        // Cargar variables
        const _offerOld = parseFloat(offer.old_price);
        const _compare = parseFloat(product.compare_price);
        const oldPrice = (_offerOld > priceUnit) ? Math.round(_offerOld)
          : (_compare > priceUnit ? Math.round(_compare) : 0);
        const discountPct = oldPrice > 0 ? Math.round((1 - priceUnit / oldPrice) * 100) : 0;
        const ctaText = croConfig.cta || hooks[2] || 'QUIERO EL MÍO AHORA';
        const stock = parseInt(product.stock, 10) || 0;
        const stockUrgency = croConfig.urgency || (stock > 0 && stock < 50 ? `quedan ${stock} unidades al precio de lanzamiento` : 'últimas unidades disponibles al precio promocional');


        // Mapear arrays para bucles
        const faqItems = (bp.content?.faq || []).map(f => ({
          faqQuestion: esc(f.question),
          faqAnswer: esc(f.answer)
        }));

        const benefitItems = (bp.customer?.pain_points || []).slice(0, 4).map((p, idx) => {
          const desires = bp.customer?.desires || [];
          return {
            benefitTitle: esc(p),
            benefitText: esc(desires[idx] || 'Garantiza un resultado ideal para tu estilo de vida en Colombia.')
          };
        });

        const galleryImages = images.map((img, idx) => ({
          imageUrl: esc(img.url || img),
          imageAlt: `${esc(productName)} Gallery Image ${idx + 1}`
        }));

        // Configurar los bundles
        const bundleTiers = [
          {
            activeClass: 'active',
            tierPriceValue: priceUnit,
            tierPriceFormatted: formatPrice(priceUnit),
            tierLabel: 'Llevar 1 Unidad',
            tierSub: 'Prueba básica'
          }
        ];
        if (priceUnit > 0) {
          bundleTiers.push({
            activeClass: '',
            tierPriceValue: Math.round(priceUnit * 1.7),
            tierPriceFormatted: formatPrice(Math.round(priceUnit * 1.7)),
            tierLabel: 'Llevar 2 Unidades (Paga 1 Lleva 2)',
            tierSub: 'Recomendado'
          });
        }

        const context = {
          PRODUCT_ID: esc(product.id),
          PRODUCT_NAME: esc(productName),
          PRODUCT_PRICE: formatPrice(priceUnit),
          OFFER_PRICE: formatPrice(priceUnit),
          OLD_PRICE: formatPrice(oldPrice),
          DISCOUNT_PCT: discountPct,
          PRODUCT_IMAGE: esc(mainImage),
          CTA_TEXT: esc(ctaText),
          STOCK_URGENCY: esc(stockUrgency),
          PRODUCT_SUBTITLE: esc(hooks[1] || product.short_description || product.description || `Compra ${productName} al mejor precio. Paga contra entrega.`),
          PRODUCT_DESCRIPTION: esc(hooks[1] || product.description || product.short_description || ''),
          CHECKOUT_FORM: checkoutHtmlFormReal,
          FAQ_ITEMS: faqItems,
          BENEFIT_ITEMS: benefitItems,
          GALLERY_IMAGES: galleryImages,
          BUNDLE_TIERS: bundleTiers,
          WHATSAPP_LINK,
          SOCIAL_PROOF,
          WHATSAPP_HERO_BTN
        };

        return renderTemplate(blockHtmlRaw, context);
      } catch (err) {
        console.warn(`[Theme Engine] Error rendering modular block ${type} for theme ${activeTheme}`, err);
      }
    }

    // Fallback al renderizador por defecto
    const renderer = BLOCK_RENDERERS[type];
    return renderer ? renderer(product, bp) : '';
  }).filter(Boolean).join('\n\n');

  const whatsappButton = WHATSAPP_LINK
    ? `<a class="wa-float" href="${WHATSAPP_LINK}" target="_blank" rel="noopener" aria-label="Hablar por WhatsApp" style="position:fixed;bottom:20px;right:20px;z-index:9999;display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-weight:700;padding:12px 16px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.25);font-family:inherit;"><i class="fa-brands fa-whatsapp" style="font-size:20px;"></i><span>Hablar por WhatsApp</span></a>`
    : '';

  let foot = TEMPLATE_FOOT
    .replace(/{{PAGE_TITLE}}/g, esc(title))
    .replace(/{{PRODUCT_ID}}/g, esc(product.id))
    .replace(/{{PRODUCT_NAME}}/g, esc(productName))
    .replace(/{{FOOTER_DESC}}/g, `Transformamos hogares colombianos con productos inteligentes. Pago contra entrega, envío a todo el país.`)
    .replace(/{{CHECKOUT_TITLE}}/g, esc(checkoutTitle))
    .replace(/{{CHECKOUT_TEXT}}/g, esc(checkoutText))
    .replace(/{{CHECKOUT_OPTIONS}}/g, '')
    .replace(/{{CHECKOUT_TOTAL}}/g, priceUnit > 0 ? formatPrice(priceUnit) : '')
    .replace(/{{CHECKOUT_TOTAL_VALUE}}/g, priceUnit || '')
    .replace(/{{OFFER_PRICE}}/g, formatPrice(priceUnit))
    .replace(/{{WHATSAPP_BUTTON}}/g, whatsappButton);

  const html = head + '\n' + renderedBlocks + '\n' + foot;

  return {
    html,
    meta: {
      title,
      description: metaDesc,
      slug,
      url: pageUrl,
      keywords: seo.keywords || [],
      blocks,
      confidence,
      theme: activeTheme,
      margin: priceUnit > 0 && product.cost_price ? Math.round(((priceUnit - product.cost_price) / priceUnit) * 100) : 0,
      version: bp.version || 1,
    },
  };
}

