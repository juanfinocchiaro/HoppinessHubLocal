'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { staggerHero, fadeUpVariants } from '@/lib/animations';

interface PageHeroProps {
  kicker: string;
  headline: string;
  body?: string;
  background?: 'carbon' | 'papel' | 'crema';
}

export function PageHero({ kicker, headline, body, background = 'carbon' }: PageHeroProps) {
  const isDark = background === 'carbon';
  const bg = {
    carbon: 'var(--carbon)',
    papel: 'var(--papel)',
    crema: 'var(--crema)',
  }[background];

  return (
    <section
      style={{
        background: bg,
        paddingTop: 128,
        paddingBottom: 96,
        paddingLeft: 32,
        paddingRight: 32,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isDark && (
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
      )}
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={staggerHero}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: isDark ? 'var(--piedra)' : 'var(--ceniza)',
            }}
          >
            {kicker}
          </motion.p>
          <motion.h1
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
              fontWeight: 700,
              fontSize: 'clamp(40px, 7vw, 80px)',
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              color: isDark ? 'var(--papel)' : 'var(--carbon)',
            }}
          >
            {headline}
          </motion.h1>
          {body && (
            <motion.p
              variants={fadeUpVariants}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 19,
                color: isDark ? 'var(--ceniza)' : 'var(--humo)',
                lineHeight: 1.6,
                maxWidth: 560,
              }}
            >
              {body}
            </motion.p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
