'use client';

/**
 * LogoHero — Stack Build animation (#9 canónica) para el Hero de la landing.
 * Las sillas caen una a una, la mesa entra con rotación. 2.3s · one-shot.
 */

import React from 'react';

const CHAIR = '#D4CDBF';
const BRASA = '#CF4E2E';
const CARBON = '#0C0B09';
const ELASTIC = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const keyframes = `
@keyframes rs-stk-fall {
  0%   { transform: translateY(-20px) scale(0.8); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes rs-stk-mesa {
  0%   { transform: scale(0) rotate(-90deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes rs-breathe-mesa {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); filter: drop-shadow(0 0 8px rgba(207, 78, 46, 0.35)); }
}
@media (prefers-reduced-motion: reduce) {
  [data-rs-hero] { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

interface LogoHeroProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function LogoHero({ size = 200, className, style }: LogoHeroProps) {
  return (
    <>
      <style>{keyframes}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="RestoStack"
        role="img"
      >
        <rect width="64" height="64" rx="8" fill={CARBON} />
        {/* Silla norte */}
        <rect
          data-rs-hero="1"
          x="25" y="10" width="14" height="5" rx="1" fill={CHAIR}
          style={{ animation: `rs-stk-fall 0.7s ${ELASTIC} 0s both` }}
        />
        {/* Silla este */}
        <rect
          data-rs-hero="2"
          x="49" y="25" width="5" height="14" rx="1" fill={CHAIR}
          style={{ animation: `rs-stk-fall 0.7s ${ELASTIC} 0.15s both` }}
        />
        {/* Silla sur */}
        <rect
          data-rs-hero="3"
          x="25" y="49" width="14" height="5" rx="1" fill={CHAIR}
          style={{ animation: `rs-stk-fall 0.7s ${ELASTIC} 0.3s both` }}
        />
        {/* Silla oeste */}
        <rect
          data-rs-hero="4"
          x="10" y="25" width="5" height="14" rx="1" fill={CHAIR}
          style={{ animation: `rs-stk-fall 0.7s ${ELASTIC} 0.45s both` }}
        />
        {/* Mesa — entra después con rotación, luego hace breathing */}
        <rect
          data-rs-hero="5"
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA}
          style={{
            transformOrigin: '32px 32px',
            animation: `rs-stk-mesa 0.8s ${ELASTIC} 0.75s both, rs-breathe-mesa 3.2s ease-in-out 1.6s infinite`,
          }}
        />
      </svg>
    </>
  );
}
