import type { Metadata } from 'next';
import { PageHero } from '@/components/marketing/PageHero';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Hoppiness Club con RestoStack — Caso',
  description: '8 hamburgueserías en Córdoba operando con RestoStack. La historia completa.',
};

const STATS = [
  { value: '8', label: 'Locales activos en Córdoba' },
  { value: '40k+', label: 'Tickets por mes' },
  { value: '60', label: 'Empleados en el sistema' },
  { value: '5', label: 'Canales de venta' },
  { value: '1', label: 'Sistema para todo' },
];

export default function HoppinessCasePage() {
  return (
    <>
      <PageHero
        kicker="CASO · HOPPINESS CLUB"
        headline="Ocho locales. Un sistema."
        body="Hoppiness Club es la cadena de hamburgueserías que nació como primer cliente de RestoStack — y hoy lo opera desde el turno de la mañana hasta el cierre de caja."
        background="carbon"
      />

      <section style={{ background: 'var(--papel)', padding: '80px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32, marginBottom: 80 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em', color: 'var(--brasa)' }}>{s.value}</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ceniza)', lineHeight: 1.4, marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Narrative */}
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--carbon)' }}>
              El contexto
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--humo)', lineHeight: 1.7 }}>
              Hoppiness Club empezó con 1 local en Córdoba y creció a 8 en menos de 3 años. Cada nueva apertura traía el mismo problema: más sistemas a sincronizar, más planillas, más tiempo de cierre. El equipo de operaciones pasaba horas conciliando ventas entre el POS, Rappi, PedidosYa y MercadoPago.
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--carbon)', marginTop: 16 }}>
              La solución
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--humo)', lineHeight: 1.7 }}>
              Hoppiness fue el primer tenant de RestoStack. Desde el primer día, el sistema fue diseñado con sus operaciones reales como caso de prueba. Hoy corren todo en un solo stack: catálogo sincronizado en los 5 canales, costeo de cada combo, cierre de caja digital, fichaje de los 60 empleados y reporting consolidado de los 8 locales.
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--carbon)', marginTop: 16 }}>
              El resultado
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--humo)', lineHeight: 1.7 }}>
              El tiempo de cierre de caja pasó de 90 minutos a 12. La conciliación entre canales es automática. Y cuando abren un local nuevo, tarda menos de 2 horas en estar operativo en RestoStack.
            </p>

            <blockquote
              style={{
                borderLeft: '3px solid var(--brasa)',
                paddingLeft: 24,
                margin: '24px 0',
              }}
            >
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--carbon)', lineHeight: 1.5, fontWeight: 400, marginBottom: 12 }}>
                "RestoStack no es solo software. Es como tener un director de operaciones que nunca duerme."
              </p>
              <cite style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ceniza)', fontStyle: 'normal' }}>
                — Juan, operador de Hoppiness Club
              </cite>
            </blockquote>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
