import React from 'react';

export type SymbolVariant = 'dark' | 'light' | 'bare';

export interface SymbolProps {
  size?: number;
  variant?: SymbolVariant;
  className?: string;
  style?: React.CSSProperties;
  /** Overrides fill del contenedor (fondo del ícono) */
  containerFill?: string;
  /** Overrides fill de las sillas */
  chairFill?: string;
  /** Overrides fill de la mesa (acento) */
  mesaFill?: string;
}

/**
 * Símbolo canónico de RestoStack.
 * Una mesa vista desde arriba (top-down): 4 sillas (Hueso) + mesa central (Brasa).
 * Construcción geométrica en grilla 64×64, simétrica en los cuatro ejes.
 *
 * Usos correctos según brand manual:
 *  - variant="dark"  → contenedor Carbón, sillas Hueso, mesa Brasa. Sobre fondos claros.
 *  - variant="light" → sin contenedor (transparent), sillas Hueso, mesa Brasa. Sobre Carbón.
 *  - variant="bare"  → sin contenedor, sin fill predeterminado; controlá con props.
 */
export function Symbol({
  size = 64,
  variant = 'dark',
  className,
  style,
  containerFill,
  chairFill,
  mesaFill,
}: SymbolProps) {
  const containerColor =
    containerFill ??
    (variant === 'dark' ? '#0C0B09' : 'transparent');

  const chairColor = chairFill ?? '#D4CDBF';  // hueso
  const mesaColor = mesaFill ?? '#CF4E2E';    // brasa

  const rx = size >= 40 ? Math.round((size / 64) * 8) : Math.round((size / 64) * 8);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="RestoStack"
      role="img"
    >
      {variant !== 'bare' && containerColor !== 'transparent' && (
        <rect width="64" height="64" rx={rx} fill={containerColor} />
      )}
      {/* Silla norte */}
      <rect x="25" y="10" width="14" height="5" rx="1" fill={chairColor} />
      {/* Silla sur */}
      <rect x="25" y="49" width="14" height="5" rx="1" fill={chairColor} />
      {/* Silla oeste */}
      <rect x="10" y="25" width="5" height="14" rx="1" fill={chairColor} />
      {/* Silla este */}
      <rect x="49" y="25" width="5" height="14" rx="1" fill={chairColor} />
      {/* Mesa central */}
      <rect x="22" y="22" width="20" height="20" rx="2" fill={mesaColor} />
    </svg>
  );
}
