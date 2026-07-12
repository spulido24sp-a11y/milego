import { describe, it, expect } from 'vitest';
import { Workflow } from '../workflow/workflow-engine.js';
import { createLaunchWorkflow } from '../workflow/launch-workflow.js';
import { bus } from '../events/index.js';
import { enqueue, dequeue } from '../jobs/queue.js';
import { processNextJob } from '../jobs/worker.js';
import { registerEventHandlers } from '../events/register.js';
import db from '../config/database.js';

registerEventHandlers();

describe('Core 2.0 - Event-Driven & Workflow Engine Tests', () => {

  it('should run a declarative workflow step-by-step with success logs', async () => {
    const testWf = new Workflow('TestWorkflow');

    testWf.addStep('step1', async (ctx) => {
      ctx.value = 10;
      return ctx;
    });

    testWf.addStep('step2', async (ctx) => {
      ctx.value += 20;
      return ctx;
    });

    const execution = await testWf.run({}, 'correlation-123');

    expect(execution.success).toBe(true);
    expect(execution.workflow_name).toBe('TestWorkflow');
    expect(execution.correlation_id).toBe('correlation-123');
    expect(execution.result.value).toBe(30);
    expect(execution.step_logs).toHaveLength(2);
    expect(execution.step_logs[0].step_name).toBe('step1');
    expect(execution.step_logs[0].success).toBe(true);
  });

  it('should support retry policies on step failures', async () => {
    const testWf = new Workflow('FailWorkflow');
    let attemptsCount = 0;

    testWf.addStep('faulty_step', async (ctx) => {
      attemptsCount++;
      if (attemptsCount < 3) {
        throw new Error('Transient network error');
      }
      ctx.ok = true;
      return ctx;
    }, { maxAttempts: 3, retryDelayMs: 1 });

    const execution = await testWf.run({});
    expect(execution.success).toBe(true);
    expect(attemptsCount).toBe(3);
    expect(execution.step_logs[0].attempts).toBe(3);
  });

  it('should process the background launch workflow when product.created is emitted', async () => {
    // Clear queue
    await db('jobs').del();

    // Create a product without launch_blueprint
    const [product] = await db('products').insert({
      store_id: 1,
      name: 'Smart Mirror V3',
      slug: 'smart-mirror-v3-' + Date.now(),
      price: 150000
    }).returning('*');

    // Emit event manually to verify enqueueing
    await bus.emit('product.created', { productId: product.id }, {
      entityType: 'product',
      entityId: product.id,
      action: 'created',
      storeId: 1
    });

    // Verify a job has been enqueued
    let job;
    for (let attempts = 0; attempts < 10; attempts++) {
      const jobs = await db('jobs').where({ type: 'process_launch_blueprint' });
      job = jobs.find(j => {
        const pl = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
        return pl && pl.productId === product.id;
      });
      if (job) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(job).toBeDefined();


    
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.productId).toBe(product.id);

    // Process enqueued job using worker loop
    const processed = await processNextJob(job.id);
    expect(processed).toBe(true);

    // Verify product has launch_blueprint persisted
    const updatedProduct = await db('products').where({ id: product.id }).first();
    expect(updatedProduct.launch_blueprint).toBeDefined();
    expect(updatedProduct.launch_blueprint.decision).toBe('launch');
  });
});
