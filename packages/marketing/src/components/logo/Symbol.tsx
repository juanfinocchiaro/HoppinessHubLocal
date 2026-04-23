'use client';

import React from 'react';

export type SymbolVariant = 'dark' | 'light';

interface SymbolProps {
  size?: number;
  variant?: SymbolVariant;
  className?: string;
  style?: React.CSSProperties;
}

export function Symbol({ size = 40, variant = 'dark', className, style }: SymbolProps) {
  const containerFill = variant === 'dark' ? '#0C0B09' : 'transparent';
  const chairFill = '#D4CDBF';
  const mesaFill = '#CF4E2E';
  const rx = 8;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {variant === 'dark' && <rect width="64" height="64" rx={rx} fill={containerFill} />}
      <rect x="25" y="10" width="14" height="5" rx="1" fill={chairFill} />
      <rect x="25" y="49" width="14" height="5" rx="1" fill={chairFill} />
      <rect x="10" y="25" width="5" height="14" rx="1" fill={chairFill} />
      <rect x="49" y="25" width="5" height="14" rx="1" fill={chairFill} />
      <rect x="22" y="22" width="20" height="20" rx="2" fill={mesaFill} />
    </svg>
  );
}
