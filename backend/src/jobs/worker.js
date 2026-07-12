import { dequeue, complete, fail, enqueue } from './queue.js';
import { ProductService } from '../services/product.service.js';
import { LaunchEngine } from '../launch-engine/index.js';
import { OrderConfirmationService } from '../services/order-confirmation.service.js';
import { LIAMRuntime } from '../brain/liam-runtime.js';
import { publishLanding } from '../landing/publisher.js';
import { bus } from '../events/index.js';

const handlers = {};

export function registerHandler(jobType, handlerFn) {
  handlers[jobType] = handlerFn;
}

// 1. Register background job handlers
const productService = new ProductService();
const engine = new LaunchEngine();
const liam = new LIAMRuntime();

registerHandler('process_launch_blueprint', async (payload) => {
  const { productId } = payload;
  const product = await productService.getById(productId);
  if (!product) {
    console.warn(`[LIAM] producto #${productId} no encontrado — se omite`);
    return;
  }

  const rawData = {
    name: product.name,
    sku: product.sku || 'SKU-GEN',
    slug: product.slug,
    description: product.description || '',
    wholesale_price: product.price ? Math.round(product.price * 0.4) : 10000,
    suggested_retail_price: product.price || 29900,
    stock: product.stock || 100,
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    weight: 1.5
  };

  // 1. Blueprint de lanzamiento (contenido base de la landing)
  const processed = await engine.process('manual', rawData);
  const blueprint = processed.brain_analysis || {};

  // 2. LIAM decide — ReasoningEngine + ScoringEngine + proveedor (Gemini/mock)
  //    Evalúa margen, logística, calidad de datos y ROAS, y emite un
  //    veredicto comercial (PROCEED / PROCEED_WITH_CAUTION / BLOCK).
  let decision = null;
  try {
    const liamResult = await liam.processRequest({
      objective: 'Analiza este producto de Dropi: calcula margen y costo, evalúa la logística y la calidad de datos, y decide si proceder a publicarlo y dejarlo listo para vender.',
      context: { productId: String(productId) },
      storeId: product.store_id || 1
    });

    const r = liamResult.reasoning || {};
    const s = liamResult.scoring || {};

    // Mapea el veredicto de LIAM a una acción comercial ejecutable
    const ACTION = {
      PROCEED:               'ESCALAR',
      PROCEED_WITH_CAUTION: 'TESTEAR',
      BLOCK:                 'MEJORAR_OFERTA'
    };

    decision = {
      recommendation:  ACTION[r.recommendation] || 'TESTEAR',
      liam_verdict:   r.recommendation || null,
      grade:           s.grade ?? null,
      confidence:      s.confidence ?? null,
      isLaunchReady:  s.isLaunchReady ?? null,
      findings:       (r.findings || []).map((f) => f.detail),
      decidedAt:       new Date().toISOString()
    };
  } catch (err) {
    console.warn(`[LIAM] No se pudo obtener la decisión de LIAM para #${productId}:`, err.message);
  }

  blueprint.liam_decision = decision;
  await productService.update(productId, { launch_blueprint: blueprint });

  // 3. LIAM decide si publicar. Si bloquea (BLOCK), deja el producto
  //    como borrador hasta que se mejore — sin intervención manual forzosa.
  let published = null;
  const verdict = decision?.liam_verdict;
  if (verdict && verdict !== 'BLOCK') {
    try {
      published = await publishLanding(productId);
    } catch (err) {
      console.warn(`[LIAM] Fallo la publicación de landing para #${productId}:`, err.message);
    }
  } else if (verdict === 'BLOCK') {
    console.info(`[LIAM] producto #${productId} "${product.name}" bloqueado — no se publica hasta mejorar la oferta/datos.`);
  }

  // 4. Log claro de lo que LIAM decidió con este producto
  const d = decision || {};
  console.info(
    `[LIAM] #${productId} "${product.name}": ` +
    `veredicto=${d.liam_verdict ?? 'N/A'} → acción=${d.recommendation ?? 'N/A'} | ` +
    `grado=${d.grade ?? '?'} | confianza=${d.confidence ?? '?'} | ` +
    `landing=${published?.url ?? 'NO PUBLICADA'} | ` +
    `estado=${published ? 'published' : 'borrador'}`
  );

  // Emit event indicating analysis completion
  await bus.emit('product.analyzed', { productId, blueprint, decision });
});

const orderConfirmationService = new OrderConfirmationService();

registerHandler('whatsapp_confirmation_reminder', async (payload) => {
  const { orderId } = payload;
  const result = await orderConfirmationService.sendReminderOrEscalate(orderId);

  // Si fue el primer recordatorio (no escaló todavía), reprogramamos el
  // segundo intento/escalación para 21h más tarde (~24h desde el pedido).
  if (result && result.escalated === false) {
    const nextAt = new Date(Date.now() + 21 * 60 * 60 * 1000);
    await enqueue('whatsapp_confirmation_reminder', { orderId }, nextAt);
  }
});

/**
 * Process a single job from the queue (optionally targeting a specific jobId).
 * @param {string} [jobId=null]
 * @returns {Promise<boolean>} True if a job was processed
 */
export async function processNextJob(jobId = null) {
  const job = await dequeue(jobId);
  if (!job) return false;

  const handler = handlers[job.type];
  if (!handler) {
    await fail(job.id, `No handler registered for job: ${job.type}`);
    return true;
  }

  try {
    await handler(typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload);
    await complete(job.id);
  } catch (err) {
    await fail(job.id, err.message);
  }
  return true;
}

/**
 * Starts the worker polling loop.
 * @param {number} [pollIntervalMs=5000] 
 */
export async function startWorker(pollIntervalMs = 5000) {
  console.log(`[Worker] Started background polling loop`);
  const poll = async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error(`[Worker] Error in poll cycle:`, err.message);
    }
  };
  setInterval(poll, pollIntervalMs);
}