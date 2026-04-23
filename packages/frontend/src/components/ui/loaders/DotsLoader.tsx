import { BRAND } from './brand-tokens';

export function DotsLoader() {
  const colors = [BRAND.azul, BRAND.naranja, BRAND.amarillo];
  return (
    <>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 4px',
        }}
      >
        {colors.map((color, i) => (
          <span
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
              animation: `hoppDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes hoppDotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
