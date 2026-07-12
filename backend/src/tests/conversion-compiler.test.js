import { describe, it, expect } from 'vitest';
import { LIAMConversionCompiler } from '../landing/conversion-compiler.js';

describe('Sprint B - LIAM Conversion Compiler Tests', () => {

  it('should score and recommend the luxury theme and optimal blocks for high-ticket items on facebook', async () => {
    const compiler = new LIAMConversionCompiler();
    const product = {
      id: 201,
      name: 'Huawei Watch Pro 4',
      price: 240000,
      cost_price: 110000,
      category_name: 'Gadgets'
    };
    const context = { source: 'facebook' };

    const decision = await compiler.compileCRODecision(product, context);

    expect(decision.theme).toBe('premium');
    expect(decision.cta).toBe('Aprovechar oferta');
    expect(decision.offer).toBe('bundle_x2'); // Margen alto > 55%
    expect(decision.blockOrder).toContain('problem');
    expect(decision.blockOrder).toContain('transformation');
    expect(decision.urgencyType).toBe('countdown'); // Facebook traffic
  });

  it('should score and recommend the tiktok style and ugc elements for beauty items on tiktok', async () => {
    const compiler = new LIAMConversionCompiler();
    const product = {
      id: 202,
      name: 'Kit de Maquillaje Orgánico',
      price: 89000,
      cost_price: 50000,
      category_name: 'Belleza'
    };
    const context = { source: 'tiktok' };

    const decision = await compiler.compileCRODecision(product, context);

    expect(decision.theme).toBe('pagepilot');
    expect(decision.cta).toBe('Lo quiero hoy');
    expect(decision.urgencyType).toBe('stock'); // TikTok traffic
    expect(decision.blockOrder).toContain('testimonials');
  });

  it('should score and recommend the minimal layout for home organizers on google', async () => {
    const compiler = new LIAMConversionCompiler();
    const product = {
      id: 203,
      name: 'Organizador de Zapatos Pro',
      price: 69900,
      cost_price: 32000,
      category_name: 'Hogar'
    };
    const context = { source: 'google' };

    const decision = await compiler.compileCRODecision(product, context);

    expect(decision.theme).toBe('minimal');
    expect(decision.cta).toBe('Comprar ahora');
    expect(decision.blockOrder).toContain('faq');
  });
});

