'use client';
import { useEffect, useState } from 'react';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function OrdenesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const o = await fetch('/api/orders').then(r => r.json());
    setOrders(o); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  if (loading) return <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>cargando…</div>;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--pine-dark)', marginBottom: 6 }}>FULFILLMENT</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, marginBottom: 6 }}>Órdenes</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 22, maxWidth: 560 }}>
        En producción, este estado se actualiza automáticamente vía el webhook de Dropi (ver lib/dropi.ts).
        Aquí puedes simularlo manualmente mientras conectas tu API key real.
      </p>
      {orders.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Aún no hay órdenes.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Fecha', 'Producto', 'Cant.', 'Valor', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id}>
                  <td style={tdStyle}>{new Date(o.createdAt).toLocaleDateString('es-CO')}</td>
                  <td style={tdStyle}>{o.product?.name}</td>
                  <td style={tdStyle}>{o.qty}</td>
                  <td style={tdStyle}>{money(o.price)}</td>
                  <td style={tdStyle}>
                    <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
                      <option value="pendiente_confirmacion">pendiente confirmación</option>
                      <option value="despachado">despachado</option>
                      <option value="entregado">entregado</option>
                      <option value="rechazado">rechazado (novedad)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tdStyle: React.CSSProperties = { padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' };
