'use client';
import { useEffect, useState } from 'react';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function CarritoPage() {
  const [lines, setLines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('milego_cart') || '[]');
    setLines(cart);
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  function removeLine(i: number) {
    const updated = [...lines];
    updated.splice(i, 1);
    setLines(updated);
    localStorage.setItem('milego_cart', JSON.stringify(updated));
  }

  async function checkout() {
    setPlacing(true);
    for (const line of lines) {
      const product = products.find(p => p.id === line.productId);
      const tier = product.tiers[line.tierIndex];
      await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, qty: tier.qty, price: tier.price }),
      });
    }
    localStorage.setItem('milego_cart', '[]');
    setLines([]);
    setPlacing(false);
    window.location.href = '/ordenes';
  }

  const total = lines.reduce((s, l) => {
    const product = products.find(p => p.id === l.productId);
    if (!product) return s;
    return s + product.tiers[l.tierIndex].price;
  }, 0);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, marginBottom: 24 }}>Carrito</h1>
      {lines.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Tu carrito está vacío. Ve a la tienda y elige una oferta.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          {lines.map((line, i) => {
            const product = products.find(p => p.id === line.productId);
            if (!product) return null;
            const tier = product.tiers[line.tierIndex];
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{tier.label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{money(tier.price)}</div>
                  <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)' }}>✕</button>
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>total: {money(total)}</div>
            <button className="btn-primary" onClick={checkout} disabled={placing}>
              {placing ? 'procesando…' : 'Confirmar pedido (contraentrega) →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
