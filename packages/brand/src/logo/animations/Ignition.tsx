/**
 * Animation 02 — Ignition (Boot)
 * La mesa se enciende como un fogón: arranca oscura, pasa por Ascua con glow,
 * baja a Ember y se asienta en Brasa.
 * Uso: boot de la app, apertura de turno.
 * Duración: 1.2s · one-shot
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-boot-mesa {
  0%   { transform: scale(0.2); fill: #2A2623; }
  40%  { transform: scale(1.15); fill: #E67855; filter: drop-shadow(0 0 12px rgba(230, 120, 85, 0.8)); }
  70%  { transform: scale(0.95); fill: #B33F20; filter: drop-shadow(0 0 4px rgba(207, 78, 46, 0.4)); }
  100% { transform: scale(1); fill: #CF4E2E; filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .rs-boot-mesa { animation: none !important; }
}
`;

export function LogoIgnition({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
  return (
    <>
      <style>{styles}</style>
      <svg
        key={replayKey}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        role="img"
        aria-label="RestoStack"
      >
        <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
        <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
        <rect x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
        <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
        <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
        <rect
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
          style={{
            transformOrigin: '32px 32px',
            animation: 'rs-boot-mesa 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
        />
      </svg>
    </>
  );
}
