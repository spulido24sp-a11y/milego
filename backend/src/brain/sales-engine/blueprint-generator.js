import { ProductAnalyzer } from './analyzer.js';
import { CopyGenerator } from './copy-generator.js';
import { BlockSelector } from './block-selector.js';

export class BlueprintGenerator {
  constructor() {
    this.analyzer = new ProductAnalyzer();
    this.copyGen = new CopyGenerator();
    this.blockSelector = new BlockSelector();
  }

  generate(product) {
    const analysis = this.analyzer.analyze(product);
    const hooks = this.copyGen.generateHooks(analysis, product);
    const benefits = this.copyGen.generateBenefits(analysis);
    const pricing = this.copyGen.generatePricing(analysis, product);
    const seo = this.copyGen.generateSeo(analysis, product);
    const faqs = this.copyGen.generateFaqs({ ...analysis, name: product.name });
    const testimonials = this.copyGen.generateTestimonials(analysis, product);
    const emotionalAngle = this.copyGen.getEmotionalAngle(analysis);
    const blocks = this.blockSelector.selectBlocks(analysis.archetype);

    const confidence = this._calculateConfidence(product, analysis);

    const blueprint = {
      customer: {
        archetype: analysis.archetype,
        audience: analysis.audience,
        priceTier: analysis.priceTier,
        pain_points: analysis.painPoints,
        levers: analysis.levers,
      },
      offer: {
        price_unit: pricing.price_unit,
        price_cost: pricing.price_cost,
        bundle: pricing.bundle_x2_price > 0 ? 'combo_x2' : null,
        bundle_x2_price: pricing.bundle_x2_price,
        bundle_x2_label: pricing.bundle_x2_label,
        bundle_x2_savings: pricing.bundle_x2_savings,
        bundle_x3_price: pricing.bundle_x3_price,
        bundle_x3_label: pricing.bundle_x3_label,
        bundle_x3_savings: pricing.bundle_x3_savings,
        discount_pct: pricing.discount_pct,
        has_free_shipping: pricing.has_free_shipping,
      },
      marketing: {
        hooks: [hooks.headline, hooks.subheadline, hooks.cta],
        emotional_angle: emotionalAngle,
        cta_text: hooks.cta,
      },
      content: {
        benefits,
        testimonials,
        faq: faqs,
        features: [],
      },
      seo,
      blocks,
      confidence,
      version: 1,
    };

    return { blueprint, analysis };
  }

  _calculateConfidence(product, analysis) {
    let score = 50;
    if (analysis.archetype !== 'general') score += 15;
    if (analysis.margin >= 30) score += 10;
    if (analysis.margin >= 50) score += 5;
    if ((product.stock || 0) >= 50) score += 10;
    if (product.images && product.images.length > 0) score += 10;
    if (product.description && product.description.length > 50) score += 5;
    return Math.min(score, 99);
  }
}
