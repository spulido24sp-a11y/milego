import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scoreProduct } from '@/lib/scoring';

export async function GET() {
  const products = await db.product.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, cost, price, wow, commodity } = body;

  if (!name || !cost || !price) {
    return NextResponse.json({ error: 'name, cost y price son requeridos' }, { status: 400 });
  }

  const { score, recommendation } = scoreProduct(Number(cost), Number(price), !!wow, !!commodity);

  const product = await db.product.create({
    data: { name, cost: Number(cost), price: Number(price), wow: !!wow, commodity: !!commodity, score, recommendation },
  });

  await db.launchDecision.create({
    data: {
      productId: product.id,
      type: 'scoring de producto',
      recommendation: `${recommendation} — ${name} (score ${score})`,
      recommendedBy: 'liam',
      humanAction: 'pendiente de revisión',
      outcome: 'pendiente',
    },
  });

  return NextResponse.json(product, { status: 201 });
}
