import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculatePayout } from '@/lib/dropi';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status } = await req.json();

  const order = await db.order.update({
    where: { id: params.id },
    data: { status },
    include: { product: true },
  });

  if (status === 'entregado') {
    const { payout } = calculatePayout(order.price, order.cost);
    await db.launchDecision.create({
      data: {
        productId: order.productId,
        type: 'fulfillment Dropi',
        recommendation: `entrega confirmada — ${order.product.name}`,
        recommendedBy: 'human',
        humanAction: 'automático',
        outcome: `pagado a wallet: $${Math.round(payout).toLocaleString('es-CO')}`,
      },
    });
  }

  return NextResponse.json(order);
}
