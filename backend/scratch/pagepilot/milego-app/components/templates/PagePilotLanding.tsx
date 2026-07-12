'use client';
import { useState } from 'react';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function PagePilotLanding({ product }: { product: any }) {
  const [selected, setSelected] = useState(0);
  const [added, setAdded] = useState(false);
  const tiers = product.tiers || [];

  function addToCart() {
    const existing = JSON.parse(localStorage.getItem('milego_cart') || '[]');
    existing.push({ productId: product.id, tierIndex: selected });
    localStorage.setItem('milego_cart', JSON.stringify(existing));
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div>
      <div style={{ background: 'var(--pine-dark)', color: '#fff', fontSize: 12.5, textAlign: 'center', padding: 8, fontFamily: 'var(--font-mono)', margin: '-28px -32px 24px' }}>
        <span style={{ margin: '0 14px' }}>◆ envío gratis hoy</span>
        <span style={{ margin: '0 14px' }}>◆ pago contra entrega</span>
        <span style={{ margin: '0 14px' }}>◆ garantía 60 días</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 44, marginBottom: 50 }}>
        <div style={{ background: 'linear-gradient(150deg,#2A2E28,#171B15)', borderRadius: 16, aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8B85C', fontFamily: 'var(--font-mono)', fontSize: 13, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'var(--red)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px', borderRadius: 6 }}>🔥 más vendido</div>
          [ imagen del producto — en uso ]
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 26, height: 'fit-content' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
            <span style={{ color: 'var(--amber-dark)', letterSpacing: 1 }}>★★★★★</span> 4.8 · reseñas verificadas
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.2, marginBottom: 10 }}>{product.name}</h1>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginBottom: 16 }}>
            Resultados reales en 15 minutos al día, desde casa.
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--pine-dark)' }}>{money(tiers[selected]?.price || product.price)}</span>
            {tiers[selected]?.compareAt && <span style={{ fontSize: 15, color: 'var(--muted)', textDecoration: 'line-through' }}>{money(tiers[selected].compareAt)}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--red)', marginBottom: 18 }}>⚡ quedan 23 unidades al precio de lanzamiento</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {tiers.map((t: any, i: number) => (
              <div key={i} onClick={() => setSelected(i)}
                style={{
                  border: `2px solid ${selected === i ? 'var(--pine)' : 'var(--line)'}`,
                  background: selected === i ? 'var(--chip-bg)' : '#fff',
                  borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer', position: 'relative',
                }}>
                {i === 2 && <div style={{ position: 'absolute', top: -10, right: 14, background: 'var(--pine)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 9px', borderRadius: 8 }}>más popular</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === i ? 'var(--pine)' : 'var(--muted)'}`, background: selected === i ? 'var(--pine)' : 'transparent' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.sub}</div>
                  </div>
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{money(t.price)}</span>
                  {t.compareAt && <span style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through', marginLeft: 4 }}>{money(t.compareAt)}</span>}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary" style={{ width: '100%', fontSize: 16, padding: 17, marginBottom: 12 }} onClick={addToCart}>
            {added ? 'Agregado ✓' : 'Comprar ahora →'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap', gap: 6 }}>
            <span>🔒 pago seguro</span><span>🚚 envío 2-5 días</span><span>↩ devolución 60 días</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 50px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)' }}>
        {product.name} · un lanzamiento de MIleGo
      </div>
    </div>
  );
}
