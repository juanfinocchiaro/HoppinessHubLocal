'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogoHero } from '../logo/LogoHero';
import { staggerHero, fadeUpVariants } from '@/lib/animations';

export function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: 'var(--carbon)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 64,
      }}
    >
      {/* Dots pattern background */}
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

      {/* Subtle radial glow behind logo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          right: '8%',
          transform: 'translateY(-50%)',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(207, 78, 46, 0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '80px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          width: '100%',
        }}
      >
        {/* Left: copy */}
        <motion.div
          variants={staggerHero}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Kicker */}
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--piedra)',
              margin: 0,
            }}
          >
            RESTAURANT OS · LATAM
          </motion.p>

          {/* H1 */}
          <motion.h1
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontWeight: 800,
              fontSize: 'clamp(64px, 10vw, 144px)',
              letterSpacing: '-0.045em',
              lineHeight: 0.92,
              color: 'var(--papel)',
              margin: 0,
            }}
          >
            Operá con todo.
          </motion.h1>

          {/* Sub-headline (copy literal del brand manual) */}
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              fontSize: 20,
              color: 'var(--ceniza)',
              lineHeight: 1.55,
              maxWidth: 520,
              margin: 0,
            }}
          >
            RestoStack es el sistema operativo para operadores gastronómicos que ya saben que la cocina es el arte — y el resto, disciplina.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUpVariants}
            style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
          >
            <Link
              href="/signup"
              data-event="landing_hero_cta_click"
              data-variant="primary"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--papel)',
                background: 'var(--brasa)',
                textDecoration: 'none',
                padding: '14px 28px',
                borderRadius: 999,
                transition: 'background 0.2s ease',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--ember)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--brasa)')}
            >
              Empezar gratis 14 días
            </Link>
            <a
              href="#funciones"
              data-event="landing_hero_cta_click"
              data-variant="secondary"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--ceniza)',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
                transition: 'color 0.15s ease',
              }}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#funciones')?.scrollIntoView({ behavior: 'smooth' });
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hueso)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ceniza)')}
            >
              Ver cómo funciona ↓
            </a>
          </motion.div>

          {/* Fine print */}
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--humo)',
              margin: 0,
            }}
          >
            SIN TARJETA · SIN CONTRATO · 5 MIN PARA TU PRIMER PEDIDO
          </motion.p>
        </motion.div>

        {/* Right: visual hero — Stack Build logo animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          className="hidden md:flex"
        >
          <div
            style={{
              width: 340,
              height: 340,
              background: 'var(--grafito)',
              borderRadius: 40,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 40px 80px -20px rgba(207, 78, 46, 0.18), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            <LogoHero size={200} />
          </div>
        </motion.div>
      </div>

      {/* Mobile hero visual (below copy) */}
      <div
        className="md:hidden"
        style={{ display: 'flex', justifyContent: 'center', paddingBottom: 64, position: 'relative', zIndex: 1 }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            background: 'var(--grafito)',
            borderRadius: 24,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 24px 48px -12px rgba(207, 78, 46, 0.15)',
          }}
        >
          <LogoHero size={120} />
        </div>
      </div>
    </section>
  );
}
