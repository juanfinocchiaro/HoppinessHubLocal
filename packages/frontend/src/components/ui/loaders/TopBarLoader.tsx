import { BRAND } from './brand-tokens';

export function TopBarLoader() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 40,
          overflow: 'hidden',
          pointerEvents: 'none',
          background: 'rgba(0,19,155,0.08)',
        }}
      >
        <div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${BRAND.azul}, ${BRAND.naranja}, ${BRAND.amarillo}, ${BRAND.azul})`,
            backgroundSize: '300% 100%',
            animation: 'hoppTopBarSlide 1.8s ease-in-out infinite',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
      <style>{`
        @keyframes hoppTopBarSlide {
          0% { transform: translateX(-100%); background-position: 0% 0; }
          50% { transform: translateX(0%); background-position: 100% 0; }
          100% { transform: translateX(100%); background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}
