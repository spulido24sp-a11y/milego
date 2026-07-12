'use client';
import { useState } from 'react';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function EditorialLanding({ product }: { product: any }) {
  const [adding, setAdding] = useState<number | null>(null);
  const tiers = product.tiers || [];
  const persona = product.buyerPersona;

  async function addToCart(tierIndex: number) {
    setAdding(tierIndex);
    const existing = JSON.parse(localStorage.getItem('milego_cart') || '[]');
    existing.push({ productId: product.id, tierIndex });
    localStorage.setItem('milego_cart', JSON.stringify(existing));
    setTimeout(() => setAdding(null), 800);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', padding: '20px 0 60px' }}>
        <div>
          <div className="chip" style={{ marginBottom: 20 }}>◆ un lanzamiento de MIleGo</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1.08, marginBottom: 20 }}>
            {product.name}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', maxWidth: 440, marginBottom: 28 }}>
            Resuelve un problema real, en minutos al día, sin salir de casa.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => addToCart(0)}>
              {adding === 0 ? 'Agregado ✓' : 'Ver ofertas →'}
            </button>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-soft)' }}>
              desde <b style={{ fontSize: 20, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>{money(product.price)}</b>
            </div>
          </div>
        </div>
        <div style={{ aspectRatio: '1/1', background: 'linear-gradient(160deg,#DDE7DE,#C9D8CB)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', color: 'var(--pine-dark)', fontSize: 13 }}>
          [ imagen de producto ]
        </div>
      </div>

      {persona && (
        <div style={{ background: 'var(--chip-bg)', borderRadius: 16, padding: 24, marginBottom: 50 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pine-dark)', marginBottom: 8 }}>PENSADO PARA</div>
          <div style={{ fontSize: 14.5, color: 'var(--ink-soft)' }}>{persona.perfil}</div>
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 22 }}>Elige tu oferta</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 60 }}>
        {tiers.map((t: any, i: number) => (
          <div key={i} style={{ background: '#fff', border: i === 1 ? '2px solid var(--pine)' : '1px solid var(--line)', borderRadius: 14, padding: 22, position: 'relative' }}>
            {i === 1 && <div style={{ position: 'absolute', top: -11, left: 20, background: 'var(--pine)', color: '#fff', fontSize: 10.5, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: 10 }}>más popular</div>}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{t.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 10 }}>{money(t.price)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>{t.sub}</div>
            <button className="btn-primary" style={{ width: '100%', background: i === 1 ? 'var(--amber)' : 'var(--pine)', color: i === 1 ? '#20180A' : '#fff' }}
              onClick={() => addToCart(i)}>
              {adding === i ? 'Agregado ✓' : 'Elegir'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
        impulsado por LIAM · un lanzamiento de MIleGo
      </div>
    </div>
  );
}
