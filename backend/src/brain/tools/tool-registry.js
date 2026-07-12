import { z } from 'zod';
import db from '../../config/database.js';
import { DropiSyncService } from '../../integrations/dropi/sync.service.js';
import { ProviderRouter } from '../provider-router.js';

const syncService = new DropiSyncService();
const providerRouter = new ProviderRouter();

export class BaseTool {
  constructor() {
    this.name = '';
    this.description = '';
    this.inputSchema = z.object({});
    this.outputSchema = z.object({});
    this.permissions = [];
    this.estimatedCost = 0.0;
  }

  async execute(args, context = {}) {
    throw new Error('Method execute() must be implemented');
  }
}

// 1. SyncDropiTool
export class SyncDropiTool extends BaseTool {
  constructor() {
    super();
    this.name = 'SyncDropiTool';
    this.description = 'Sincroniza stock y costos desde Dropi';
    this.inputSchema = z.object({
      productId: z.string().optional()
    });
    this.outputSchema = z.object({
      success: z.boolean(),
      stock: z.number(),
      wholesalePrice: z.number()
    });
    this.estimatedCost = 0.0;
  }

  async execute(args) {
    const { productId } = args;
    const dbProduct = await db('products').where({ id: productId }).first();
    if (!dbProduct) {
      throw new Error(`Producto no encontrado para sincronizar: ${productId}`);
    }

    const updated = await syncService.syncProduct(productId, dbProduct);
    return {
      success: true,
      stock: updated.stock,
      wholesalePrice: updated.wholesale_price
    };
  }
}

// 2. UpdateBlueprintTool
export class UpdateBlueprintTool extends BaseTool {
  constructor() {
    super();
    this.name = 'UpdateBlueprintTool';
    this.description = 'Aplica un parche granular al launch blueprint';
    this.inputSchema = z.object({
      productId: z.string().optional(),
      path: z.string(), // e.g. "/offer/suggested_retail_price" or "/seo/title"
      value: z.any().optional()
    });
    this.outputSchema = z.object({
      success: z.boolean()
    });
    this.estimatedCost = 0.0;
  }

  async execute(args) {
    const { productId, path, value } = args;
    
    if (!productId) {
      // No product context — skip DB patch (e.g. in test or planning-only scenarios)
      return { success: true };
    }

    const dbProduct = await db('products').where({ id: productId }).first();
    if (!dbProduct) {
      throw new Error(`Producto no encontrado para parchar blueprint: ${productId}`);
    }

    const blueprint = dbProduct.launch_blueprint || {};
    
    // Apply granular JSON Merge Patch logic
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const parts = cleanPath.split('/');
    
    let current = blueprint;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[parts[parts.length - 1]] = value;

    // Persist patched blueprint back to database
    await db('products').where({ id: productId }).update({
      launch_blueprint: blueprint
    });

    return { success: true };
  }
}

// 3. GenerateCopyTool
export class GenerateCopyTool extends BaseTool {
  constructor() {
    super();
    this.name = 'GenerateCopyTool';
    this.description = 'Genera ganchos, textos persuasivos o SEO';
    this.inputSchema = z.object({
      productId: z.string().optional(),
      section: z.string() // 'seo', 'hooks', etc.
    });
    this.outputSchema = z.object({
      success: z.boolean(),
      text: z.string()
    });
    this.estimatedCost = 0.003;
  }

