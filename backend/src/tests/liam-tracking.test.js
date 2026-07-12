import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/database.js';
import { LIAMEventCollector } from '../learning/event-collector.js';

const TEST_SESSION = 'test-it-session-' + Date.now();
const TEST_PRODUCT = 228;

describe('Sprint 1 — LIAM Telemetry v2 Pipeline', () => {

  afterAll(async () => {
    await db('liam_events').where({ session_id: TEST_SESSION }).del();
    await db('liam_sessions').where({ session_id: TEST_SESSION }).del();
  });

  it('should create a session with full context', async () => {
    const session = await LIAMEventCollector.createSession({
      sessionId: TEST_SESSION,
      anonymousVisitorId: 'visitor-test',
      productId: TEST_PRODUCT,
      landingVersion: 1,
      landingHash: 'abc123def456',
      themeKey: 'minimal',
      ctaKey: 'cta_buy_now',
      bundleKey: 'bundle_x2',
      trafficSource: 'google',
      campaign: 'test-campaign',
      device: 'desktop',
      country: 'CO',
      language: 'es',
      decisionEngineVersion: 'v8',
      conversionCompilerVersion: 'v5',
      promptVersion: 'v19',
      learningModelVersion: 'v1',
    });

    expect(session.session_id).toBe(TEST_SESSION);
    expect(session.product_id).toBe(TEST_PRODUCT);
    expect(session.theme_key).toBe('minimal');
    expect(session.cta_key).toBe('cta_buy_now');
    expect(session.bundle_key).toBe('bundle_x2');
    expect(session.traffic_source).toBe('google');
    expect(session.campaign).toBe('test-campaign');
    expect(session.device).toBe('desktop');
    expect(session.country).toBe('CO');
    expect(session.decision_engine_version).toBe('v8');
    expect(session.conversion_compiler_version).toBe('v5');
    expect(session.converted).toBe(false);
    expect(session.event_count).toBe(0);
  });

  it('should track events with payload', async () => {
    const event = await LIAMEventCollector.trackEvent({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      eventType: 'page_view',
      payload: { url: '/producto/organimax', scroll: 0 },
    });

    expect(event.event_type).toBe('page_view');
    expect(event.session_id).toBe(TEST_SESSION);
    expect(event.product_id).toBe(TEST_PRODUCT);
    expect(event.payload.url).toBe('/producto/organimax');
  });

  it('should auto-increment session event_count', async () => {
    await LIAMEventCollector.trackEvent({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      eventType: 'scroll_25',
    });
    await LIAMEventCollector.trackEvent({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      eventType: 'scroll_50',
    });
    await LIAMEventCollector.trackEvent({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      eventType: 'cta_click',
      payload: { element: 'cta_primary' },
    });

    const session = await db('liam_sessions').where({ session_id: TEST_SESSION }).first();
    expect(session.event_count).toBe(4); // 1 page_view + 3 more events
  });

  it('should track purchase and mark session as converted', async () => {
    await LIAMEventCollector.trackPurchase({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      revenue: 79900,
      payload: { method: 'cash_on_delivery' },
    });

    const session = await db('liam_sessions').where({ session_id: TEST_SESSION }).first();
    expect(session.converted).toBe(true);
    expect(parseFloat(session.revenue)).toBe(79900);

    const purchaseEvent = await db('liam_events')
      .where({ session_id: TEST_SESSION, event_type: 'purchase' })
      .first();
    expect(purchaseEvent).toBeDefined();
    expect(purchaseEvent.payload.revenue).toBe(79900);
  });

  it('should track refund event', async () => {
    await LIAMEventCollector.trackRefund({
      sessionId: TEST_SESSION,
      productId: TEST_PRODUCT,
      amount: 79900,
      payload: { reason: 'cliente_cancelo' },
    });

    const refundEvent = await db('liam_events')
      .where({ session_id: TEST_SESSION, event_type: 'refund' })
      .first();
    expect(refundEvent).toBeDefined();
    expect(refundEvent.payload.amount).toBe(79900);
    expect(refundEvent.payload.reason).toBe('cliente_cancelo');
  });

  it('should return funnel counts from getTelemetryStats', async () => {
    const funnel = await LIAMEventCollector.getTelemetryStats(TEST_PRODUCT);
    expect(funnel).toBeDefined();
    expect(funnel.page_view).toBeGreaterThanOrEqual(1);
    expect(funnel.cta_click).toBeGreaterThanOrEqual(1);
    expect(funnel.purchase).toBeGreaterThanOrEqual(1);
  });

  it('should reject event without required fields', async () => {
    await expect(LIAMEventCollector.trackEvent({
      sessionId: null,
      productId: TEST_PRODUCT,
      eventType: 'page_view',
    })).rejects.toThrow('sessionId, productId, and eventType are required');

    await expect(LIAMEventCollector.trackEvent({
      sessionId: TEST_SESSION,
      productId: null,
      eventType: 'page_view',
    })).rejects.toThrow('sessionId, productId, and eventType are required');
  });
});
