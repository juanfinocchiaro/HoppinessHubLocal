/**
 * Animation 01 — Assembly
 * Las sillas entran desde fuera de frame, la mesa aparece al centro con leve rebote.
 * Uso: splash screen de la app y aperturas de video.
 * Duración: 1.8s · one-shot
 */
import React from 'react';
import { CHAIR_COLOR, BRASA_COLOR, CONTAINER_COLOR, type AnimatedLogoProps } from './shared.js';

const styles = `
@keyframes rs-asm-top    { 0% { transform: translateY(-40px); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes rs-asm-bottom { 0% { transform: translateY(40px);  opacity: 0; } 60% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes rs-asm-left   { 0% { transform: translateX(-40px); opacity: 0; } 60% { opacity: 1; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes rs-asm-right  { 0% { transform: translateX(40px);  opacity: 0; } 60% { opacity: 1; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes rs-asm-mesa   { 0%, 50% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .rs-asm-top, .rs-asm-bottom, .rs-asm-left, .rs-asm-right, .rs-asm-mesa { animation: none !important; }
}
`;

export function LogoAssembly({ size = 96, className, style, replayKey }: AnimatedLogoProps) {
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const easeElastic = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const dur = '1.8s';

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
          x="25" y="10" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ transformOrigin: '32px 12.5px', animation: `rs-asm-top ${dur} ${ease} forwards` }}
        />
        <rect
          x="25" y="49" width="14" height="5" rx="1" fill={CHAIR_COLOR}
          style={{ transformOrigin: '32px 51.5px', animation: `rs-asm-bottom ${dur} ${ease} forwards` }}
        />
        <rect
          x="10" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ transformOrigin: '12.5px 32px', animation: `rs-asm-left ${dur} ${ease} forwards` }}
        />
        <rect
          x="49" y="25" width="5" height="14" rx="1" fill={CHAIR_COLOR}
          style={{ transformOrigin: '51.5px 32px', animation: `rs-asm-right ${dur} ${ease} forwards` }}
        />
        <rect
          x="22" y="22" width="20" height="20" rx="2" fill={BRASA_COLOR}
          style={{ transformOrigin: '32px 32px', animation: `rs-asm-mesa 1.8s ${easeElastic} forwards` }}
        />
      </svg>
    </>
  );
}
