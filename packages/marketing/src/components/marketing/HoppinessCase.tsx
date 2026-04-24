'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';

const STATS = [
  { value: 8, label: 'LOCALES', suffix: '' },
  { value: 40000, label: 'TICKETS/MES', suffix: '+', format: (n: number) => n >= 1000 ? `${Math.floor(n / 1000)}k` : `${n}` },
  { value: 60, label: 'EMPLEADOS', suffix: '' },
  { value: 5, label: 'CANALES', suffix: '' },
];

function AnimatedStat({
  value,
  label,
  suffix,
  format,
  triggered,
}: {
  value: number;
  label: string;
  suffix: string;
  format?: (n: number) => string;
  triggered: boolean;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!triggered) return;

    let startTime: number | null = null;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [triggered, value]);

  const display = format ? format(current) : current.toString();

  return (
    <div style={{ textAlign: 'center' }}>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontVariationSettings: '"opsz" 144',
          fontWeight: 800,
          fontSize: 'clamp(48px, 7vw, 80px)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: 'var(--carbon)',
          marginBottom: 8,
        }}
      >
        {display}
        {suffix}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: 'var(--ceniza)',
        }}
      >
        {label}
      </p>
    </div>
  );
}

export function HoppinessCase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      data-section="case-hoppiness"
      style={{
        background: 'var(--papel)',
        padding: '140px 32px',
        borderBottom: '1px solid var(--crema)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{ maxWidth: 720, marginBottom: 80 }}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ceniza)', marginBottom: 16 }}
          >
            CASO
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
              color: 'var(--carbon)',
              marginBottom: 24,
            }}
          >
            Ocho locales. Un sistema.
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--humo)', lineHeight: 1.7, marginBottom: 16 }}
          >
            Hoppiness Club opera 8 hamburgueserías en Córdoba con RestoStack desde 2025. Lo que empezó como herramienta interna para controlar 1 local hoy corre toda la operación: venta por mostrador, 3 delivery apps, centro de producción propio, fichaje de 60 empleados, reporting consolidado y costeo en tiempo real.
          </motion.p>
          <motion.div variants={fadeUpVariants}>
            <Link
              href="/clientes/hoppiness"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 15,
                color: 'var(--brasa)',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ember)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--brasa)')}
            >
              Ver el caso completo →
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats grid */}
        <div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: 48 }}
        >
          {STATS.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              format={stat.format}
              triggered={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
