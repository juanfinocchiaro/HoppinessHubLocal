/**
 * Animation 06 — Pop (Feedback)
 * Scale con rebote elástico, la mesa pulsa de Ember a Ascua y vuelve a Brasa.
 * Uso: botón presionado, item agregado al pedido.
 * Duración: 0.7s · one-shot
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-pop-scale {
  0%   { transform: scale(0.9); }
  40%  { transform: scale(1.15); }
  70%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}
@keyframes rs-pop-mesa {
  0%   { transform: scale(0.7); fill: #B33F20; }
  50%  { transform: scale(1.2); fill: #E67855; }
  100% { transform: scale(1); fill: #CF4E2E; }
}
@media (prefers-reduced-motion: reduce) {
  .rs-pop-inner, .rs-pop-mesa { animation: none !important; }
}
`;

export function LogoPop({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
  const elastic = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
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
        <g style={{ transformOrigin: '32px 32px', animation: `rs-pop-scale 0.7s ${elastic} forwards` }}>
          <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
          <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
          <rect x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
          <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
          <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
          <rect
            x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
            style={{ transformOrigin: '32px 32px', animation: `rs-pop-mesa 0.7s ${elastic} forwards` }}
          />
        </g>
      </svg>
    </>
  );
}
