import { BRAND } from './brand-tokens';
import logoSrc from '@/assets/logo-hoppiness-loader.png';

const SPINNER_SIZES = {
  sm: {
    logo: 24,
    ring: 36,
    ringInset: '-6px',
    text: '10px',
    gap: '8px',
    padding: '8px 14px',
  },
  md: {
    logo: 36,
    ring: 48,
    ringInset: '-6px',
    text: '12px',
    gap: '12px',
    padding: '12px 20px',
  },
  lg: {
    logo: 48,
    ring: 64,
    ringInset: '-8px',
    text: '13px',
    gap: '14px',
    padding: '14px 24px',
  },
} as const;

interface SpinnerLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SpinnerLoader({ text = 'Cargando...', size = 'md' }: SpinnerLoaderProps) {
  const s = SPINNER_SIZES[size] || SPINNER_SIZES.md;
  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: s.gap,
          padding: s.padding,
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,19,155,0.10)',
        }}
      >
        <div
          style={{
            width: `${s.logo}px`,
            height: `${s.logo}px`,
            position: 'relative',
          }}
        >
          <img
            src={logoSrc}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              animation: 'hoppSpinPulse 2s ease-in-out infinite',
            }}
          />
          <svg
            style={{
              position: 'absolute',
              inset: s.ringInset,
              width: `${s.ring}px`,
              height: `${s.ring}px`,
              animation: 'hoppSpinRing 1.2s linear infinite',
            }}
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke={BRAND.azul}
              strokeWidth="2"
              strokeDasharray="40 100"
              strokeLinecap="round"
              opacity="0.25"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke={BRAND.naranja}
              strokeWidth="2"
              strokeDasharray="20 120"
              strokeLinecap="round"
              style={{ animation: 'hoppDashSpin 1.5s ease-in-out infinite' }}
            />
          </svg>
        </div>
        {text && (
          <span
            style={{
              fontFamily: BRAND.font,
              fontSize: s.text,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: BRAND.azul,
            }}
          >
            {text}
          </span>
        )}
      </div>
      <style>{`
        @keyframes hoppSpinPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.92); opacity: 0.8; }
        }
        @keyframes hoppSpinRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hoppDashSpin {
          0% { stroke-dasharray: 1 140; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 60 140; stroke-dashoffset: -20; }
          100% { stroke-dasharray: 1 140; stroke-dashoffset: -120; }
        }
      `}</style>
    </>
  );
}
