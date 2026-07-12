import { describe, it, expect } from 'vitest';
import { LIAMThemeEngine } from '../landing/theme-engine.js';
import { generateLanding } from '../landing/generator.js';

describe('Sprint A - LIAM CRO Engine & Theme Selector Tests', () => {
  
  it('should recommend TikTok style and UGC blocks for TikTok traffic source', () => {
    const engine = new LIAMThemeEngine();
    const product = {
      name: 'Smart Mirror V3',
      price: 99000,
      category_name: 'Hogar'
    };
    const context = { source: 'tiktok' };
    
    const config = engine.recommendCROConfig(product, context);
    expect(config.theme).toBe('tiktok_ugc');
    expect(config.blocks).toContain('testimonials');
    expect(config.blocks[2]).toBe('testimonials'); // Priorizado arriba
  });

  it('should recommend Luxury style and high value persuasion for high ticket products', () => {
    const engine = new LIAMThemeEngine();
    const product = {
      name: 'Smart Projector Ultra',
      price: 250000,
      category_name: 'Gadgets'
    };
    const context = { source: 'facebook' };
    
    const config = engine.recommendCROConfig(product, context);
    expect(config.theme).toBe('luxury');
    expect(config.blocks).toContain('transformation');
  });

  it('should compile landing pages using CRO recommended sequence when blueprint blocks are omitted', async () => {
    const product = {
      id: 101,
      name: 'Organizador Pro',
      price: 79900,
      cost_price: 35000,
      stock: 20,
      slug: 'organizador-pro',
      images: [{ url: '/api/placeholder/500' }],
      traffic_context: { source: 'google' }, // Debería forzar minimal
      launch_blueprint: {
        theme: null,
        blocks: null // Debería resolver vía CRO
      }
    };

    const result = await generateLanding(product, {});
    expect(result.meta.theme).toBe('minimal');
    expect(result.meta.blocks).toContain('faq');
  });

});
