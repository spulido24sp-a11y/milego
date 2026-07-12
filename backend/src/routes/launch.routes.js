import { Router } from 'express';
import { LaunchController }       from '../controllers/launch.controller.js';
import { authenticate }           from '../middlewares/auth.js';
import { tenantContext }          from '../middlewares/tenant.js';
import { requirePermission }      from '../middlewares/permissions.js';
import { LIAMRuntime }            from '../brain/liam-runtime.js';
import { ScenarioSimulator }      from '../brain/simulator/scenario-simulator.js';
import { ReasoningEngine }        from '../brain/reasoning/reasoning-engine.js';
import { ScoringEngine }          from '../brain/scoring/scoring-engine.js';
import { ExplainabilityEngine }   from '../brain/explainability/explainability-engine.js';
import { RecommendationEngine }   from '../brain/recommendations/recommendation-engine.js';
import { getPublishedLanding }    from '../landing/publisher.js';
import db from '../config/database.js';

const router     = Router();
const controller = new LaunchController();
const runtime    = new LIAMRuntime();
const simulator  = new ScenarioSimulator();
const reasonEng  = new ReasoningEngine();
const scoreEng   = new ScoringEngine();
const explainEng = new ExplainabilityEngine();
const recEng     = new RecommendationEngine();

router.get('/launch/:slug', async (req, res, next) => {
  try {
    const landing = await getPublishedLanding(req.params.slug);
    if (!landing) return res.status(404).type('html').send('<h1>Página no encontrada</h1><p>El producto que buscas no está disponible.</p>');
    return res.type('html').send(landing.html);
  } catch (err) { next(err); }
});

router.get('/launches/:id/review',       authenticate, tenantContext, requirePermission('products.read'),   controller.getReview.bind(controller));
router.patch('/launches/:id/review',     authenticate, tenantContext, requirePermission('products.update'), controller.updateReview.bind(controller));
router.post('/launches/:id/regenerate',  authenticate, tenantContext, requirePermission('products.update'), controller.regenerateSection.bind(controller));
router.post('/launches/:id/approve',     authenticate, tenantContext, requirePermission('products.update'), controller.approve.bind(controller));
router.post('/launches/:id/reject',      authenticate, tenantContext, requirePermission('products.update'), controller.reject.bind(controller));
router.post('/launches/:id/publish',     authenticate, tenantContext, requirePermission('products.update'), controller.publish.bind(controller));
router.patch('/launches/:id/theme',      authenticate, tenantContext, requirePermission('products.update'), controller.updateTheme.bind(controller));

/**
 * POST /api/v1/launches/:id/chat
 * LIAM Runtime — Conversational Copilot + full intelligence stack.
 * Accepts integer product IDs (the DB schema uses serial integers, not UUIDs).
 */
router.post('/launches/:id/chat', authenticate, tenantContext, requirePermission('products.update'), async (req, res, next) => {
  try {
    const { id }                                         = req.params;
    const { objective, history, context, memoryType, memoryKey } = req.body;
    const storeId = req.tenant.storeId;

    if (!objective) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'El campo objective es requerido.' } });
    }

    // Resolve the active product ID — if id is not a valid integer, fall back to first product in store
    let activeId = parseInt(id, 10);

    if (isNaN(activeId)) {
      const firstProduct = await db('products').where({ store_id: storeId }).first();
      if (firstProduct) {
        activeId = firstProduct.id;
      } else {
        return res.json({
          success: true,
          data: {
            result: '👋 ¡Hola! Aún no tienes productos importados en tu tienda. Ve a la sección **Products** e importa un producto desde Dropi para comenzar.'
          }
        });
      }
    }

    // Resolve context.productId — normalize to integer
    const clientProductId = context?.productId;
    const sanitizedProductId = (clientProductId && !isNaN(parseInt(clientProductId, 10)))
      ? parseInt(clientProductId, 10)
      : activeId;

    const response = await runtime.processRequest({
      objective,
      history: history || [],
      context: { ...context, productId: sanitizedProductId },
      memoryType,
      memoryKey: memoryKey || `review_${sanitizedProductId}`,
      storeId,
      launchId: sanitizedProductId
    });

    res.json({ success: true, data: response });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/launches/:id/simulate
 * Scenario Simulator — instant what-if analysis, no LLM, no DB writes.
 */
router.post('/launches/:id/simulate', authenticate, tenantContext, requirePermission('products.read'), async (req, res, next) => {
  try {
    const { id }       = req.params;
    const { scenario } = req.body;

    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'ID del producto inválido.' } });
    }

    const product = await db('products').where({ id: productId }).first();
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Producto no encontrado.' } });

    const baseReasoning = reasonEng.reason(product);
    const baseScoring   = scoreEng.score(product, baseReasoning);
    const explanation   = explainEng.explain(baseScoring, baseReasoning);
    const recs          = recEng.recommend(product, baseReasoning, baseScoring);

    let simulationResult;
    if (scenario) {
      simulationResult = simulator.simulate(product, scenario);
    } else {
      simulationResult = simulator.optimizeBest(product);
    }

    res.json({
      success: true,
      data: {
        base: { reasoning: baseReasoning, scoring: baseScoring, explanation, recommendations: recs },
        simulation: simulationResult
      }
    });
  } catch (err) { next(err); }
});

export default router;
