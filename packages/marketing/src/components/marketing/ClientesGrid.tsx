'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const STATS = [
  ['8', 'Locales'],
  ['40k+', 'Tickets/mes'],
  ['60', 'Empleados'],
  ['5', 'Canales'],
] as const;

export function ClientesGrid() {
  const [hovered, setHovered] = useState(false);

  return (
    <section style={{ background: 'var(--papel)', padding: '80px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/clientes/hoppiness" style={{ textDecoration: 'none', display: 'block' }}>
          <div
            style={{
              background: 'var(--crema)',
              border: `1px solid ${hovered ? 'var(--brasa)' : 'var(--hueso)'}`,
              borderRadius: 8,
              padding: 48,
              transition: 'border-color 0.15s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ceniza)', marginBottom: 12 }}>
              CASO · 2025
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.025em', color: 'var(--carbon)', marginBottom: 16 }}>
              Hoppiness Club
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--humo)', lineHeight: 1.6, maxWidth: 560, marginBottom: 24 }}>
              8 hamburgueserías en Córdoba. 40.000+ tickets por mes. 60 empleados. Un sistema.
            </p>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {STATS.map(([v, l]) => (
                <div key={l}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em', color: 'var(--brasa)' }}>{v}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--ceniza)' }}>{l}</p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--brasa)', marginTop: 24 }}>
              Ver caso completo →
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
