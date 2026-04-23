'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';

const FAQS = [
  {
    q: '¿Puedo probar RestoStack sin ingresar tarjeta?',
    a: 'Sí. El trial de 14 días no pide tarjeta. Al terminar, si querés seguir, ingresás el método de pago desde la app.',
  },
  {
    q: '¿Reemplaza mi POS actual?',
    a: 'Sí. RestoStack es un POS completo con impresión de comandas, cash management, múltiples cajas y modificadores. Pero además hace todo lo que un POS no hace: catálogo multi-canal, costeo, reporting, multi-location.',
  },
  {
    q: '¿Funciona con Rappi, PedidosYa y MercadoPago Delivery?',
    a: 'Sí. Los tres están integrados nativamente. Cargás tu catálogo una vez y se sincroniza automáticamente. Los precios por canal los manejás desde RestoStack.',
  },
  {
    q: '¿Migro mi información actual?',
    a: 'Te ayudamos a migrar. Importamos productos, insumos y recetas desde CSV, Fudo, Excel u otros sistemas. En un trial típico, la migración de un local mediano toma 2-3 horas.',
  },
  {
    q: '¿Cómo factura RestoStack a mis clientes?',
    a: 'En Argentina, emitimos factura A o B vía ARCA/AFIP desde el sistema. Integración nativa, sin configuración compleja. En otros países, exportamos los datos para tu contador.',
  },
  {
    q: 'Tengo una cadena de 10 locales. ¿Es para mí?',
    a: 'Sí. RestoStack fue diseñado multi-location desde el core. El plan Chain incluye dashboard agregado, permisos por location, y catálogo compartido. Hoppiness Club opera 8 locales con RestoStack.',
  },
  {
    q: '¿Qué pasa si se cae internet?',
    a: 'El POS sigue funcionando offline para tomar pedidos y cobrar en efectivo. Cuando vuelve la conexión, sincroniza automáticamente. Cobros con tarjeta requieren conexión (limitación del procesador, no nuestra).',
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Sin contratos, sin penalidades. Cancelás desde la app en un click. Tu data queda disponible por 90 días por si querés volver.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      style={{
        background: 'var(--papel)',
        padding: '140px 32px',
        borderBottom: '1px solid var(--crema)',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{ marginBottom: 64 }}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ceniza)', marginBottom: 16 }}
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 48px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: 'var(--carbon)',
            }}
          >
            Preguntas frecuentes.
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOpts}
          transition={{ duration: 0.5 }}
          role="region"
          aria-label="Preguntas frecuentes"
        >
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{ borderBottom: '1px solid var(--crema)' }}
            >
              <button
                type="button"
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
                id={`faq-question-${i}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '24px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: 16,
                    color: 'var(--carbon)',
                    lineHeight: 1.4,
                  }}
                >
                  {faq.q}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ceniza)',
                    fontSize: 18,
                    transition: 'transform 0.2s ease',
                    transform: openIndex === i ? 'rotate(45deg)' : 'none',
                  }}
                >
                  +
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontVariationSettings: '"opsz" 9',
                        fontWeight: 400,
                        fontSize: 16,
                        color: 'var(--humo)',
                        lineHeight: 1.7,
                        paddingBottom: 24,
                        paddingRight: 36,
                      }}
                    >
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
