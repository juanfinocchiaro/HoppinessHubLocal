'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUpVariants, viewportOpts } from '@/lib/animations';

function HoppinessLogo({ hovered }: { hovered: boolean }) {
  return (
    <svg
      width="130"
      height="36"
      viewBox="0 0 130 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hoppiness Club"
      style={{ transition: 'opacity 0.2s ease', opacity: hovered ? 1 : 0.45 }}
    >
      <text
        x="0"
        y="28"
        fontFamily="var(--font-serif)"
        fontSize="26"
        fontWeight="700"
        fill={hovered ? '#CF4E2E' : '#5A5450'}
        letterSpacing="-0.02em"
        style={{ transition: 'fill 0.2s ease' }}
      >
        Hoppiness
      </text>
    </svg>
  );
}

export function SocialProof() {
  const [hovered, setHovered] = React.useState(false);

  return (
    <section
      data-section="social-proof"
      style={{
        background: 'var(--crema)',
        padding: '80px 32px',
        borderBottom: '1px solid var(--hueso)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: 'var(--ceniza)',
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          OPERACIONES VIVAS EN RESTOSTACK
        </motion.p>

        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 48,
          }}
        >
          <div
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <HoppinessLogo hovered={hovered} />
          </div>
        </motion.div>

        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--piedra)',
            textAlign: 'center',
            marginTop: 40,
            fontStyle: 'italic',
          }}
        >
          Hoppiness Club · 8 locales en Córdoba · más de 40.000 tickets por mes
        </motion.p>
      </div>
    </section>
  );
}
