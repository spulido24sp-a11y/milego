import { Workflow } from './workflow-engine.js';
import { Normalizer } from '../launch-engine/pipeline/normalizer.js';
import { Validator } from '../launch-engine/pipeline/validator.js';
import { Enricher } from '../launch-engine/pipeline/enricher.js';
import { OfferBuilder } from '../launch-engine/pipeline/offer-builder.js';
import { BrainService } from '../brain/brain.service.js';

const normalizer = new Normalizer();
const validator = new Validator();
const enricher = new Enricher();
const offerBuilder = new OfferBuilder();
const brain = new BrainService();

/**
 * Factory for creating the Product Launch Workflow.
 * @returns {Workflow}
 */
export function createLaunchWorkflow() {
  const wf = new Workflow('ProductLaunchWorkflow');

  wf.addStep('normalize', async (ctx) => {
    ctx.normalized = normalizer.normalize(ctx.providerName, ctx.rawData);
    return ctx;
  }, { maxAttempts: 2 });

  wf.addStep('validate', async (ctx) => {
    validator.validate(ctx.normalized);
    return ctx;
  }, { maxAttempts: 1 });

  wf.addStep('enrich', async (ctx) => {
    ctx.enriched = enricher.enrich(ctx.normalized);
    return ctx;
  }, { maxAttempts: 1 });

  wf.addStep('buildOffer', async (ctx) => {
    ctx.completeProfile = offerBuilder.buildOffer(ctx.enriched);
    return ctx;
  }, { maxAttempts: 1 });

  wf.addStep('brainAnalysis', async (ctx) => {
    const blueprint = await brain.analyzeProduct(ctx.completeProfile, 'mock');
    ctx.completeProfile.brain_analysis = blueprint;
    return ctx;
  }, { maxAttempts: 3, retryDelayMs: 100 });

  return wf;
}
