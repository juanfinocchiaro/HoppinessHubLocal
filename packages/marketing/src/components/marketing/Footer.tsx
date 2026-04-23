'use client';

import React from 'react';
import Link from 'next/link';
import { LogoLockup } from '../logo/LogoLockup';

const FOOTER_COLS = [
  {
    heading: 'Producto',
    links: [
      { href: '/funciones', label: 'Funciones' },
      { href: '/precios', label: 'Precios' },
      { href: '/para-chains', label: 'Para cadenas' },
      { href: '#', label: 'Estado del servicio' },
    ],
  },
  {
    heading: 'Empresa',
    links: [
      { href: '/clientes', label: 'Clientes' },
      { href: '/nosotros', label: 'Nosotros' },
      { href: '/blog', label: 'Blog' },
      { href: '/contacto', label: 'Contacto' },
    ],
  },
  {
    heading: 'Recursos',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/recursos', label: 'Guías' },
      { href: '#', label: 'Centro de ayuda' },
      { href: '#', label: 'Documentación' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/legal/terminos', label: 'Términos' },
      { href: '/legal/privacidad', label: 'Privacidad' },
      { href: '/legal/seguridad', label: 'Seguridad' },
    ],
  },
];

const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--piedra)',
  textDecoration: 'none',
  lineHeight: '2',
  transition: 'color 0.15s ease',
};

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--carbon)',
        color: 'var(--hueso)',
        padding: '80px 32px 40px',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '48px 32px',
            paddingBottom: 64,
            borderBottom: '1px solid var(--humo)',
          }}
        >
          {/* Brand col */}
          <div style={{ gridColumn: 'span 1' }}>
            <LogoLockup size="sm" variant="dark-bg" />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 15,
                color: 'var(--piedra)',
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              Tu operación, en orden.
            </p>
          </div>

          {/* Nav cols */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'var(--ceniza)',
                  marginBottom: 16,
                }}
              >
                {col.heading}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={linkStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hueso)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--piedra)')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingTop: 32,
          }}
        >
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ceniza)' }}>
            © 2026 RestoStack. Hecho en Córdoba, Argentina.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {(['Instagram', 'LinkedIn', 'X'] as const).map((social) => (
              <Link
                key={social}
                href="#"
                style={{ ...linkStyle, fontSize: 13 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hueso)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--piedra)')}
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
