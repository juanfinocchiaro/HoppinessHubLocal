'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';

const ROWS = [
  { feature: 'Qué hace', pos: 'Cobra', restostack: 'Cobra, costea y orquesta canales' },
  { feature: 'Canales', pos: '1 (mostrador)', restostack: 'POS + WebApp + Rappi + PY + MPD' },
  { feature: 'Precios', pos: 'Precio plano', restostack: 'Precio por canal con overrides' },
  { feature: 'Stock', pos: 'Sin costeo real', restostack: 'Cost rollup desde insumo' },
  { feature: 'Escala', pos: '1 local', restostack: '1 a ∞ locales, mismo sistema' },
  { feature: 'Integración', pos: 'Plugins externos', restostack: 'Multi-canal nativo' },
];

export function Comparison() {
  return (
    <section
      data-section="comparison"
      style={{
        background: 'var(--carbon)',
        padding: '140px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dots pattern */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--dots-dark)',
          backgroundSize: 'var(--dots-size)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
            DIFERENCIA
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 56px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: 'var(--papel)',
            }}
          >
            No somos otro POS.{' '}
            <span style={{ color: 'var(--piedra)', fontWeight: 300, fontStyle: 'italic' }}>
              Somos el stack completo.
            </span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOpts}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <table
            style={{
              width: '100%',
              minWidth: 540,
              borderCollapse: 'collapse',
              background: 'var(--grafito)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Capacidad</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>POS tradicional</th>
                <th style={{ ...thStyle, textAlign: 'center', color: 'var(--ascua)' }}>RestoStack</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} style={{ borderTop: '1px solid var(--humo)' }}>
                  <td style={tdFeatureStyle}>{row.feature}</td>
                  <td style={tdPosStyle}>{row.pos}</td>
                  <td style={tdRestoStyle}>
                    {/* Brasa left border accent */}
                    <span style={{ borderLeft: '3px solid var(--brasa)', paddingLeft: 12, display: 'block' }}>
                      {row.restostack}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--ceniza)',
  padding: '18px 24px',
  textAlign: 'left',
  background: 'var(--humo)',
};

const tdFeatureStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 14,
  color: 'var(--piedra)',
  padding: '16px 24px',
  width: '20%',
};

const tdPosStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--ceniza)',
  padding: '16px 24px',
  textAlign: 'center',
};

const tdRestoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--hueso)',
  padding: '16px 24px',
};
