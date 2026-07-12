import { BaseProvider } from './base.provider.js';

export class MockProvider extends BaseProvider {
  /**
   * Generates mock structured AI response matching LIAM schema.
   * @param {string} prompt 
   * @returns {Promise<string>} Stringified JSON object
   */
  async generateText(prompt) {
    // Coherent structured analysis simulation
    const analysis = {
      productScore: 88,
      marketScore: 78,
      customerScore: 91,
      recommendedOffer: "combo_x2",
      recommendedPrice: 89900,
      recommendedHooks: [
        "Lleva la última tecnología a tu hogar hoy sin pagar costos de envío.",
        "Paga al recibir en efectivo desde la comodidad de tu casa.",
        "Garantía certificada de 1 año y atención personalizada por WhatsApp."
      ],
      seo: {
        slug: "smart-lamp-pro-rgb",
        title: "Smart Lamp Pro - Iluminación Inteligente con Envío Gratis",
        keywords: ["lampara inteligente", "iluminacion rgb colombia", "lampara wifi contraentrega"]
      }
    };
    
    return JSON.stringify(analysis);
  }
}
