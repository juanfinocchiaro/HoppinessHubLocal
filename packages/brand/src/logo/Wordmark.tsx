import React from 'react';

export interface WordmarkProps {
  size?: number;
  /** 'dark' = sobre fondo claro (Resto Hueso italic light, Stack Papel/Carbon bold) */
  variant?: 'light-bg' | 'dark-bg';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wordmark "RestoStack" en Fraunces.
 * "Resto" peso 700, "Stack" peso 800 — diferencia semántica, no solo estética.
 * Tracking: −0.035em.
 *
 * Requiere que la fuente Fraunces esté cargada en el documento.
 */
export function Wordmark({ size = 96, variant = 'light-bg', className, style }: WordmarkProps) {
  const restoColor = variant === 'dark-bg' ? '#D4CDBF' : '#0C0B09';
  const stackColor = variant === 'dark-bg' ? '#FAF8F4' : '#0C0B09';

  return (
    <span
      className={className}
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: size,
        letterSpacing: '-0.035em',
        lineHeight: 1,
        fontVariationSettings: '"opsz" 144, "SOFT" 30',
        display: 'inline-block',
        ...style,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color: restoColor,
          fontStyle: variant === 'dark-bg' ? 'italic' : 'normal',
        }}
      >
        Resto
      </span>
      <span
        style={{
          fontWeight: 800,
          color: stackColor,
        }}
      >
        Stack
      </span>
    </span>
  );
}