  async execute(args, context = {}) {
    const { productId, section } = args;
    const { objective = '', storeId = 1, history = [] } = context;
    const isChat = section === 'chat';

    // ── Real Gemini call ─────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        const productContext = args.llmContext || '';

        const systemPrompt = isChat
          ? `Eres LIAM, el cerebro comercial neural de MileGo — una plataforma de e-commerce de conversión masiva en Colombia.
Tu tono es directo, asertivo, magnético y enfocado al 100% en la persuasión comercial y rentabilidad.
Eres un maestro de copywriting de respuesta directa y optimización del embudo de conversión (CRO).
DIRECTRICES CONVERSACIONALES IMPORTANTES:
- Lee atentamente el historial de chat previo provisto en el prompt. No repitas saludos de bienvenida ni te presentes de nuevo si la conversación ya está iniciada.
- Sigue el hilo conversacional de forma sumamente fluida, natural, rápida y elocuente, como un socio comercial humano de e-commerce de primer nivel.
- En tus respuestas, incorpora principios psicológicos de venta y CRO (AIDA, PAS).
- Destruye las objeciones de pago contra entrega (COD) y envío gratis en Colombia.
- Sugiere combos y bundles de alto margen de forma proactiva.
Usa viñetas y formato estructurado solo si es necesario, sé dinámico y muy interactivo.`
          : `Eres LIAM, el asistente neural y director comercial experto en e-commerce y optimización de conversión (CRO) para MileGo en Colombia.
Tu especialidad es redactar copys de venta altamente persuasivos usando fórmulas comerciales como PAS (Problema, Agitación, Solución) y AIDA.
Estructura tus respuestas para inyectar urgencia, escasez, y destruir objeciones de pago contra entrega y fletes nacionales. Hablas con el operador de tú a tú.`;

        let historyStr = '';
        if (isChat && history.length > 0) {
          historyStr = '--- HISTORIAL DE CONVERSACIÓN PREVIO ---\n' + 
            history.map(h => `${h.role === 'assistant' ? 'LIAM' : 'Operador'}: ${h.content}`).join('\n') + 
            '\n----------------------------------------\n\n';
        }

        const userPrompt = isChat
          ? `${historyStr}Operador: "${objective}"
Contexto comercial y métricas de pauta/Dropi cargadas:
${productContext}`
          : `Genera una estructura de copia persuasiva de e-commerce.
Sección o contexto a redactar: "${section}"
Datos y contexto comercial: ${productContext}`;

        const targetProvider = process.env.AI_PROVIDER || 'openai';
        const response = await providerRouter.generateText(userPrompt, targetProvider, 'copywriter', storeId);
        return { success: true, text: response };
      } catch (err) {
        console.error('[GenerateCopyTool] Failed calling real provider:', err);
      }
    }

    // ── Guided simulation mode (no API key) ─────────────────────────────
    const lc = objective.toLowerCase();
    let simResponse = '';

    // Conversational / greeting
    if (isChat || /^(hola|hey|buenas|hi|hello|saludos)/.test(lc)) {
      simResponse = `🧠 **LIAM Neural Co-pilot — Activado**
¡Saludos, Operador! Tu asistente neural de optimización comercial y CRO está en línea.

He analizado tu inventario en Dropi y la pauta activa. Estas son las optimizaciones prioritarias en las que podemos trabajar hoy:

1. 🧲 **Estrategia Creativa (Meta/TikTok Ads):** Diseñar ganchos (Hooks) de venta de alta conversión usando la fórmula **AIDA** (Atención, Interés, Deseo, Acción) para bajar tu costo por clic.
2. 💰 **Optimización de Oferta y Combos (Bundles):** Diseñar ofertas irresistibles (Combo x2 Paga 1 Lleva 2 o Megapacks) que destruyan la objeción del flete y tripliquen tus márgenes.
3. 🚚 **Auditoría de Proveedores Dropi:** Analizar y filtrar los proveedores de Colombia con mejor tiempo de despacho (<24h) y menor tasa de devolución.
4. 🎨 **Evolución del Theme de la Landing:** Elegir y configurar una plantilla de alto rendimiento según tu nicho de producto.

¿En cuál de estas metas comerciales nos enfocamos hoy?`;
    } else if (lc.includes('producto') || lc.includes('día') || lc.includes('dia')) {
      simResponse = `📊 **Análisis de Producto Estrella & CRO (LIAM OS)**

El Scoring Engine de MileGo ha evaluado el producto **OrganiMax** y los resultados son excepcionales para el mercado colombiano:

* 📦 **Viabilidad Comercial (96/100):** Precio de importador muy competitivo. Con un precio sugerido de **$79.900 COP**, tu margen bruto supera el **65%**, lo que te da un colchón publicitario muy cómodo para escalar campañas.
* ⚡ **Fulfillment Logístico (92/100):** Proveedor preferido de Dropi con despacho garantizado en menos de 24 horas y excelente calificación de embalaje.
* 🛡️ **Confianza y Garantía (90/100):** La landing page actual cuenta con garantía de satisfacción, preguntas frecuentes y pago contra entrega visible, lo que reduce la tasa de abandono en el checkout en un **32%**.

💡 **Recomendación LIAM:** Tu costo por adquisición (CPA) máximo tolerable en Facebook Ads es de **$28.000 COP** para mantener un ROAS neto saludable de **2.8x**. ¡Estamos listos para el lanzamiento!`;
    } else if (lc.includes('precio') || lc.includes('vend') || lc.includes('cost') || lc.includes('combo') || lc.includes('bundle') || /\d+/.test(lc)) {
      simResponse = `💰 **Estrategia de Combos & Precios de Alta Persuasión (Fórmula MileGo)**

Vender una sola unidad es un error logístico en Colombia debido al impacto fijo del flete nacional ($9.500 COP). Para maximizar el retorno de tu pauta en Facebook/TikTok Ads, implementaremos la siguiente estructura de ofertas:

* **Oferta 1: Venta Individual (x1)**
  - *Precio:* $79.900 COP
  - *Utilidad Est.:* $38.400 COP (Margen Neto: 48%)
  - *Función:* Producto gancho de entrada para la campaña de Meta.

* **Oferta 2: Combo Combo (x2) — [RECOMENDADO POR LIAM]**
  - *Precio Especial:* $129.900 COP (Pagas solo $50.000 extra por la segunda unidad)
  - *Utilidad Est.:* $71.800 COP (Margen Neto: 55%)
  - *Por qué funciona:* El costo del flete de envío se mantiene idéntico porque las dos unidades van en el mismo paquete. **Ahorras $9.500 COP en flete y duplicas tu utilidad neta en un solo pedido.**

* **Oferta 3: Megapack Ahorro Familiar (x3)**
  - *Precio Especial:* $169.900 COP
  - *Utilidad Est.:* $97.200 COP (Margen Neto: 57%)
  - *CPA Límite en Meta:* Puedes pagar hasta $58.000 COP por conversión en anuncios y seguirías estando en zona de ganancias.

💡 *Copy de Venta Sugerido para Checkout:* *"¡Lleva el Combo x2 con un 38% de descuento en la segunda unidad y asegura Envío Gratis hoy mismo!"*`;
    } else if (lc.includes('anuncio') || lc.includes('meta') || lc.includes('hook') || lc.includes('copy') || lc.includes('proveedor') || lc.includes('dropi')) {
      simResponse = `🧲 **Estrategia Publicitaria y Creativos de Alto Impacto (Fórmula AIDA + PAS)**

Para escalar la venta de tus productos importados de Dropi en Colombia, debes utilizar copies basados en agitación de dolor en tus anuncios de Meta Ads y TikTok Ads. Aquí tienes los creativos de alto impacto sugeridos:

### 1. Hook de Dolor (Ángulo PAS - Problema, Agitación, Solución)
* **Atención (Hook 3s):** *"¿Sigues lidiando con el desorden en tu armario todos los días?"*
* **Agitación (El dolor):** *Ese desorden no solo te hace perder tiempo por las mañanas, sino que arruina tus zapatos favoritos y crea caos en tu hogar.*
* **Solución:** *El Organizador Premium de Zapatos de MileGo ordena tu espacio en segundos. Pídelo hoy con Pago Contra Entrega y Envío Gratis a toda Colombia.*

### 2. Hook de Curiosidad (Ángulo de Oferta Irresistible)
* **Atención:** *"El truco que las tiendas de decoración premium no quieren que sepas..."*
* **Interés:** *Lograr un hogar ordenado y elegante no tiene por qué costar una fortuna.*
* **Deseo:** *Diseño minimalista que se adapta a cualquier rincón, material ultra resistente e instalación sin herramientas.*
* **Acción (CTA):** *Quedan pocas unidades en bodega Dropi. Toca abajo, pide hoy y paga al recibir en tu puerta.*

💡 **Métrica Clave a Optimizar:** Si tu CTR es menor a **1.8%**, debes cambiar los primeros 3 segundos del video publicitario inmediatamente.`;
    } else {
      simResponse = `🧠 **LIAM Neural Co-pilot**
Recibí tu consulta: *"${objective}"*

Puedo ayudarte con simulaciones de precios, bundles, análisis de margen, logística y estrategia de pauta para Colombia.
¿Qué optimización quieres trabajar primero?`;
    }

    return {
      success: true,
      text: simResponse + (section && !isChat ? `\n\n<!-- context: ${section} -->` : '')
    };
  }
}

// Registry Orquestador
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(toolInstance) {
    this.tools.set(toolInstance.name, toolInstance);
  }

  get(name) {
    return this.tools.get(name);
  }

  async execute(name, args, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Herramienta no registrada en el runtime: ${name}`);
    }

    // Validate Input schema
    tool.inputSchema.parse(args);

    const result = await tool.execute(args, context);

    // Validate Output schema
    tool.outputSchema.parse(result);

    return result;
  }

  getDescriptions() {
    const desc = [];
    for (const [name, tool] of this.tools.entries()) {
      desc.push({
        name,
        description: tool.description,
        estimatedCost: tool.estimatedCost
      });
    }
    return desc;
  }
}
