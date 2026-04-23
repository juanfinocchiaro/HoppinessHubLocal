import type { Metadata } from 'next';
import { PageHero } from '@/components/marketing/PageHero';
import { ContactForm } from '@/components/marketing/ContactForm';

export const metadata: Metadata = {
  title: 'Contacto — RestoStack',
  description: 'Hablemos. Agendá una demo o escribinos sobre tu operación.',
};

export default function ContactoPage() {
  return (
    <>
      <PageHero
        kicker="CONTACTO"
        headline="Hablemos."
        body="Agendá una demo, consultá precios o simplemente contanos sobre tu operación. Respondemos en menos de 24 horas."
        background="carbon"
      />

      <section style={{ background: 'var(--papel)', padding: '80px 32px' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 80,
          }}
        >
          {/* Left: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ceniza)', marginBottom: 8 }}>
                EMAIL
              </p>
              <a
                href="mailto:hola@restostack.com"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--brasa)', textDecoration: 'none' }}
              >
                hola@restostack.com
              </a>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ceniza)', marginBottom: 8 }}>
                DÓNDE ESTAMOS
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--humo)', lineHeight: 1.5 }}>
                Córdoba, Argentina
              </p>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ceniza)', marginBottom: 8 }}>
                TIEMPO DE RESPUESTA
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--humo)' }}>
                Respondemos en menos de 24 h (días hábiles).
              </p>
            </div>
          </div>

          {/* Right: form */}
          <ContactForm />
        </div>
      </section>
    </>
  );
}
