/**
 * Animation 04 — Orbit (Loader)
 * Las cuatro sillas orbitan alrededor de la mesa fija.
 * Uso: loader genérico para operaciones asíncronas > 400ms.
 * Duración: 2.8s · ∞ loop
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-orbit-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .rs-orbit-group { animation: none !important; }
}
`;

export function LogoOrbit({ size = 96, className, style }: AnimatedLogoProps) {
  return (
    <>
      <style>{styles}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        role="img"
        aria-label="RestoStack cargando"
      >
        <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
        <g style={{ transformOrigin: '32px 32px', animation: 'rs-orbit-spin 2.8s linear infinite' }}>
          <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
          <rect x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
          <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
          <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
        </g>
        <rect x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR} />
      </svg>
    </>
  );
}
