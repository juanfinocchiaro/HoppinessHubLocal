/**
 * RequireBrandPermission - Guard que verifica permisos específicos en Mi Marca
 *
 * Usa useDynamicPermissions para verificar si el usuario tiene el permiso requerido.
 * Muestra NoAccessState si no tiene acceso.
 */
import { ReactNode } from 'react';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { NoAccessState } from '@/components/ui/states/no-access-state';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

type BrandPermissionKey = keyof ReturnType<typeof useDynamicPermissions>['brand'];

interface RequireBrandPermissionProps {
  /** Clave del permiso requerido (ej: 'canManageMessages') */
  permission: BrandPermissionKey;
  children: ReactNode;
  /** Mensaje personalizado cuando no tiene acceso */
  noAccessMessage?: string;
  /** Ruta de fallback (default: /mimarca) */
  fallbackPath?: string;
}

export function RequireBrandPermission({
  permission,
  children,
  noAccessMessage = 'No tenés permisos para acceder a esta sección.',
  fallbackPath = '/mimarca',
}: RequireBrandPermissionProps) {
  const { loading, brand, isSuperadmin, canAccessBrandPanel } = useDynamicPermissions();

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Primero verificar acceso al panel de marca
  if (!canAccessBrandPanel) {
    return (
      <NoAccessState
        title="Sin acceso al panel de marca"
        description="No tenés un rol de marca asignado."
        backPath="/cuenta"
      />
    );
  }

  // Superadmin siempre tiene acceso
  if (isSuperadmin) {
    return <>{children}</>;
  }

  // Verificar el permiso específico (defensivo por si brand o la clave no existen)
  const hasPermission = brand?.[permission] === true;

  if (!hasPermission) {
    return (
      <NoAccessState
        title="Acceso restringido"
        description={noAccessMessage}
        backPath={fallbackPath}
      />
    );
  }

  return <>{children}</>;
}

export default RequireBrandPermission;
