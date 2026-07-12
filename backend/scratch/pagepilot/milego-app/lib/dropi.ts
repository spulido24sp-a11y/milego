// Integración con Dropi — reemplaza los TODO con las llamadas reales una vez
// tengas tu API key en DROPI_API_KEY (ver .env.example).
// Documentación de referencia: dropi.co/panel > Integraciones > API
//
// Flujo real (ver MIleGo_IA_Dropi_RedesSociales.pdf, Parte 2):
// 1. Al confirmar una orden en MIleGo, se replica en Dropi vía createOrder().
// 2. El proveedor despacha (24-72h) y el courier reporta estado.
// 3. Dropi acredita el margen al wallet cuando el pedido se confirma "entregado".
// 4. Dropi cobra comisión del 5% sobre el precio de venta, descontada del wallet.

const DROPI_COMMISSION_RATE = 0.05;

export function calculatePayout(price: number, cost: number) {
  const commission = Math.round(price * DROPI_COMMISSION_RATE);
  const payout = price - cost - commission;
  return { commission, payout };
}

export async function createDropiOrder(order: {
  productName: string;
  qty: number;
  price: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}) {
  // TODO: reemplazar por el POST real a la API de Dropi cuando tengas
  // DROPI_API_KEY y DROPI_STORE_ID configurados.
  //
  // const res = await fetch('https://api.dropi.co/orders', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.DROPI_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ store_id: process.env.DROPI_STORE_ID, ...order }),
  // });
  // return res.json();

  console.warn('[dropi] createDropiOrder: modo simulado, conecta DROPI_API_KEY para producción');
  return { dropiOrderId: 'SIM-' + Date.now(), status: 'pendiente_confirmacion' };
}

// Handler de referencia para el webhook de Dropi (novedades, entregas confirmadas).
// Móntalo en app/api/dropi/webhook/route.ts cuando actives la integración real.
export function parseDropiWebhookPayload(payload: any) {
  // TODO: validar firma con DROPI_WEBHOOK_SECRET antes de confiar en el payload.
  return {
    dropiOrderId: payload.order_id,
    newStatus: payload.status, // 'despachado' | 'entregado' | 'rechazado'
  };
}
