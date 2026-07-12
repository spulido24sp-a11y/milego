import { db } from '@/lib/db';
import Link from 'next/link';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default async function TiendaPage() {
  const products = await db.product.findMany({ where: { status: 'active' }, orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--pine-dark)', marginBottom: 6 }}>CATÁLOGO</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, marginBottom: 24 }}>Tienda MIleGo</h1>

      {products.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Todavía no hay lanzamientos activos. Ve al Panel LIAM y aprueba un candidato.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {products.map((p) => (
            <Link key={p.id} href={`/producto/${p.id}`} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, display: 'block' }}>
              <div style={{ aspectRatio: '1/1', background: 'linear-gradient(150deg,#E4EAE1,#D2DCD3)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pine-dark)', marginBottom: 12 }}>
                [ {p.name.slice(0, 14)} ]
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{p.name}</h4>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{money(p.price)}</div>
              <div className="chip" style={{ marginTop: 8, fontSize: 10 }}>{p.template === 'pagepilot' ? 'estilo PagePilot' : 'estilo editorial'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
