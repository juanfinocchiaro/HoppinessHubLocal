/**
 * BranchLayout - Panel "Mi Local" usando WorkShell unificado
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPosConfig, subscribeToBranchStatusUpdates } from '@/services/configService';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { useIsClockedInAtBranch } from '@/hooks/useIsClockedInAtBranch';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store, Home, AlertCircle, Eye, LogIn } from 'lucide-react';
import type { Tables } from '@/types/database';
import ManagerDashboard from '@/components/local/ManagerDashboard';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { LocalSidebar } from '@/components/layout/LocalSidebar';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';
import { WebappIncomingBanner } from '@/components/local/WebappIncomingBanner';

type Branch = Tables<'branches'>;

export default function BranchLayout() {
  const { user, loading: authLoading } = useAuth();
  const { branchId } = useParams();

  const permissions = usePermissionsWithImpersonation(branchId);
  const { canAccessLocal, canAccessAdmin } = useRoleLanding();
  const { isEmbedded: _isEmbedded } = useEmbedMode();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);

  const { accessibleBranches, loading: permLoading, local: lp } = permissions;
  const { isClockedIn, isLoading: clockLoading } = useIsClockedInAtBranch(branchId ?? undefined);

  const { data: posConfig } = useQuery({
    queryKey: ['pos-config', branchId],
    queryFn: () => fetchPosConfig(branchId!),
    enabled: !!branchId,
  });
  const posEnabled = posConfig?.pos_enabled ?? false;

  // Redirect if not authenticated or no access (skip during impersonation)
  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      if (permissions.isViewingAs) return;
      if (!canAccessLocal) {
        navigate('/cuenta');
        return;
      }
      if (accessibleBranches.length === 0 && !permissions.isSuperadmin) {
        navigate('/cuenta');
        return;
      }
    }
  }, [
    user,
    authLoading,
    permLoading,
    canAccessLocal,
    accessibleBranches,
    permissions.isSuperadmin,
    permissions.isViewingAs,
    navigate,
  ]);

  // Set selected branch from URL or default.
  // During impersonation we also fetch the branch directly so the superadmin
  // can view any branch regardless of the impersonated user's access list.
  useEffect(() => {
    if (branchId && accessibleBranches.length > 0) {
      const branch = accessibleBranches.find((b) => b.id === branchId);
      if (branch) {
        setSelectedBranch(branch);
      } else if (!permissions.isSuperadmin && !permissions.isViewingAs) {
        navigate('/milocal');
      }
    } else if (!branchId && accessibleBranches.length > 0) {
      navigate(`/milocal/${accessibleBranches[0].id}`);
    }
  }, [branchId, accessibleBranches, permissions.isSuperadmin, permissions.isViewingAs, navigate]);

  // Realtime subscription for branch status updates
  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeToBranchStatusUpdates(branchId, (payload) => {
      const updated = payload.new as Branch;
      setSelectedBranch((prev) => (prev ? { ...prev, ...updated } : updated));
    });

    return unsubscribe;
  }, [branchId]);

  // Redirect empleados a Mi Cuenta (skip during impersonation)
  useEffect(() => {
    if (!selectedBranch || !branchId) return;
    if (permissions.isViewingAs) return;

    if (permissions.isEmpleado) {
      navigate('/cuenta');
    }
  }, [selectedBranch, branchId, permissions.isEmpleado, permissions.isViewingAs, navigate]);

  const handleBranchChange = (newBranchId: string) => {
    const pathParts = location.pathname.split('/');
    const subPath = pathParts.slice(3).join('/');

    if (subPath) {
      navigate(`/milocal/${newBranchId}/${subPath}`);
    } else {
      navigate(`/milocal/${newBranchId}`);
    }
  };

  if (authLoading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Cajero: solo puede ver el panel Local si está fichado en este branch
  // Skip during impersonation â€” the real user is a superadmin
  if (
    !permissions.isViewingAs &&
    canAccessLocal &&
    branchId &&
    selectedBranch &&
    permissions.isCajero &&
    !clockLoading &&
    !isClockedIn
  ) {
    const fichajePath = selectedBranch.clock_code ? `/fichaje/${selectedBranch.clock_code}` : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <LogIn className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-bold">Debés fichar para acceder al Panel Local</h1>
          <p className="text-muted-foreground">
            Para usar el panel de tu local tenés que registrar tu entrada. Escaneá el QR del local o
            usá el link de fichaje.
          </p>
          {fichajePath ? (
            <Button asChild>
              <Link to={fichajePath}>Ir a fichar</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Contactá a tu encargado para obtener el link de fichaje.
            </p>
          )}
          <Button variant="ghost" asChild>
            <Link to="/cuenta">Volver a Mi Cuenta</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!canAccessLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Local</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canAccessAdmin && (
            <Link to="/mimarca">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Ir a Mi Marca
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Branch selection screen
  if (!branchId) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Panel Mi Local</h1>
            <p className="text-muted-foreground">Seleccioná tu sucursal para comenzar</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleBranches.map((branch) => (
              <div
                key={branch.id}
                className="bg-card border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/milocal/${branch.id}`)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">{branch.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {branch.address}, {branch.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedBranch) {
      if (branchId && (permLoading || accessibleBranches.length === 0)) {
        return (
          <div className="flex items-center justify-center py-24">
            <HoppinessLoader />
          </div>
        );
      }
      return null;
    }

    const isDashboard = location.pathname === `/milocal/${branchId}`;
    if (isDashboard) {
      return <ManagerDashboard branch={selectedBranch} posEnabled={posEnabled} />;
    }

    return <Outlet context={{ branch: selectedBranch, permissions: lp }} />;
  };

  const branchSelectorBlock =
    selectedBranch && accessibleBranches.length > 0 ? (
      <div>
        {accessibleBranches.length > 1 ? (
          <Select value={branchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-primary shrink-0" />
                <SelectValue placeholder="Seleccionar local" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {accessibleBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm font-medium text-foreground">
            <Store className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{selectedBranch.name}</span>
          </div>
        )}
      </div>
    ) : null;

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

  const sidebarNav = branchId ? (
    <LocalSidebar
      branchId={branchId}
      posEnabled={posEnabled}
      permissions={{
        canViewDashboard: lp.canViewDashboard,
        canViewTeam: lp.canViewTeam,
        canEditSchedules: lp.canEditSchedules,
        canViewAllClockIns: lp.canViewAllClockIns,
        canDoCoaching: lp.canDoCoaching,
        canViewCoaching: lp.canViewCoaching,
        canConfigPrinters: lp.canConfigPrinters,
        canViewWarnings: lp.canViewWarnings,
        canViewPurchaseHistory: lp.canViewPurchaseHistory,
        canViewSuppliers: lp.canViewSuppliers,
        canUploadInvoice: lp.canUploadInvoice,
        canViewLocalPnL: lp.canViewLocalPnL,
        canViewSalaryAdvances: lp.canViewSalaryAdvances,
        canViewPayroll: lp.canViewPayroll,
        canViewGastos: lp.canViewGastos,
        canViewConsumos: lp.canViewConsumos,
        canViewPeriodos: lp.canViewPeriodos,
        canViewVentasMensualesLocal: lp.canViewVentasMensualesLocal,
        canViewSocios: lp.canViewSocios,
        canViewLocalCommunications: lp.canViewLocalCommunications,
        canViewClosures: lp.canViewClosures,
        canCloseShifts: lp.canCloseShifts,
        canViewStock: lp.canViewStock,
        isFranquiciado: permissions.isFranquiciado,
        isContadorLocal: permissions.isContadorLocal,
      }}
    />
  ) : (
    <></>
  );

  return (
    <WorkShell
      mode="local"
      title="Mi Local"
      mobileTitle={selectedBranch?.name || 'Mi Local'}
      sidebarContext={branchSelectorBlock}
      sidebarNav={sidebarNav}
      footer={footer}
    >
      {renderContent()}

      {/* Banner global de pedidos webapp pendientes */}
      {branchId && <WebappIncomingBanner branchId={branchId} posEnabled={posEnabled} />}

      {/* Impersonation Selector Modal */}
      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
        mode="local"
        branchId={branchId}
        branchName={selectedBranch?.name}
      />
    </WorkShell>
  );
}
