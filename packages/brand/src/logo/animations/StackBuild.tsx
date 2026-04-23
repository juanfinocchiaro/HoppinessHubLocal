/**
 * Animation 09 — Stack Build (Hero intro)
 * Las sillas caen una por una con stagger (150ms), la mesa entra con rotación.
 * La animación más narrativa del sistema — para landing hero, onboarding.
 * Duración: 2.3s · stagger 150ms · one-shot
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-stk-fall {
  0%   { transform: translateY(-20px) scale(0.8); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes rs-stk-mesa {
  0%   { transform: scale(0) rotate(-90deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  [data-rs-stk] { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

const elastic = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function LogoStackBuild({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
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
        <rect
          data-rs-stk="1"
          x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `rs-stk-fall 0.7s ${elastic} 0s both` }}
        />
        <rect
          data-rs-stk="2"
          x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `rs-stk-fall 0.7s ${elastic} 0.15s both` }}
        />
        <rect
          data-rs-stk="3"
          x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `rs-stk-fall 0.7s ${elastic} 0.3s both` }}
        />
        <rect
          data-rs-stk="4"
          x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ animation: `rs-stk-fall 0.7s ${elastic} 0.45s both` }}
        />
        <rect
          data-rs-stk="5"
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
          style={{ transformOrigin: '32px 32px', animation: `rs-stk-mesa 0.8s ${elastic} 0.75s both` }}
        />
      </svg>
    </>
  );
}
