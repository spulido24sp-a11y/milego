import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const decisions = await db.launchDecision.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(decisions);
}
