/**
 * RequireBranchAccess - Guard que valida acceso a una sucursal específica
 *
 * During impersonation the REAL user's permissions are used for the access
 * decision so the superadmin is never blocked from viewing a branch.
 */
import { ReactNode } from 'react';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { NoAccessState } from '@/components/ui/states/no-access-state';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireBranchAccessProps {
  branchId: string;
  children: ReactNode;
  fallbackPath?: string;
}

export function RequireBranchAccess({
  branchId,
  children,
  fallbackPath = '/cuenta',
}: RequireBranchAccessProps) {
  const {
    loading,
    hasAccessToBranch,
    isSuperadmin,
    canAccessLocalPanel,
    isViewingAs,
    realUserPermissions,
  } = usePermissionsWithImpersonation(branchId);

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // During impersonation the real user is a superadmin — always allow
  if (isViewingAs && realUserPermissions?.isSuperadmin) {
    return <>{children}</>;
  }

  if (isSuperadmin) {
    return <>{children}</>;
  }

  const hasAccess = hasAccessToBranch(branchId);

  if (!hasAccess) {
    return (
      <NoAccessState
        title="Sin acceso a esta sucursal"
        description={
          canAccessLocalPanel
            ? 'No tenés permisos para acceder a esta sucursal. Verificá con tu encargado.'
            : 'No tenés permisos para acceder al panel de sucursales.'
        }
        backPath={fallbackPath}
      />
    );
  }

  return <>{children}</>;
}

export default RequireBranchAccess;
