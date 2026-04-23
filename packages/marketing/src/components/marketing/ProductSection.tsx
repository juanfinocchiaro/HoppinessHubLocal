'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';

export interface ProductSectionProps {
  kicker: string;
  headline: string;
  body: string;
  bullets: string[];
  /** Image src, or null to show placeholder */
  image?: string | null;
  direction: 'left' | 'right';
  background: 'papel' | 'crema';
}

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/10',
        background: 'var(--crema)',
        border: '1px solid var(--hueso)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      {/* Mini RestoStack symbol */}
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="8" fill="#0C0B09" />
        <rect x="25" y="10" width="14" height="5" rx="1" fill="#D4CDBF" />
        <rect x="25" y="49" width="14" height="5" rx="1" fill="#D4CDBF" />
        <rect x="10" y="25" width="5" height="14" rx="1" fill="#D4CDBF" />
        <rect x="49" y="25" width="5" height="14" rx="1" fill="#D4CDBF" />
        <rect x="22" y="22" width="20" height="20" rx="2" fill="#CF4E2E" />
      </svg>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--piedra)',
        }}
      >
        {label}
      </p>
    </div>
  );
}

export function ProductSection({
  kicker,
  headline,
  body,
  bullets,
  image,
  direction,
  background,
}: ProductSectionProps) {
  const bg = background === 'papel' ? 'var(--papel)' : 'var(--crema)';
  const isLeft = direction === 'left';

  return (
    <section
      style={{
        background: bg,
        padding: '140px 32px',
        borderBottom: '1px solid var(--crema)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
        }}
      >
        {/* Screenshot — order depends on direction */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOpts}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ order: isLeft ? 0 : 1 }}
          className="hidden md:block"
        >
          {image ? (
            <img
              src={image}
              alt={headline}
              style={{ width: '100%', borderRadius: 12, display: 'block' }}
            />
          ) : (
            <ScreenshotPlaceholder label={kicker} />
          )}
        </motion.div>

        {/* Text */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            order: isLeft ? 1 : 0,
          }}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--ceniza)',
            }}
          >
            {kicker}
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
            {headline}
          </motion.h2>

          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 17,
              color: 'var(--humo)',
              lineHeight: 1.7,
            }}
          >
            {body}
          </motion.p>

          <motion.ul
            variants={fadeUpVariants}
            style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {bullets.map((bullet) => (
              <li
                key={bullet}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  color: 'var(--ceniza)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--brasa)',
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                {bullet}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Mobile: screenshot below text */}
        <div className="md:hidden" style={{ gridColumn: '1 / -1' }}>
          {image ? (
            <img src={image} alt={headline} style={{ width: '100%', borderRadius: 12, display: 'block' }} />
          ) : (
            <ScreenshotPlaceholder label={kicker} />
          )}
        </div>
      </div>
    </section>
  );
}
