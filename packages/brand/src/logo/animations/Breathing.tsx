/**
 * Animation 03 — Breathing (Idle)
 * Loop infinito con pulso sutil de la mesa y leve fade de las sillas.
 * Uso: hero section en reposo, turno activo, estado idle del dashboard.
 * Duración: 3.2s · ∞ loop
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-breathe-mesa {
  0%, 100% { transform: scale(1); filter: none; }
  50%       { transform: scale(1.08); filter: drop-shadow(0 0 6px rgba(207, 78, 46, 0.4)); }
}
@keyframes rs-breathe-chairs {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.75; }
}
@media (prefers-reduced-motion: reduce) {
  .rs-breathe-mesa, .rs-breathe-chair { animation: none !important; }
}
`;

export function LogoBreathing({ size = 96, className, style }: AnimatedLogoProps) {
  const dur = '3.2s ease-in-out infinite';
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
        aria-label="RestoStack"
      >
        <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
        <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR} style={{ animation: `rs-breathe-chairs ${dur}` }} />
        <rect x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR} style={{ animation: `rs-breathe-chairs ${dur}` }} />
        <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} style={{ animation: `rs-breathe-chairs ${dur}` }} />
        <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} style={{ animation: `rs-breathe-chairs ${dur}` }} />
        <rect
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
          style={{ transformOrigin: '32px 32px', animation: `rs-breathe-mesa ${dur}` }}
        />
      </svg>
    </>
  );
}
