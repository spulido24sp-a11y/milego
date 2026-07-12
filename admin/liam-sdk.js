/**
 * LIAM Tracking SDK v1
 *
 * Uso:
 *   LIAM.init({ productId: 228, themeKey: 'flash_sale', ... })
 *   LIAM.track('cta_click', { element: 'cta_primary' })
 *   LIAM.track('checkout_start', { price: 79900 })
 *
 * purchase() y refund() solo se llaman desde el backend.
 */
(function (global) {
  'use strict';

  const API_BASE = '/api/v1/liam';
  const STORAGE_KEY = 'liam_session_id';

  function generateId() {
    return 'liam_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function getSessionId() {
    let sid = sessionStorage.getItem(STORAGE_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(STORAGE_KEY, sid);
    }
    return sid;
  }

  function getDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  async function post(endpoint, data) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (e) {
      console.warn('[LIAM SDK] Failed to send:', endpoint, e.message);
      return null;
    }
  }

  let _initialized = false;
  let _sessionData = null;

  const LIAM = {
    /**
     * Inicializa la sesión de tracking.
     * Debe llamarse una vez cuando la landing carga.
     */
    async init(config) {
      if (_initialized) return;
      _initialized = true;

      const sessionId = getSessionId();
      const params = new URLSearchParams(global.location.search);

      _sessionData = {
        sessionId,
        anonymousVisitorId: config.visitorId || generateId(),
        productId: config.productId,
        landingId: config.landingId || null,
        landingVersion: config.landingVersion || null,
        landingHash: config.landingHash || null,
        landingUrl: global.location.href,
        referrer: global.document.referrer || '',
        decisionEngineVersion: config.decisionEngineVersion || null,
        conversionCompilerVersion: config.conversionCompilerVersion || null,
        promptVersion: config.promptVersion || null,
        learningModelVersion: config.learningModelVersion || null,
        experimentId: config.experimentId || null,
        experimentVariant: config.experimentVariant || null,
        themeKey: config.themeKey || null,
        ctaKey: config.ctaKey || null,
        bundleKey: config.bundleKey || null,
        trafficSource: params.get('utm_source') || config.trafficSource || 'direct',
        campaign: params.get('utm_campaign') || config.campaign || null,
        adset: params.get('utm_adset') || config.adset || null,
        adName: params.get('utm_ad') || config.adName || null,
        device: getDevice(),
        country: null,
        language: navigator.language || null,
        userAgent: navigator.userAgent,
      };

      await post('/session', _sessionData);
      this.track('page_view', { url: global.location.href });
    },

    /**
     * Trackea un evento en la sesión actual.
     */
    async track(eventType, payload = {}) {
      if (!_sessionData) {
        console.warn('[LIAM SDK] init() must be called before track()');
        return;
      }
      await post('/event', {
        sessionId: _sessionData.sessionId,
        productId: _sessionData.productId,
        eventType,
        payload,
        clientTs: new Date().toISOString(),
      });

      // Eventos de scroll automáticos
      if (eventType === 'scroll' && payload.scroll) {
        const scrollPct = payload.scroll;
        for (const threshold of [25, 50, 75, 100]) {
          if (scrollPct >= threshold && !this['_scroll_' + threshold]) {
            this['_scroll_' + threshold] = true;
            await post('/event', {
              sessionId: _sessionData.sessionId,
              productId: _sessionData.productId,
              eventType: 'scroll_' + threshold,
              payload: { scroll: scrollPct },
              clientTs: new Date().toISOString(),
            });
          }
        }
      }
    },

    /**
     * Conveniencia: trackea checkout_start.
     */
    async checkout(payload = {}) {
      await this.track('checkout_start', payload);
    },

    /**
     * Conveniencia: trackea whatsapp_click.
     */
    async whatsappClick(payload = {}) {
      await this.track('whatsapp_click', payload);
    },
  };

  // Scroll tracking automático con throttle
  let _scrollThrottle = null;
  global.addEventListener('scroll', function () {
    if (_scrollThrottle) return;
    _scrollThrottle = setTimeout(function () {
      _scrollThrottle = null;
      const scrollPct = Math.round(
        (global.scrollY + global.innerHeight) / Math.max(global.document.body.scrollHeight, 1) * 100
      );
      LIAM.track('scroll', { scroll: Math.min(scrollPct, 100) });
    }, 300);
  }, { passive: true });

  global.LIAM = LIAM;
})(window);
