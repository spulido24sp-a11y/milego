import { dequeue, complete, fail, enqueue } from './queue.js';
import { ProductService } from '../services/product.service.js';
import { LaunchEngine } from '../launch-engine/index.js';
import { OrderConfirmationService } from '../services/order-confirmation.service.js';
import { bus } from '../events/index.js';

const handlers = {};

export function registerHandler(jobType, handlerFn) {
  handlers[jobType] = handlerFn;
}

// 1. Register background job handlers
const productService = new ProductService();
const engine = new LaunchEngine();

registerHandler('process_launch_blueprint', async (payload) => {
  const { productId } = payload;
  const product = await productService.getById(productId);
  if (!product) return;

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

  const processed = await engine.process('manual', rawData);
  await productService.update(productId, {
    launch_blueprint: processed.brain_analysis
  });

  // Emit event indicating analysis completion
  await bus.emit('product.analyzed', { productId, blueprint: processed.brain_analysis });
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