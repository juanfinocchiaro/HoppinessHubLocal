/**
 * UserFingerprint - Badge visual sutil que identifica al usuario en todas las pantallas
 *
 * Muestra las iniciales + hash corto del UUID para identificar capturas de pantalla.
 * Ejemplo: "DL #a4f2" donde DL = Dalma Ledesma, a4f2 = primeros 4 chars del UUID
 *
 * Características:
 * - No interfiere con clics (pointer-events-none)
 * - No seleccionable
 * - Color ámbar cuando está impersonando
 */
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export function UserFingerprint() {
  const { id, full_name, isImpersonated } = useEffectiveUser();

  if (!id) return null;

  // Generar iniciales (máximo 2 caracteres)
  const initials =
    full_name
      ?.split(' ')
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '??';

  // Hash corto del UUID (primeros 4 caracteres)
  const shortHash = id.substring(0, 4);

  return (
    <div
      className="px-2 py-1 rounded-full text-xs
                 bg-muted/80 backdrop-blur-sm border
                 text-muted-foreground
                 select-none
                 print:hidden"
    >
      <span className={isImpersonated ? 'text-amber-600 font-medium' : ''}>{initials}</span>
      <span className="opacity-50 ml-1">#{shortHash}</span>
    </div>
  );
}

export default UserFingerprint;
