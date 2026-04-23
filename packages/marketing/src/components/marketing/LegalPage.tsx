import React from 'react';

interface LegalPageProps {
  kicker: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ kicker, title, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <section
        style={{
          background: 'var(--carbon)',
          paddingTop: 128,
          paddingBottom: 80,
          paddingLeft: 32,
          paddingRight: 32,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--piedra)', marginBottom: 16 }}>
            {kicker}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 48,
              letterSpacing: '-0.035em',
              color: 'var(--papel)',
              marginBottom: 16,
            }}
          >
            {title}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ceniza)' }}>
            Última actualización: {lastUpdated}
          </p>
        </div>
      </section>

      <section style={{ background: 'var(--papel)', padding: '80px 32px' }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            lineHeight: 1.75,
            color: 'var(--humo)',
          }}
        >
          {children}
        </div>
      </section>
    </>
  );
}
