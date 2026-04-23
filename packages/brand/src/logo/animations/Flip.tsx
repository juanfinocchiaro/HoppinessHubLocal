/**
 * Animation 07 — Flip (Success / Confirmation)
 * La mesa gira 360° en el eje Y, pasa momentáneamente a verde (ok) y vuelve a Brasa.
 * Uso: pago aprobado, factura emitida, turno cerrado con caja cuadrada.
 * Duración: 1.0s · one-shot
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-flip-mesa {
  0%   { transform: rotateY(0deg) scale(1); fill: #CF4E2E; }
  50%  { transform: rotateY(180deg) scale(1.2); fill: #4A7C59; }
  100% { transform: rotateY(360deg) scale(1); fill: #CF4E2E; }
}
@media (prefers-reduced-motion: reduce) {
  .rs-flip-mesa { animation: none !important; }
}
`;

export function LogoFlip({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
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
        aria-label="RestoStack confirmado"
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
            transformBox: 'fill-box',
            animation: 'rs-flip-mesa 1s cubic-bezier(0.65, 0, 0.35, 1) forwards',
          }}
        />
      </svg>
    </>
  );
}
