import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderRouter } from './provider-router.js';
import { RulesEngine } from './rules-engine.js';
import { LearningEngine } from './learning-engine.js';
import { WorldIntelligenceService } from './world-intelligence/world-intelligence.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = new ProviderRouter();
const rules = new RulesEngine();
const learning = new LearningEngine();
const worldIntelligence = new WorldIntelligenceService();

export class DecisionEngine {
  /**
   * Orchestrates the Triple DNA evaluation, prompt loading, rules checking, and copilot response.
   * @param {Object} product Standard product payload
   * @param {string} [providerName='mock'] Target AI provider
   * @returns {Promise<Object>} Launch Blueprint
   */
  async processDecision(product, providerName = 'mock') {
    // 1. Validate basic commercial safety rules
    rules.validateRules(product);

    // 2. Interactive Copilot Check (Missing Details)
    const missingDetails = [];
    const imagesCount = product.images?.length || 0;
    if (imagesCount < 3) {
      missingDetails.push(`El producto no contiene suficientes imágenes (se reportan ${imagesCount}, se requieren mínimo 3 para la landing).`);
    }
    if (!product.supplier_info?.weight && typeof product.weight !== 'number') {
      missingDetails.push("No conozco el peso del empaque para cotizar logística.");
    }

    if (missingDetails.length > 0) {
      return {
        decision: 'need_info',
        confidence: 65,
        missing_details: missingDetails,
        explanation: 'LIAM requiere completar detalles logísticos e imágenes adicionales antes de recomendar la publicación comercial.'
      };
    }

    // 3. Load prompt template from prompts registry
    const promptPath = path.join(__dirname, 'prompts', 'analyzer.md');
    let template = 'Dado el producto {{name}}, analiza viabilidad.';
    try {
      template = fs.readFileSync(promptPath, 'utf-8');
    } catch (err) {
      console.warn('Fallo al leer prompt template, usando fallback:', err.message);
    }

    const patternTips = learning.getSuccessPatterns(product);

    // Replace variables in prompt
    const prompt = template
      .replace('{{name}}', product.name)
      .replace('{{wholesale_price}}', String(product.supplier_info?.wholesale_price))
      .replace('{{suggested_retail_price}}', String(product.supplier_info?.suggested_retail_price))
      + `\nSuccess Patterns: ${patternTips}`;

    // 4. Query AI provider using the Router
    const rawRes = await router.generateText(prompt, providerName, 'analyzer.md');
    
    let parsedAI;
    try {
      parsedAI = JSON.parse(rawRes);
    } catch {
      throw new Error('Respuesta del modelo no es un JSON válido');
    }

    // 5. Run the World Intelligence Service evaluation
    const worldAnalysis = await worldIntelligence.evaluateProduct(product);

    // 6. Structure and return the versioned Launch Blueprint
    const suggestedPrice = product.supplier_info?.suggested_retail_price || 0;
    const wholesale = product.supplier_info?.wholesale_price || 0;

    return {
      decision: worldAnalysis.decision,
      confidence: worldAnalysis.confidence,
      blueprint_version: '1.0.0',
      commerce_confidence_scores: {
        total: worldAnalysis.confidence,
        product: worldAnalysis.scores.product,
        market: parsedAI.marketScore || 78,
        competition: worldAnalysis.scores.competition,
        offer: worldAnalysis.scores.offer,
        seo: 93,
        content: 90,
        data_quality: worldAnalysis.scores.data_quality
      },
      explanation: worldAnalysis.explanation.concat([
        'Recomiendo el lanzamiento con Combo x2.',
        'Aumenta el ticket promedio (AOV) y reduce el costo de flete en Colombia.',
        'Históricamente, productos del mismo nicho han registrado un ROAS superior a 3.4.'
      ]),
      market: {
        competition: 'medium',
        trend: 'up',
        seasonality: 'high'
      },
      customer: {
        avatar: 'Adultos de 25-45 años interesados en compras online directas',
        pain_points: [
          'Temor a fraudes en tiendas desconocidas',
          'Demoras logísticas de envío'
        ],
        desires: [
          'Comodidad de recibir y pagar en casa',
          'Atención rápida por chat de WhatsApp'
        ],
        objections: [
          '¿El envío es gratuito a mi ciudad?',
          '¿Puedo pagar en efectivo?'
        ]
      },
      offer: {
        price_cost: wholesale,
        price_unit: suggestedPrice,
        bundle: parsedAI.recommendedOffer || 'combo_x2',
        urgency_trigger: 'Solo hoy - Envío gratis a todo el país'
      },
      seo: {
        title: parsedAI.seo?.title || `${product.name} - Comprar Online`,
        slug: parsedAI.seo?.slug || product.slug,
        keywords: parsedAI.seo?.keywords || ['comprar', 'online']
      },
      marketing: {
        hooks: parsedAI.recommendedHooks || [
          'Última tecnología al mejor precio.',
          'Paga contra entrega en todo el país.'
        ],
        ugc_angles: [
          'Video mostrando el unboxing del producto en la vida real.',
          'Demostración de los beneficios prácticos en 15 segundos.'
        ]
      },
      content: {
        faq: [
          {
            question: '¿El envío es gratis?',
            answer: 'Sí, el envío no tiene ningún costo a nivel nacional.'
          }
        ],
        whatsapp_template: 'Hola, confirmamos el despacho de tu pedido. Pagas al recibir en tu casa.'
      }
    };
  }
}
