import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { genBuyerPersona, buildTiers } from '@/lib/scoring';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { action, template } = body; // action: 'approve' | 'discard'

  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: 'no encontrado' }, { status: 404 });

  if (action === 'approve') {
    const updated = await db.product.update({
      where: { id: params.id },
      data: {
        status: 'active',
        template: template === 'pagepilot' ? 'pagepilot' : 'editorial',
        buyerPersona: genBuyerPersona(product.name),
        tiers: buildTiers(product.price),
      },
    });
    await db.launchDecision.create({
      data: {
        productId: product.id,
        type: 'scoring de producto',
        recommendation: `lanzar ${product.name}`,
        recommendedBy: 'liam',
        humanAction: 'aceptado',
        outcome: 'pendiente',
      },
    });
    return NextResponse.json(updated);
  }

  if (action === 'discard') {
    const updated = await db.product.update({ where: { id: params.id }, data: { status: 'discarded' } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'acción no reconocida' }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
