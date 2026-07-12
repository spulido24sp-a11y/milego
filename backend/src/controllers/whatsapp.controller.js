import { OrderConfirmationService } from '../services/order-confirmation.service.js';
import { success } from '../utils/response.js';

const confirmationService = new OrderConfirmationService();

/**
 * Extrae { phone, body } de forma flexible porque el proveedor de webhook
 * (chatproa.com u otro) puede enviar el payload con distintos nombres de
 * campo. AJUSTAR esta función según la documentación real del proveedor
 * una vez esté conectado.
 */
function extractInboundMessage(payload) {
  const phone =
    payload.from || payload.phone || payload.sender || payload.wa_id || payload.contact?.phone || null;
  const body =
    payload.text ||
    payload.body ||
    payload.message ||
    payload.message?.text ||
    payload.text?.body ||
    '';
  return { phone, body: typeof body === 'string' ? body : '' };
}

export class WhatsAppController {
  async handleInboundWebhook(req, res, next) {
    try {
      // Aceptar de inmediato para que el proveedor no reintente, y procesar.
      const payload = req.body || {};
      const { phone, body } = extractInboundMessage(payload);

      if (!phone) {
        return success(res, { received: true, matched: false });
      }

      const result = await confirmationService.processInboundMessage({
        phone,
        body,
        rawPayload: payload,
      });

      return success(res, { received: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
