import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'MIleGo — Launch Operating System',
  description: 'Plataforma de lanzamiento de productos físicos con IA (LIAM)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid var(--line)', background: '#fff',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>
            MIle<span style={{ color: 'var(--amber-dark)' }}>Go</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            <Link href="/admin">Panel LIAM</Link>
            <Link href="/tienda">Tienda</Link>
            <Link href="/ordenes">Órdenes</Link>
            <Link href="/carrito">Carrito</Link>
          </div>
        </nav>
        <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 80px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
