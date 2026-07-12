'use client';
import { useEffect, useState } from 'react';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', cost: '', price: '', wow: true, commodity: false, template: 'editorial' });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  async function loadAll() {
    const [p, d] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/decisions').then(r => r.json()),
    ]);
    setProducts(p); setDecisions(d); setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function evaluar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: form.name, cost: Number(form.cost), price: Number(form.price), wow: form.wow, commodity: form.commodity }),
    });
    const product = await res.json();
    showToast(`LIAM evaluó "${product.name}" — score ${product.score}, recomendación: ${product.recommendation}`);
    setForm({ name: '', cost: '', price: '', wow: true, commodity: false, template: 'editorial' });
    loadAll();
  }

  async function aprobar(id: string, template: string) {
    await fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve', template }) });
    showToast('Producto activo en la Tienda con su landing');
    loadAll();
  }

  async function descartar(id: string) {
    await fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'discard' }) });
    loadAll();
  }

  async function eliminar(id: string) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadAll();
  }

  const candidates = products.filter(p => p.status === 'candidate');
  const active = products.filter(p => p.status === 'active');

  if (loading) return <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>cargando…</div>;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--pine-dark)', marginBottom: 6 }}>PANEL DE CONTROL</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, marginBottom: 24 }}>LIAM — decisiones con evidencia</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 30 }}>
        <Kpi label="candidatos evaluados" value={products.length} />
        <Kpi label="lanzamientos activos" value={active.length} />
        <Kpi label="decisiones registradas" value={decisions.length} />
        <Kpi label="candidatos por revisar" value={candidates.length} />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 22, marginBottom: 30 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, marginBottom: 4 }}>Evaluar nuevo candidato</h3>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
          criterio 1: wow/problema real · criterio 2: margen ≥3x · criterio 3: no commodity local
        </div>
        <form onSubmit={evaluar} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto auto auto', gap: 10, alignItems: 'center' }}>
          <input placeholder="Nombre del producto" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
          <input placeholder="Costo proveedor" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={inputStyle} required />
          <input placeholder="Precio de venta" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inputStyle} required />
          <label style={checkLabel}><input type="checkbox" checked={form.wow} onChange={e => setForm({ ...form, wow: e.target.checked })} /> wow</label>
          <label style={checkLabel}><input type="checkbox" checked={form.commodity} onChange={e => setForm({ ...form, commodity: e.target.checked })} /> commodity</label>
          <button type="submit" className="btn-primary">Evaluar</button>
        </form>
      </div>

      {candidates.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '26px 0 14px' }}>Candidatos por revisar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 30 }}>
            {candidates.map((p) => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, position: 'relative' }}>
                <div style={{ float: 'right', width: 42, height: 42, borderRadius: '50%', background: p.score >= 80 ? 'var(--pine)' : p.score >= 50 ? 'var(--amber-dark)' : 'var(--muted)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                  {p.score}
                </div>
                <h4 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 8, maxWidth: '70%' }}>{p.name}</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 6, color: 'var(--ink-soft)' }}>
                  costo {money(p.cost)} · venta {money(p.price)} · margen {(p.price / p.cost).toFixed(1)}x
                </div>
                <div className="chip" style={{ marginBottom: 12 }}>recomendación: {p.recommendation}</div>
                <div style={{ marginBottom: 10 }}>
                  <select onChange={e => (p._template = e.target.value)} defaultValue="editorial" style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                    onClick={(e) => e.stopPropagation()}
                    id={`tpl-${p.id}`}>
                    <option value="editorial">plantilla editorial (ALIVIA)</option>
                    <option value="pagepilot">plantilla PagePilot (NUVA)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => aprobar(p.id, (document.getElementById(`tpl-${p.id}`) as HTMLSelectElement).value)}
                    style={{ ...btnSmall, background: 'var(--pine)', color: '#fff' }}>Aprobar y lanzar</button>
                  <button onClick={() => descartar(p.id)} style={{ ...btnSmall, background: '#F7E7E5', color: '#7A332C' }}>Descartar</button>
                  <button onClick={() => eliminar(p.id)} style={{ ...btnSmall, background: 'var(--chip-bg)', color: 'var(--ink-soft)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '26px 0 14px' }}>Registro de decisiones — LaunchDecision</h2>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {decisions.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>Aún no hay decisiones registradas.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Recomendación', 'Acción', 'Resultado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d: any) => (
                <tr key={d.id}>
                  <td style={tdStyle}>{new Date(d.createdAt).toLocaleDateString('es-CO')}</td>
                  <td style={tdStyle}>{d.type}</td>
                  <td style={tdStyle}>{d.recommendation}</td>
                  <td style={tdStyle}>{d.humanAction}</td>
                  <td style={tdStyle}>{d.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--pine-dark)', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 700, color: 'var(--pine-dark)' }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, width: '100%' };
const checkLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' };
const btnSmall: React.CSSProperties = { border: 'none', padding: '7px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' };
