// RestoStack Design Tokens — extraídos del brand manual v1.0
// Fuente autoritativa: restostack-brand-manual.html

export const colors = {
  // Escala neutral (de oscuro a claro)
  carbon: '#0C0B09',
  grafito: '#161412',
  humo: '#2A2623',
  ceniza: '#5A5450',
  piedra: '#8A827C',
  hueso: '#D4CDBF',
  crema: '#F2EDE4',
  papel: '#FAF8F4',

  // Acento — Brasa y variantes de estado
  brasa: '#CF4E2E',
  ember: '#B33F20',   // pressed / hover fuerte
  ascua: '#E67855',   // highlights / focus

  // Semánticos de sistema
  ok: '#4A7C59',
  alerta: '#D4A647',
  error: '#B33F20',
} as const;

export const fontFamily = {
  serif: ['Fraunces', 'Georgia', 'serif'],
  sans: ['DM Sans', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'monospace'],
} as const;

// Variable font axes para Fraunces
export const frauncesFontVariation = {
  display: '"opsz" 144, "SOFT" 50',
  heading: '"opsz" 144, "SOFT" 30',
  body: '"opsz" 9, "SOFT" 0',
} as const;

// Escala tipográfica
export const typeScale = {
  displayXL: { size: '72px', lineHeight: '68px', weight: 800, letterSpacing: '-0.035em', family: 'serif' },
  h1: { size: '40px', lineHeight: '44px', weight: 700, letterSpacing: '-0.025em', family: 'serif' },
  h2: { size: '28px', lineHeight: '32px', weight: 700, letterSpacing: '-0.02em', family: 'serif' },
  h3: { size: '22px', lineHeight: '28px', weight: 600, letterSpacing: '-0.015em', family: 'sans' },
  bodyL: { size: '18px', lineHeight: '28px', weight: 400, family: 'sans' },
  body: { size: '15px', lineHeight: '24px', weight: 400, family: 'sans' },
  kicker: { size: '11px', lineHeight: '16px', weight: 500, letterSpacing: '0.22em', family: 'sans', textTransform: 'uppercase' },
  mono: { size: '13px', lineHeight: '20px', weight: 400, family: 'mono' },
} as const;

// Espaciado — grid 8px base
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  '2xl': '64px',
  '3xl': '96px',
  section: '140px',
} as const;

// Radios de borde
export const borderRadius = {
  sm: '2px',
  md: '4px',
  lg: '8px',
  full: '999px',
} as const;

// Dots pattern del brand manual (para fondos Carbón)
export const dotsPattern = {
  dark: 'radial-gradient(circle at 1px 1px, rgba(242, 237, 228, 0.04) 1px, transparent 0)',
  light: 'radial-gradient(circle at 1px 1px, rgba(138, 130, 124, 0.15) 1px, transparent 0)',
  size: '24px 24px',
} as const;

// Sombras
export const shadows = {
  symbolCard: '0 40px 80px -20px rgba(207, 78, 46, 0.15)',
  cardHover: '0 24px 48px -24px rgba(12, 11, 9, 0.12)',
} as const;

// Easing curves del sistema de animaciones
export const easing = {
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  sharp: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

// Duraciones canónicas por tipo de animación
export const duration = {
  fast: 150,     // micro-feedback, hover transitions
  normal: 300,   // UI state changes
  medium: 600,   // hero on-load fade
  slow: 800,     // scroll reveals
  assembly: 1800,
  ignition: 1200,
  breathing: 3200,
  orbit: 2800,
  sequential: 1600,
  pop: 700,
  flip: 1000,
  orderIn: 1400,
  stackBuild: 2300,
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
