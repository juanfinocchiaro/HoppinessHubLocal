/**
 * CuentaLayout - Panel "Mi Trabajo" (staff) usando WorkShell unificado
 *
 * Clients without roles are redirected to the store.
 * Staff sees "Mi Trabajo" as the panel title.
 */
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { CuentaSidebar } from '@/components/layout/CuentaSidebar';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';

export default function CuentaLayout() {
  const { user, loading: authLoading } = useAuth();
  const effectiveUser = useEffectiveUser();
  const { loading: permLoading } = useRoleLanding();
  const { branchRoles, brandRole } = usePermissionsWithImpersonation();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);

  const isStaff = branchRoles.length > 0 || !!brandRole;
  const isOperationalStaff =
    branchRoles.length > 0 && !branchRoles.every((r) => r.local_role === 'franquiciado');
  const panelTitle = isOperationalStaff ? 'Mi Trabajo' : 'Mi Cuenta';

  const displayName = effectiveUser.full_name?.split(' ')[0] || panelTitle;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/ingresar');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!user) {
    return null;
  }

  if (!isStaff && !isImpersonating) {
    return <Navigate to="/pedir" replace />;
  }

  const footer = canImpersonate ? (
    <Button
      variant={isImpersonating ? 'secondary' : 'ghost'}
      className={`w-full justify-start ${isImpersonating ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
      onClick={() => setShowImpersonationSelector(true)}
    >
      <Eye className="w-4 h-4 mr-3" />
      Ver como...
    </Button>
  ) : undefined;

  return (
    <>
      <WorkShell
        mode="cuenta"
        title={panelTitle}
        mobileTitle={displayName}
        sidebarNav={<CuentaSidebar />}
        footer={footer}
      >
        <Outlet />
      </WorkShell>

      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
        mode="cuenta"
      />
    </>
  );
}
