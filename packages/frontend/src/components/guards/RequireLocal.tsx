import { Navigate } from 'react-router-dom';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { RequireAuth } from './RequireAuth';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireLocalProps {
  children: React.ReactNode;
}

export function RequireLocal({ children }: RequireLocalProps) {
  const { avatarInfo, loading, canAccessLocal } = useRoleLanding();

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Verificar si el usuario puede acceder al panel local
  if (!canAccessLocal) {
    // Redirigir a su landing ideal
    return <Navigate to={avatarInfo.landingPath} replace />;
  }

  return <>{children}</>;
}

export function LocalRoute({ children }: RequireLocalProps) {
  return (
    <RequireAuth>
      <RequireLocal>{children}</RequireLocal>
    </RequireAuth>
  );
}
