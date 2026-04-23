'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUpVariants, viewportOpts } from '@/lib/animations';

const CLIENTS = [
  { name: 'Hoppiness Club', label: 'Hoppiness Club — 8 locales en Córdoba' },
  // Slots para logos adicionales cuando Juan los consiga
  { name: 'Cliente 2', label: 'Próximamente' },
  { name: 'Cliente 3', label: 'Próximamente' },
];

function HoppinessLogo({ grayscale }: { grayscale: boolean }) {
  return (
    <svg
      width="120"
      height="32"
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: grayscale ? 'grayscale(1) opacity(0.5)' : 'none',
        transition: 'filter 0.2s ease',
      }}
    >
      {/* Placeholder wordmark until Juan provides vector logo */}
      <text
        x="0"
        y="24"
        fontFamily="var(--font-serif)"
        fontSize="22"
        fontWeight="700"
        fill={grayscale ? '#8A827C' : '#CF4E2E'}
        letterSpacing="-0.02em"
      >
        Hoppiness
      </text>
    </svg>
  );
}

function PlaceholderLogo({ grayscale }: { grayscale: boolean }) {
  return (
    <div
      style={{
        width: 100,
        height: 32,
        background: grayscale ? 'rgba(138, 130, 124, 0.2)' : 'rgba(138, 130, 124, 0.3)',
        borderRadius: 4,
        transition: 'background 0.2s ease',
      }}
    />
  );
}

function ClientLogo({ name, index }: { name: string; index: number }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      key={name}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {index === 0 ? (
        <HoppinessLogo grayscale={!hovered} />
      ) : (
        <PlaceholderLogo grayscale={!hovered} />
      )}
    </div>
  );
}

export function SocialProof() {
  return (
    <section
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
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
            alignItems: 'center',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          {CLIENTS.map((client, i) => (
            <ClientLogo key={client.name} name={client.name} index={i} />
          ))}
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
          Hoppiness Club · 8 locales · más de 40.000 tickets por mes
        </motion.p>
      </div>
    </section>
  );
}
