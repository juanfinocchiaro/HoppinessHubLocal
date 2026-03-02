/**
 * ManagerDashboard - Vista mobile-first para Encargados
 *
 * Muestra:
 * - Ventas de hoy por turno (nuevo sistema de cierre)
 * - Equipo fichado ahora
 * - Pendientes (solicitudes, comunicados, firmas reglamento)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DollarSign,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  CalendarX,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTodayClosures, useEnabledShifts } from '@/hooks/useShiftClosures';
import { formatOperationalDate, isEarlyMorning } from '@/lib/operationalDate';
import { ShiftClosureModal } from '@/components/local/closure/ShiftClosureModal';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useGenerateZClosing } from '@/hooks/useFiscalReports';
import { CoachingPendingCard } from '@/components/coaching';
import { MeetingPendingCard } from '@/components/meetings/MeetingPendingCard';
import { StockAlertCard } from '@/components/stock/StockAlertCard';
import { DeliveryRadiusControl } from '@/components/local/DeliveryRadiusControl';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/formatters';
import {
  useCurrentlyWorkingTeam,
  usePendingDashboardItems,
  usePosSalesToday,
} from '@/hooks/useManagerDashboardData';

type Branch = Tables<'branches'>;

interface ManagerDashboardProps {
  branch: Branch;
  posEnabled?: boolean;
}

export function ManagerDashboard({ branch, posEnabled = false }: ManagerDashboardProps) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>('mediodía');
  const [showZConfirm, setShowZConfirm] = useState(false);

  // Permisos - verificar rol para vista limitada (con soporte de impersonación)
  const { isEncargado, isSuperadmin, local } = usePermissionsWithImpersonation(branch.id);

  // Z closing generator
  const generateZ = useGenerateZClosing(branch.id);

  // Enabled shifts for this branch
  const { data: enabledShifts, isLoading: loadingShifts } = useEnabledShifts(branch.id);

  // Today's closures
  const { data: todayClosures, isLoading: loadingClosures } = useTodayClosures(branch.id);

  // Currently working team (solo para no-cajeros)
  const { data: workingTeam, isLoading: loadingTeam } = useCurrentlyWorkingTeam(branch.id);

  // Pending items (solo para no-cajeros)
  const { data: pending, isLoading: loadingPending } = usePendingDashboardItems(branch.id);

  const loadedShifts = todayClosures?.map((c) => c.turno) || [];
  const todayTotal = todayClosures?.reduce((sum, c) => sum + Number(c.total_vendido || 0), 0) || 0;

  

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const navigate = useNavigate();

  const handleOpenEntry = (shift?: string) => {
    if (posEnabled) {
      navigate(`/milocal/${branch.id}/ventas/historial`);
      return;
    }
    if (shift) setSelectedShift(shift);
    setShowEntryModal(true);
  };

  // Hook for POS sales when posEnabled
  const { data: posSales, isLoading: loadingPosSales } = usePosSalesToday(branch.id, posEnabled);

  const isLoading = posEnabled ? loadingPosSales : loadingShifts || loadingClosures;

  // Default shifts if none configured
  const shifts = enabledShifts?.length
    ? enabledShifts
    : [
        { value: 'mediodía', label: 'Mediodía' },
        { value: 'noche', label: 'Noche' },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{branch.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatOperationalDate()}
            {isEarlyMorning() && (
              <span className="ml-1 text-xs text-warning">(turno de cierre activo)</span>
            )}
          </p>
        </div>
        {/* Solo mostrar botón Cargar si puede cargar ventas y no está usando POS */}
        {local.canEnterSales && !posEnabled && (
          <Button size="sm" onClick={() => handleOpenEntry()}>
            <Plus className="w-4 h-4 mr-1" />
            Cargar
          </Button>
        )}
      </div>

      {/* VENTAS DE HOY - Card principal con acento de marca */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4" />
            Ventas Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : posEnabled ? (
            /* ── Vista POS: ventas en tiempo real desde pedidos ── */
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-success/5 border-success/40">
                  <span className="text-xs font-medium text-muted-foreground">Total vendido</span>
                  <div className="text-lg font-bold text-success">
                    {formatCurrency(posSales?.totalVendido || 0)}
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs font-medium text-muted-foreground">Pedidos</span>
                  <div className="text-lg font-bold">{posSales?.cantidad || 0}</div>
                </div>
                <div className="p-3 rounded-lg border">
                  <span className="text-xs font-medium text-muted-foreground">Ticket prom.</span>
                  <div className="text-lg font-bold">
                    {formatCurrency(posSales?.ticketPromedio || 0)}
                  </div>
                </div>
              </div>

              <Link to={`/milocal/${branch.id}/ventas/historial`}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver historial de ventas
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </>
          ) : (
            /* ── Vista manual: cierres de turno ── */
            <>
              <div className="grid grid-cols-2 gap-3">
                {shifts.map((shiftDef) => {
                  const closure = todayClosures?.find((c) => c.turno === shiftDef.value);
                  const isLoaded = !!closure;

                  return (
                    <div
                      key={shiftDef.value}
                      className={`p-3 rounded-lg border transition-colors ${
                        isLoaded
                          ? 'border-success/40 bg-success/5'
                          : 'border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50'
                      }`}
                      onClick={() => handleOpenEntry(shiftDef.value)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {shiftDef.label}
                        </span>
                        {isLoaded ? (
                          <CheckCircle className="w-3 h-3 text-success" />
                        ) : (
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div
                        className={`text-lg font-bold ${isLoaded ? 'text-success' : 'text-muted-foreground'}`}
                      >
                        {isLoaded ? formatCurrency(Number(closure.total_vendido || 0)) : '-'}
                      </div>
                      {isLoaded && closure.total_hamburguesas > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {closure.total_hamburguesas} hamburguesas
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-medium">Total del día</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(todayTotal)}</span>
              </div>

              <Link to={`/milocal/${branch.id}/ventas/historial`}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver historial de ventas
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>

              {loadedShifts.length === 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-xs">
                  <AlertCircle className="w-3 h-3 text-warning flex-shrink-0" />
                  <span>Ningún turno cargado</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* BANNER CIERRE Z - cuando todos los turnos están cargados */}
      {!posEnabled &&
        shifts.length > 0 &&
        loadedShifts.length >= shifts.length &&
        (isEncargado || isSuperadmin) && (
          <Card className="border-l-4 border-l-accent bg-accent/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">Todos los turnos cerrados</p>
                  <p className="text-xs text-muted-foreground">Generá el Cierre Z del día fiscal</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setShowZConfirm(true)}
                disabled={generateZ.isPending}
              >
                {generateZ.isPending ? 'Generando...' : 'Generar Cierre Z'}
              </Button>
            </CardContent>
          </Card>
        )}

      {/* EQUIPO AHORA - Visible para todos (cajeros incluidos) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipo Ahora
            </div>
            <Badge variant="secondary" className="text-xs">
              {workingTeam?.length || 0} fichados
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTeam ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : workingTeam && workingTeam.length > 0 ? (
            <div className="space-y-2">
              {workingTeam.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.profile?.full_name || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desde {format(new Date(member.check_in), 'HH:mm')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(member.minutesWorking)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Nadie fichado en este momento
            </p>
          )}

          <Link to={`/milocal/${branch.id}/equipo/fichajes`}>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
              Ver todos los fichajes
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* PENDIENTES - Solo para encargados y superadmins (no franquiciados) */}
      {(isEncargado || isSuperadmin) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pendientes
              </div>
              {(pending?.total ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pending?.total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Link to={`/milocal/${branch.id}/tiempo/solicitudes`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CalendarX className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Solicitudes de día libre</span>
                    </div>
                    <Badge variant={pending?.pendingRequests ? 'destructive' : 'secondary'}>
                      {pending?.pendingRequests || 0}
                    </Badge>
                  </div>
                </Link>

                <Link to={`/milocal/${branch.id}/equipo/comunicados`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Comunicados sin leer</span>
                    </div>
                    <Badge variant={pending?.unreadComms ? 'outline' : 'secondary'}>
                      {pending?.unreadComms || 0}
                    </Badge>
                  </div>
                </Link>

                <Link to={`/milocal/${branch.id}/equipo/reglamentos`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Firmas de reglamento</span>
                    </div>
                    <Badge variant={pending?.pendingSignatures ? 'outline' : 'secondary'}>
                      {pending?.pendingSignatures || 0}
                    </Badge>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* REUNIONES - Solo para encargados y superiores */}
      {(isEncargado || isSuperadmin) && <MeetingPendingCard branchId={branch.id} />}

      {/* STOCK ALERTS */}
      <StockAlertCard branchId={branch.id} />

      {/* DELIVERY RADIUS CONTROL */}
      {local.canOperateDelivery && <DeliveryRadiusControl branchId={branch.id} />}

      {/* COACHING DEL MES - Solo para quienes pueden hacer coaching */}
      {local.canDoCoaching && (
        <CoachingPendingCard
          branchId={branch.id}
          onStartCoaching={() => (window.location.href = `/milocal/${branch.id}/equipo/coaching`)}
        />
      )}

      {/* Shift Closure Modal */}
      <ShiftClosureModal
        open={showEntryModal}
        onOpenChange={setShowEntryModal}
        branchId={branch.id}
        branchName={branch.name}
        defaultShift={selectedShift}
      />

      {/* Z Closure Confirm Dialog */}
      <AlertDialog open={showZConfirm} onOpenChange={setShowZConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cierre Z</AlertDialogTitle>
            <AlertDialogDescription>
              Todos los turnos del día están cargados. ¿Generar el Cierre Z fiscal?
              <br />
              <br />
              <strong>Este cierre es definitivo y no puede modificarse.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                setShowZConfirm(false);
                try {
                  const data = await generateZ.mutateAsync(undefined);
                  toast.success(
                    `Cierre Z N° ${String((data as any).z_number).padStart(4, '0')} generado`,
                  );
                } catch (e: any) {
                  if (e.message?.includes('Ya existe')) {
                    toast.info('El Cierre Z del día ya fue generado');
                  } else {
                    toast.error(e.message || 'Error al generar Cierre Z');
                  }
                }
              }}
            >
              Confirmar Cierre Z
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ManagerDashboard;
