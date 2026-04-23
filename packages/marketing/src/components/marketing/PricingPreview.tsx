'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUpVariants, staggerContainer, viewportOpts } from '@/lib/animations';
import { PRICING_TIERS } from '@/lib/pricing';

export function PricingPreview() {
  return (
    <section
      style={{
        background: 'var(--crema)',
        padding: '140px 32px',
        borderBottom: '1px solid var(--hueso)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ceniza)', marginBottom: 16 }}
          >
            PRECIO
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
            Un plan que crece con vos.
          </motion.h2>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOpts}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 40,
          }}
        >
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              style={{
                background: tier.highlighted ? 'var(--carbon)' : 'var(--papel)',
                border: tier.highlighted ? '1px solid var(--humo)' : '1px solid var(--hueso)',
                borderRadius: 8,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                position: 'relative',
              }}
            >
              {tier.highlighted && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--brasa)',
                    color: 'var(--papel)',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    padding: '4px 12px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Más popular
                </div>
              )}

              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: tier.highlighted ? 'var(--piedra)' : 'var(--ceniza)',
                    marginBottom: 4,
                  }}
                >
                  {tier.name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    color: tier.highlighted ? 'var(--piedra)' : 'var(--ceniza)',
                  }}
                >
                  {tier.locales}
                </p>
              </div>

              <div>
                {tier.priceMonthly !== null ? (
                  <>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontVariationSettings: '"opsz" 144',
                        fontWeight: 800,
                        fontSize: 48,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        color: tier.highlighted ? 'var(--papel)' : 'var(--carbon)',
                      }}
                    >
                      USD {tier.priceMonthly}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        color: tier.highlighted ? 'var(--ceniza)' : 'var(--piedra)',
                        marginTop: 4,
                      }}
                    >
                      /mes
                    </p>
                  </>
                ) : (
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 700,
                      fontSize: 28,
                      color: tier.highlighted ? 'var(--papel)' : 'var(--carbon)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    A consultar
                  </p>
                )}
              </div>

              <Link
                href={tier.ctaHref}
                data-event="landing_pricing_preview_click"
                data-tier={tier.id}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  fontSize: 14,
                  color: tier.highlighted ? 'var(--papel)' : 'var(--carbon)',
                  background: tier.highlighted ? 'var(--brasa)' : 'transparent',
                  border: tier.highlighted ? 'none' : '1px solid var(--carbon)',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  borderRadius: 999,
                  textAlign: 'center',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (tier.highlighted) el.style.background = 'var(--ember)';
                  else el.style.borderColor = 'var(--brasa)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (tier.highlighted) el.style.background = 'var(--brasa)';
                  else el.style.borderColor = 'var(--carbon)';
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </motion.div>

        {/* Ver tabla completa + disclaimer */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Link
            href="/precios"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 15,
              color: 'var(--ceniza)',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--carbon)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ceniza)')}
          >
            Ver tabla completa →
          </Link>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--piedra)' }}>
            Todos los planes incluyen 14 días gratis, sin tarjeta.
          </p>
        </div>
      </div>
    </section>
  );
}
