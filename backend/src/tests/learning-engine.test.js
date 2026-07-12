import { describe, it, expect, beforeAll } from 'vitest';
import db from '../config/database.js';
import { LIAMEventCollector } from '../learning/event-collector.js';
import { LIAMScoringEngine } from '../learning/scoring-engine.js';
import { LIAMRecommendationEngine } from '../learning/recommendation-engine.js';
import { LIAMConversionCompiler } from '../landing/conversion-compiler.js';

describe('Sprint C - LIAM Learning Engine & Telemetry Integration Tests', () => {

  beforeAll(async () => {
    await LIAMEventCollector.initSchema();
  });

  it('should track conversion events and persist them in telemetry logs', async () => {
    await db('liam_telemetry').del();


    await LIAMEventCollector.trackEvent({
      productId: 301,
      eventType: 'pageview',
      source: 'tiktok',
      ctaText: 'Lo quiero hoy',
      themeUsed: 'tiktok_ugc'
    });

    await LIAMEventCollector.trackEvent({
      productId: 301,
      eventType: 'purchase',
      source: 'tiktok',
      ctaText: 'Lo quiero hoy',
      themeUsed: 'tiktok_ugc'
    });

    const stats = await LIAMEventCollector.getTelemetryStats(301);
    expect(stats.length).toBeGreaterThan(0);
    
    const purchaseStat = stats.find(s => s.event_type === 'purchase');
    expect(purchaseStat).toBeDefined();
    expect(parseInt(purchaseStat.count, 10)).toBe(1);
  });

  it('should calculate correct asset scores and risk statuses based on telemetry metrics', async () => {
    await db('liam_telemetry').del();

    const product = {
      id: 302,
      name: 'Huawei Watch Pro 4',
      price: 200000,
      cost_price: 90000, // 55% margin
      launch_blueprint: {
        roi: { roas_target: 3.5 }
      }
    };

    // Bulk insert 100 pageviews and 8 purchases to avoid pool connection bottlenecks
    const events = [];
    for (let i = 0; i < 100; i++) {
      events.push({ product_id: 302, event_type: 'pageview', source: 'facebook', cta_text: '', theme_used: '' });
    }
    for (let i = 0; i < 8; i++) {
      events.push({ product_id: 302, event_type: 'purchase', source: 'facebook', cta_text: '', theme_used: '' });
    }
    await db('liam_telemetry').insert(events);

    const report = await LIAMScoringEngine.computeAssetScore(product);
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.status).toBe('escalable');
    expect(report.recommendation).toBe('Escalar pauta');

  });

  it('should dynamically declare winners and adjust compileCRODecision parameters', async () => {
    await db('liam_telemetry').del();

    const product = {
      id: 303,
      name: 'Organizador Pro',
      price: 79900,
      cost_price: 35000,
      category_name: 'Hogar'
    };

    // Insert 10 visits and 4 purchases for luxury theme (40% CR winner!)
    for (let i = 0; i < 10; i++) {
      await LIAMEventCollector.trackEvent({
        productId: 303,
        eventType: 'pageview',
        source: 'google',
        ctaText: 'Aprovechar oferta',
        themeUsed: 'luxury'
      });
    }
    for (let i = 0; i < 4; i++) {
      await LIAMEventCollector.trackEvent({
        productId: 303,
        eventType: 'purchase',
        source: 'google',
        ctaText: 'Aprovechar oferta',
        themeUsed: 'luxury'
      });
    }

    // Expect recommendation engine to find luxury theme and Aprovechar oferta CTA as winners
    const feedback = await LIAMRecommendationEngine.getWinnerFeedback(303);
    expect(feedback.themeWinner).toBe('luxury');
    expect(feedback.ctaWinner).toBe('Aprovechar oferta');

    // Expect conversion compiler to override base Minimal google theme with the winner Luxury
    const compiler = new LIAMConversionCompiler();
    const decision = await compiler.compileCRODecision(product, { source: 'google' });
    expect(decision.theme).toBe('luxury');
    expect(decision.cta).toBe('Aprovechar oferta');
  });
});
