import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!user) {
    return <Navigate to="/ingresar" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
