/**
 * CuentaHome - Dashboard simplificado de Mi Cuenta
 *
 * Muestra resumen del día con acceso rápido a lo importante.
 */
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useQuery } from '@tanstack/react-query';
import { fetchFullProfile, fetchUserBranchRolesWithPins } from '@/services/profileService';
import { fetchUrgentUnreadCommunications } from '@/services/communicationsService';
import { fetchLastUserOrder, fetchBranchNameAndSlug } from '@/services/webappOrderService';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, ArrowRight, Building2, AlertTriangle, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BranchWorkCard } from '@/components/cuenta/BranchWorkCard';
import { PendingItemsPanel } from '@/components/cuenta/PendingItemsPanel';
import { ProfileCompletenessCard } from '@/components/cuenta/ProfileCompletenessCard';
import { PageHelp } from '@/components/ui/PageHelp';
import { PageHeader } from '@/components/ui/page-header';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';

export default function CuentaHome() {
  const effectiveUser = useEffectiveUser();
  const effectiveUserId = effectiveUser.id;
  const { branchRoles, brandRole, canAccessBrandPanel } = usePermissionsWithImpersonation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check access levels
  const hasBrandAccess = canAccessBrandPanel;
  const hasNoRole = !brandRole && branchRoles.length === 0;

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', effectiveUserId],
    queryFn: () => fetchFullProfile(effectiveUserId!),
    enabled: !!effectiveUserId,
  });

  // Fetch branch roles with PIN status
  const { data: branchPinData } = useQuery({
    queryKey: ['user-branch-roles-pins', effectiveUserId],
    queryFn: () => fetchUserBranchRolesWithPins(effectiveUserId!),
    enabled: !!effectiveUserId,
  });

  // Detect if user only has franquiciado role
  const isOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');

  const helpPageId = isOnlyFranquiciado ? 'cuenta-dashboard-franquiciado' : 'cuenta-dashboard';

  const { data: urgentUnread = [] } = useQuery({
    queryKey: ['urgent-unread', effectiveUserId, branchRoles],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const userLocalRoles = new Set<string>(branchRoles.map((r) => r.local_role).filter(Boolean));
      return fetchUrgentUnreadCommunications(effectiveUserId, userLocalRoles);
    },
    enabled: !!effectiveUserId,
    staleTime: 60000,
  });

  // Fetch last order for client section (uses effectiveUserId for impersonation support)
  const { data: lastOrder } = useQuery({
    queryKey: ['my-last-order', effectiveUserId],
    queryFn: () => fetchLastUserOrder(effectiveUserId!),
    enabled: !!effectiveUserId,
  });

  // Fetch branch name + slug for last order
  const { data: lastOrderBranchData } = useQuery({
    queryKey: ['branch-name-slug', lastOrder?.branch_id],
    queryFn: () => fetchBranchNameAndSlug(lastOrder!.branch_id),
    enabled: !!lastOrder?.branch_id,
  });
  const lastOrderBranch = lastOrderBranchData?.name || '';
  const lastOrderSlug = lastOrderBranchData?.slug;

  const displayName = effectiveUser.full_name || profile?.full_name?.split(' ')[0] || 'Usuario';
  const hasLocalRoles = branchPinData && branchPinData.filter((r: any) => r.local_role).length > 0;

  const isOperationalStaff =
    branchRoles.length > 0 && !branchRoles.every((r) => r.local_role === 'franquiciado');
  const subtitleText = isOperationalStaff ? 'Tu espacio de trabajo' : 'Bienvenido a tu cuenta';

  const estadoLabels: Record<string, string> = {
    pendiente: '⏳ Pendiente',
    confirmado: '✅ Confirmado',
    en_preparacion: '🔥 Preparando',
    listo: '✅ Listo',
    en_camino: '🚀 En camino',
    entregado: '✅ Entregado',
    cancelado: '❌ Cancelado',
    rechazado: '❌ Rechazado',
  };

  return (
    <div className="space-y-6">
      <OnboardingWizard />
      <PageHelp pageId={helpPageId} />

      <PageHeader title={`Hola, ${displayName.split(' ')[0]}! 👋`} subtitle={subtitleText} />

      {/* Urgent Banner */}
      {urgentUnread.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mensaje urgente</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            Tenés {urgentUnread.length} comunicado{urgentUnread.length > 1 ? 's' : ''} urgente
            {urgentUnread.length > 1 ? 's' : ''} sin leer.
            <Link to="/cuenta/comunicados" className="underline font-medium hover:no-underline">
              Ver ahora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Push notifications prompt */}
      <PushNotificationPrompt />

      {/* Pending Items */}
      {effectiveUserId && <PendingItemsPanel userId={effectiveUserId} />}

      {/* Last Order Card - visible for all users with orders */}
      {lastOrder && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold">Tu último pedido</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                #{lastOrder.numero_pedido}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastOrderBranch} · {estadoLabels[lastOrder.estado] || lastOrder.estado}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {(lastOrder.pedido_items || [])
                .slice(0, 2)
                .map((i: any) => `${i.cantidad}x ${i.nombre}`)
                .join(' · ')}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-sm">${lastOrder.total?.toLocaleString('es-AR')}</span>
              <div className="flex gap-2">
                {lastOrder.webapp_tracking_code && lastOrderSlug && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/pedir/${lastOrderSlug}?tracking=${lastOrder.webapp_tracking_code}`)
                    }
                  >
                    Ver detalle
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate('/pedir')}>
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                  Ir a la tienda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mi Marca Access Card */}
      {hasBrandAccess && (
        <Link to="/mimarca">
          <Card className="border-primary/50 bg-primary/5 hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Mi Marca</h3>
                  <p className="text-sm text-muted-foreground">Panel de administración</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Profile completeness */}
      {effectiveUserId && !isOnlyFranquiciado && (
        <ProfileCompletenessCard userId={effectiveUserId} />
      )}

      {/* No Role Message - updated for clients */}
      {hasNoRole && !lastOrder && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">Tu cuenta está activa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hacé tu primer pedido o, si trabajás en Hoppiness, pedile a tu encargado que te asigne
              un rol.
            </p>
            <Button className="mt-4" onClick={() => navigate('/pedir')}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Pedir ahora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Branch Work Cards */}
      {hasLocalRoles && (
        <div className="grid gap-3">
          {branchPinData
            ?.filter((r: any) => r.local_role)
            .map((ubr: any) => (
              <BranchWorkCard
                key={ubr.branch_id}
                branchId={ubr.branch_id}
                branchName={ubr.branches?.name || 'Sucursal'}
                localRole={ubr.local_role || 'empleado'}
                clockPin={ubr.clock_pin}
                roleId={ubr.id}
                userId={effectiveUserId || ''}
              />
            ))}
        </div>
      )}
    </div>
  );
}
