'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUpVariants, viewportOpts } from '@/lib/animations';

export function FinalCTA() {
  return (
    <section
      data-section="final-cta"
      style={{
        background: 'var(--carbon)',
        padding: '160px 32px',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
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

      {/* Radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 640,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(207, 78, 46, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
        >
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontWeight: 800,
              fontSize: 'clamp(36px, 6vw, 64px)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: 'var(--papel)',
            }}
          >
            Dejá de administrar sistemas.{' '}
            <span style={{ color: 'var(--brasa)' }}>Empezá a operar.</span>
          </motion.h2>

          <motion.div
            variants={fadeUpVariants}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
          >
            <Link
              href="/signup"
              data-event="landing_final_cta_click"
              data-variant="primary"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 17,
                color: 'var(--papel)',
                background: 'var(--brasa)',
                textDecoration: 'none',
                padding: '16px 36px',
                borderRadius: 999,
                transition: 'background 0.2s ease',
                display: 'inline-block',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--ember)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--brasa)')}
            >
              Empezar gratis 14 días
            </Link>

            <Link
              href="/contacto?motivo=demo"
              data-event="landing_final_cta_click"
              data-variant="demo"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                color: 'var(--ceniza)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--piedra)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ceniza)')}
            >
              O agendá una demo con el equipo →
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
