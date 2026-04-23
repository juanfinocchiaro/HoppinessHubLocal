import React from 'react';

export interface AnimatedLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Para animaciones one-shot: key que cambia fuerza replay */
  replayKey?: number | string;
}

export const CHAIR_COLOR = '#D4CDBF';   // hueso
export const BRASA_COLOR = '#CF4E2E';   // brasa
export const EMBER_COLOR = '#B33F20';   // ember
export const ASCUA_COLOR = '#E67855';   // ascua
export const HUMO_COLOR = '#2A2623';    // humo
export const OK_COLOR = '#4A7C59';      // ok
export const CONTAINER_COLOR = '#0C0B09'; // carbon

/** SVG base con rects estáticos; las animaciones los extienden */
export function BaseLogo({ size = 96, children }: { size?: number; children?: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}
