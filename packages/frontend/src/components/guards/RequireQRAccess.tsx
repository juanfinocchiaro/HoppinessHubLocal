/**
 * RequireQRAccess - Guard para el QR de fichaje
 * Solo permite acceso a superadmin, franquiciado y encargado.
 * During impersonation, uses the REAL user's permissions for access decisions.
 */
import { Navigate, useParams } from 'react-router-dom';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireQRAccessProps {
  children: React.ReactNode;
}

export function RequireQRAccess({ children }: RequireQRAccessProps) {
  const { branchId } = useParams();
  const {
    loading,
    isSuperadmin,
    isFranquiciado,
    isEncargado,
    hasAccessToBranch,
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

  const canViewQR = isSuperadmin || isFranquiciado || isEncargado;

  if (!canViewQR) {
    return <Navigate to="/cuenta" replace />;
  }

  if (!isSuperadmin && branchId && !hasAccessToBranch(branchId)) {
    return <Navigate to="/cuenta" replace />;
  }

  return <>{children}</>;
}
