/**
 * Animation 08 — Order In (Notification)
 * La silla frontal (sur) parpadea en Ascua dos veces mientras la mesa pulsa.
 * Uso: pedido entrante, reserva nueva, alerta de stock bajo.
 * Duración: 1.4s · on-event
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-order-chair {
  0%, 100%  { fill: #D4CDBF; transform: scale(1); }
  20%, 60%  { fill: #E67855; transform: scale(1.15); }
  40%, 80%  { fill: #D4CDBF; transform: scale(1); }
}
@keyframes rs-order-mesa {
  0%, 100%  { transform: scale(1); filter: none; }
  20%, 60%  { transform: scale(1.06); filter: drop-shadow(0 0 8px rgba(230, 120, 85, 0.5)); }
  40%, 80%  { transform: scale(1); filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .rs-order-chair-anim, .rs-order-mesa-anim { animation: none !important; }
}
`;

export function LogoOrderIn({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
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
        aria-label="RestoStack nueva notificación"
      >
        <rect width="64" height="64" rx="8" fill={CONTAINER_COLOR} />
        <rect x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR} />
        {/* silla sur — la que parpadea */}
        <rect
          x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ transformOrigin: '32px 51.5px', animation: 'rs-order-chair 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
        />
        <rect x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
        <rect x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR} />
        <rect
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
          style={{ transformOrigin: '32px 32px', animation: 'rs-order-mesa 1.4s ease-in-out forwards' }}
        />
      </svg>
    </>
  );
}
