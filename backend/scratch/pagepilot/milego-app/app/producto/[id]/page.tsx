import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import EditorialLanding from '@/components/templates/EditorialLanding';
import PagePilotLanding from '@/components/templates/PagePilotLanding';

export default async function ProductoPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product || product.status !== 'active') notFound();

  return product.template === 'pagepilot'
    ? <PagePilotLanding product={product} />
    : <EditorialLanding product={product} />;
}
