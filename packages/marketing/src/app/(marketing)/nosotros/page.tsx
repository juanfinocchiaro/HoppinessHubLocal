import type { Metadata } from 'next';
import { PageHero } from '@/components/marketing/PageHero';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Nosotros — RestoStack',
  description: 'RestoStack nació desde adentro de una cocina. Somos el equipo detrás de Hoppiness Club, y construimos las herramientas que necesitábamos para operar.',
};

const VALUES = [
  {
    kicker: 'ORIGEN',
    headline: 'Nacimos en una cocina.',
    body: 'RestoStack no empezó como una startup de tecnología mirando el sector gastronómico desde afuera. Empezó como la herramienta interna que necesitábamos para operar Hoppiness Club — 8 hamburgueserías en Córdoba. Si el sistema falla, nosotros lo sentimos primero.',
  },
  {
    kicker: 'PRINCIPIO',
    headline: 'La cocina es el arte. El resto, disciplina.',
    body: 'Creemos que los operadores gastronómicos merecen herramientas que estén a la altura de su trabajo. No parches, no planillas, no ocho sistemas que no se hablan. Un stack sólido, opinado, construido para operar en serio.',
  },
  {
    kicker: 'FOCO',
    headline: 'LatAm primero.',
    body: 'El mercado gastronómico de América Latina tiene particularidades que las soluciones importadas no resuelven: facturación AFIP/ARCA, Rappi, PedidosYa, MercadoPago, operaciones en pesos con inflación, equipos que rotan. Diseñamos para acá.',
  },
];

export default function NosotrosPage() {
  return (
    <>
      <PageHero
        kicker="NOSOTROS"
        headline="Operamos lo que construimos."
        body="RestoStack es el sistema operativo que desarrollamos para gestionar Hoppiness Club — y que hoy está disponible para cualquier operador gastronómico serio en LatAm."
        background="carbon"
      />

      <section style={{ background: 'var(--papel)', padding: '120px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 80 }}>
          {VALUES.map(({ kicker, headline, body }) => (
            <div key={kicker} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 64 }} className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    color: 'var(--ceniza)',
                    paddingTop: 6,
                  }}
                >
                  {kicker}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontVariationSettings: '"opsz" 144',
                    fontWeight: 700,
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.1,
                    color: 'var(--carbon)',
                  }}
                >
                  {headline}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 17,
                    color: 'var(--humo)',
                    lineHeight: 1.7,
                    maxWidth: 620,
                  }}
                >
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--crema)', padding: '120px 32px', borderTop: '1px solid var(--hueso)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--ceniza)',
              marginBottom: 24,
            }}
          >
            CONTACTO
          </p>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 48px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: 'var(--carbon)',
              marginBottom: 24,
            }}
          >
            Hablemos.
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--humo)', lineHeight: 1.7, maxWidth: 480, marginBottom: 32 }}>
            Si tenés preguntas sobre el producto, querés una demo o simplemente querés contarnos sobre tu operación, escribinos.
          </p>
          <a
            href="mailto:hola@restostack.com"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 17,
              color: 'var(--brasa)',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            hola@restostack.com
          </a>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
