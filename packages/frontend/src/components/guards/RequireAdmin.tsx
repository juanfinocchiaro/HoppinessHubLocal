import { Navigate } from 'react-router-dom';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { RequireAuth } from './RequireAuth';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { avatarInfo, loading, canAccessAdmin } = useRoleLanding();

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Verificar si el usuario puede acceder al panel de admin
  if (!canAccessAdmin) {
    // Redirigir a su landing ideal
    return <Navigate to={avatarInfo.landingPath} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: RequireAdminProps) {
  return (
    <RequireAuth>
      <RequireAdmin>{children}</RequireAdmin>
    </RequireAuth>
  );
}
