import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';

const router = Router();
const controller = new WhatsAppController();

// Público (sin tenantContext): el proveedor de WhatsApp llama esta URL
// directamente. La resolución de tienda ocurre por teléfono del cliente.
router.post('/whatsapp/webhook', controller.handleInboundWebhook.bind(controller));

export default router;
