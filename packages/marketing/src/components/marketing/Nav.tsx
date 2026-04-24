'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoLockup } from '../logo/LogoLockup';

const NAV_LINKS = [
  { href: '/funciones', label: 'Funciones' },
  { href: '/precios', label: 'Precios' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/blog', label: 'Blog' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [atHero, setAtHero] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
      setAtHero(window.scrollY < (window.innerHeight * 0.7));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header
      role="banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'background 0.3s ease, border-color 0.3s ease',
        background: scrolled ? 'rgba(250, 248, 244, 0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(212, 205, 191, 0.5)' : '1px solid transparent',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link href="/" aria-label="RestoStack — inicio" style={{ textDecoration: 'none' }}>
          <LogoLockup size="sm" variant="light-bg" />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Navegación principal"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 14,
                color: atHero && !scrolled ? 'var(--piedra)' : 'var(--ceniza)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = atHero && !scrolled ? 'var(--hueso)' : 'var(--carbon)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = atHero && !scrolled ? 'var(--piedra)' : 'var(--ceniza)')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
          <Link
            href="https://app.restostack.com/ingresar"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 14,
              color: atHero && !scrolled ? 'var(--piedra)' : 'var(--ceniza)',
              textDecoration: 'none',
              padding: '6px 12px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = atHero && !scrolled ? 'var(--hueso)' : 'var(--carbon)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = atHero && !scrolled ? 'var(--piedra)' : 'var(--ceniza)')}
          >
            Ingresar
          </Link>
          <Link
            href="/signup"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 14,
              color: 'var(--papel)',
              background: 'var(--brasa)',
              textDecoration: 'none',
              padding: '8px 18px',
              borderRadius: 999,
              transition: 'background 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--ember)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--brasa)')}
          >
            Empezar gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
          className="md:hidden"
        >
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              background: atHero && !scrolled ? 'var(--hueso)' : 'var(--carbon)',
              transition: 'transform 0.2s ease, opacity 0.2s ease, background 0.3s ease',
              transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              background: atHero && !scrolled ? 'var(--hueso)' : 'var(--carbon)',
              transition: 'opacity 0.2s ease, background 0.3s ease',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              background: atHero && !scrolled ? 'var(--hueso)' : 'var(--carbon)',
              transition: 'transform 0.2s ease, opacity 0.2s ease, background 0.3s ease',
              transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-label="Menú de navegación"
          style={{
            position: 'fixed',
            inset: 0,
            top: 64,
            background: 'var(--papel)',
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            padding: '32px 32px 40px',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: '-0.02em',
                  color: 'var(--carbon)',
                  textDecoration: 'none',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--crema)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link
              href="https://app.restostack.com/ingresar"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--ceniza)',
                textDecoration: 'none',
                padding: '14px 0',
                textAlign: 'center',
              }}
            >
              Ingresar
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--papel)',
                background: 'var(--brasa)',
                textDecoration: 'none',
                padding: '16px',
                borderRadius: 999,
                textAlign: 'center',
              }}
            >
              Empezar gratis 14 días
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
