import { BaseProvider } from './base.provider.js';

export class GeminiProvider extends BaseProvider {
  /**
   * Universal signature decoupled from business logic.
   * @param {Object} options
   * @param {string} options.prompt
   * @param {Object} [options.schema=null]
   * @param {Array} [options.tools=[]]
   * @param {number} [options.temperature=0.7]
   * @param {string} [options.systemPrompt='']
   * @returns {Promise<string>} LLM output content
   */
  async generate({ prompt, schema = null, tools = [], temperature = 0.7, systemPrompt = '' }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // safe fallback in dev
      console.warn('[GeminiProvider] GEMINI_API_KEY not found in environment, falling back to mock JSON');
      return this._getMockFallback();
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const bodyPayload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature,
        responseMimeType: schema ? 'application/json' : 'text/plain'
      }
    };

    if (systemPrompt) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: Status ${response.status} - ${errText}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned an empty or invalid response structure');
    }

    return text;
  }

  // Abstract base generator override
  async generateText(prompt) {
    return this.generate({ prompt });
  }

  _getMockFallback() {
    return JSON.stringify({
      marketScore: 88,
      recommendedOffer: "combo_x2",
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
    });
  }
}
