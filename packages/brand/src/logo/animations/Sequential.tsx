/**
 * Animation 05 — Sequential (Loader direccional)
 * Cada silla se enciende en Brasa en secuencia horaria (norte → este → sur → oeste).
 * Uso: procesos con pasos conocidos — enviar factura, cerrar caja.
 * Duración: 1.6s · ∞ loop
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-seq-pulse {
  0%, 75%, 100% { fill: #D4CDBF; }
  25%, 50%      { fill: #CF4E2E; }
}
@media (prefers-reduced-motion: reduce) {
  [class^="rs-seq-"] { animation: none !important; }
}
`;

export function LogoSequential({ size = 96, className, style }: AnimatedLogoProps) {
  const base = 'rs-seq-pulse 1.6s ease-in-out infinite';
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
        aria-label="RestoStack procesando"
      >
        <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
        {/* norte */}
        <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `${base} 0s` }} />
        {/* este */}
        <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `${base} 0.4s` }} />
        {/* sur */}
        <rect x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `${base} 0.8s` }} />
        {/* oeste */}
        <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `${base} 1.2s` }} />
        <rect x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR} />
      </svg>
    </>
  );
}
