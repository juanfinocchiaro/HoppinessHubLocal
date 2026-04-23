'use client';

import React from 'react';
import { Symbol } from './Symbol';

interface LogoLockupProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light-bg' | 'dark-bg';
  className?: string;
}

const sizes = {
  sm: { symbol: 32, wordmark: 22 },
  md: { symbol: 40, wordmark: 28 },
  lg: { symbol: 56, wordmark: 40 },
};

export function LogoLockup({ size = 'md', variant = 'light-bg', className }: LogoLockupProps) {
  const { symbol: symbolSize, wordmark: wordmarkSize } = sizes[size];
  const restoColor = variant === 'dark-bg' ? '#D4CDBF' : '#0C0B09';
  const stackColor = variant === 'dark-bg' ? '#FAF8F4' : '#0C0B09';
  const restoStyle = variant === 'dark-bg' ? { fontStyle: 'italic' as const, fontWeight: 300 } : { fontWeight: 700 };

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`} aria-label="RestoStack">
      <Symbol size={symbolSize} variant={variant === 'dark-bg' ? 'light' : 'dark'} />
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: wordmarkSize,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          fontVariationSettings: '"opsz" 144, "SOFT" 30',
          display: 'inline-block',
        }}
      >
        <span style={{ ...restoStyle, color: restoColor }}>Resto</span>
        <span style={{ fontWeight: 800, color: stackColor }}>Stack</span>
      </span>
    </div>
  );
}
