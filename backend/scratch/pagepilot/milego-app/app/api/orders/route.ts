import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDropiOrder } from '@/lib/dropi';

export async function GET() {
  const orders = await db.order.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

// body: { productId, qty, price, customerName?, customerPhone?, customerAddress? }
export async function POST(req: Request) {
  const body = await req.json();
  const { productId, qty, price, customerName, customerPhone, customerAddress } = body;

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: 'producto no encontrado' }, { status: 404 });

  const dropiResult = await createDropiOrder({
    productName: product.name, qty, price, customerName, customerPhone, customerAddress,
  });

  const order = await db.order.create({
    data: {
      productId, qty, price, cost: product.cost * qty,
      status: 'pendiente_confirmacion',
      dropiOrderId: dropiResult.dropiOrderId,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
