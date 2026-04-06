import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Pencil,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentlyWorkingTeam } from '@/hooks/useManagerDashboardData';
import { useFichajeDetalle } from '@/hooks/useFichajeDetalle';
import { useClockEntries, useDaySchedules } from '@/hooks/useClockEntries';
import { fetchEmployeeScheduleForBranch } from '@/services/schedulesService';
import { createManualClockEntry } from '@/services/hrService';
import { useLaborHours } from '@/hooks/useLaborHours';
import { calculateShiftHours } from '@/lib/timeEngine';
import { usePayrollReport } from '@/hooks/usePayrollReport';
import {
  useEmployeeConsumptionsByMonth,
  useSalaryAdvancesByMonth,
  aggregateByUser,
} from '@/hooks/useEmployeeConsumptions';
import { formatDuration } from '@/components/local/clockins/helpers';

type PanelSection = 'hoy' | 'mes' | 'horarios' | 'liquidacion';

interface EmployeeSummaryPanelProps {
  userId: string;
  userName: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: PanelSection;
  selectedDate?: Date;
  canEdit?: boolean;
}

export function EmployeeSummaryPanel({
  userId,
  userName,
  branchId,
  open,
  onOpenChange,
  initialSection = 'hoy',
  selectedDate,
  canEdit = true,
}: EmployeeSummaryPanelProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const todayDate = selectedDate ?? now;

  const [expanded, setExpanded] = useState<Set<PanelSection>>(() => {
    const initial = new Set<PanelSection>();
    initial.add(initialSection);
    if (initialSection !== 'hoy') initial.add('hoy');
    return initial;
  });

  const toggle = (section: PanelSection) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── Data: currently working ──
  const { data: workingTeam } = useCurrentlyWorkingTeam(branchId);
  const workingEntry = workingTeam?.find((m) => m.user_id === userId);
  const isWorking = !!workingEntry;
  const workingMin = workingEntry?.minutesWorking ?? 0;

  // ── Data: today's clock entries ──
  const { data: todayEntries = [] } = useClockEntries(branchId, todayDate, 'panel', open ? 30000 : undefined);
  const { data: todaySchedules = new Map() } = useDaySchedules(branchId, todayDate);
  const userTodayEntries = todayEntries.filter((e) => e.user_id === userId);
  const userTodaySchedule = todaySchedules.get(userId) ?? [];

  // ── Data: month history ──
  const { data: monthData } = useFichajeDetalle(branchId, userId, todayDate);

  // ── Data: schedules ──
  const monthStart = startOfMonth(todayDate);
  const monthEnd = endOfMonth(todayDate);
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['employee-panel-schedules', userId, branchId, format(monthStart, 'yyyy-MM')],
    queryFn: () =>
      fetchEmployeeScheduleForBranch(userId, branchId, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')),
    enabled: open,
  });

  // ── Data: labor summary ──
  const { summaries } = useLaborHours({
    branchId,
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  });
  const laborSummary = summaries.find((s) => s.userId === userId);


  // ── Data: consumptions & advances ──
  const { data: consumptions = [] } = useEmployeeConsumptionsByMonth(branchId, todayDate.getFullYear(), todayDate.getMonth());
  const { data: advances = [] } = useSalaryAdvancesByMonth(branchId, todayDate.getFullYear(), todayDate.getMonth());
  const financialMap = aggregateByUser(consumptions, advances);
  const financialData = financialMap.get(userId) ?? { consumos: 0, adelantos: 0 };

  // ── Computed: month hours ──
  const completedHours = laborSummary?.hsTrabajadasMes ?? 0;
  const inProgressHours = isWorking ? workingMin / 60 : 0;
  const monthHoursWorked = completedHours + inProgressHours;
  const monthlyTarget = laborSummary?.registeredHours ?? 190;
  const monthProgress = monthlyTarget > 0 ? Math.min(100, (monthHoursWorked / monthlyTarget) * 100) : 0;
  const unpairedCount = laborSummary?.unpairedCount ?? 0;

  // ── Computed: schedule total ──
  const totalScheduledHours = useMemo(() => {
    if (!schedules?.length) return 0;
    return schedules.reduce((sum, s) => {
      if (s.is_day_off) return sum;
      return sum + calculateShiftHours(s.start_time, s.end_time);
    }, 0);
  }, [schedules]);

  // ── Computed: next shift ──
  const nextShift = useMemo(() => {
    if (!schedules?.length) return null;
    const today = format(now, 'yyyy-MM-dd');
    const upcoming = schedules
      .filter((s) => s.schedule_date >= today && !s.is_day_off && s.start_time)
      .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
    if (!upcoming.length) return null;
    const s = upcoming[0];
    const d = new Date(s.schedule_date + 'T12:00:00');
    const dayLabel = isSameDay(d, now)
      ? 'Hoy'
      : isSameDay(d, new Date(now.getTime() + 86400000))
        ? 'Mañana'
        : format(d, 'EEE d/MM', { locale: es });
    return `${dayLabel} ${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)}`;
  }, [schedules, now]);

  // ── Mutation: quick close shift ──
  const closeMutation = useMutation({
    mutationFn: async ({ entryId: _entryId, time, date }: { entryId: string; time: string; date: string }) => {
      if (!user) throw new Error('Sin sesión');
      const [y, mo, d] = date.split('-').map(Number);
      const [h, m] = time.split(':').map(Number);
      const ts = new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
      return createManualClockEntry({
        branchId,
        userId,
        entryType: 'clock_out',
        timestamp: ts,
        reason: 'Cierre rápido desde panel de empleado',
        managerId: user.id,
        workDate: date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expanded-month-history'] });
      queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
      queryClient.invalidateQueries({ queryKey: ['labor-clock-entries'] });
      toast.success('Turno cerrado');
    },
    onError: () => toast.error('Error al cerrar turno'),
  });

  // ── Unpaired entries for quick-close ──
  const unpairedShifts = useMemo(() => {
    if (!monthData) return [];
    return monthData.entries
      .filter((e) => e.entry_type === 'clock_in')
      .filter((cin) => {
        const hasOut = monthData.entries.some(
          (e) =>
            e.entry_type === 'clock_out' &&
            e.schedule_id === cin.schedule_id &&
            cin.schedule_id,
        );
        if (cin.schedule_id && hasOut) return false;
        if (!cin.schedule_id) {
          const cinTime = new Date(cin.created_at).getTime();
          const hasSeqOut = monthData.entries.some(
            (e) =>
              e.entry_type === 'clock_out' &&
              new Date(e.created_at).getTime() > cinTime &&
              new Date(e.created_at).getTime() - cinTime < 24 * 60 * 60 * 1000,
          );
          if (hasSeqOut) return false;
        }
        return true;
      })
      .map((e) => ({
        id: e.id,
        date: e.work_date,
        time: format(new Date(e.created_at), 'HH:mm'),
      }));
  }, [monthData]);

  // ── Photo preview ──
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // ── Quick close form ──
  const [closeTime, setCloseTime] = useState<Record<string, string>>({});

  const todayShiftLabel = userTodaySchedule.length > 0 && !userTodaySchedule[0].is_day_off && userTodaySchedule[0].start_time
    ? `${userTodaySchedule[0].start_time.slice(0, 5)}-${userTodaySchedule[0].end_time?.slice(0, 5) ?? '??'}`
    : userTodaySchedule.length > 0 && userTodaySchedule[0].is_day_off
      ? 'Franco'
      : 'Sin turno';

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{userName}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isWorking ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span>Trabajando · {formatDuration(workingMin)}</span>
              </>
            ) : (
              <span>Fuera del local</span>
            )}
          </div>
        </div>
        {/* SheetContent already provides a close button */}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* ── SECTION: HOY ── */}
          <SectionHeader
            label="Hoy"
            badge={todayShiftLabel}
            expanded={expanded.has('hoy')}
            onToggle={() => toggle('hoy')}
          />
          {expanded.has('hoy') && (
            <div className="space-y-2 pl-1">
              {userTodaySchedule.length > 0 && !userTodaySchedule[0].is_day_off && userTodaySchedule[0].start_time && (
                <p className="text-xs text-muted-foreground">
                  Turno: {userTodaySchedule[0].start_time.slice(0, 5)} - {userTodaySchedule[0].end_time?.slice(0, 5)}
                </p>
              )}
              {userTodayEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin fichajes hoy</p>
              ) : (
                <div className="space-y-1.5">
                  {userTodayEntries.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className={`font-mono font-medium ${e.entry_type === 'clock_in' ? 'text-green-600' : 'text-red-600'}`}>
                        {format(new Date(e.created_at), 'HH:mm')}
                      </span>
                      <span className="text-muted-foreground">
                        {e.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                      </span>
                      {e.is_manual && <Badge variant="outline" className="text-[10px] px-1 py-0">Manual</Badge>}
                      {(e as any).photo_url && (
                        <button onClick={() => setPhotoUrl((e as any).photo_url)} className="text-muted-foreground hover:text-primary">
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => navigate(`/milocal/${branchId}/equipo/fichajes`)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar en Fichajes
                </Button>
              )}
            </div>
          )}

          {/* ── SECTION: MES ── */}
          <SectionHeader
            label={format(todayDate, 'MMMM', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            badge={`${completedHours.toFixed(1)}h${inProgressHours > 0 ? ` (+${inProgressHours.toFixed(1)})` : ''} / ${monthlyTarget}h`}
            expanded={expanded.has('mes')}
            onToggle={() => toggle('mes')}
            alert={unpairedCount > 0 ? `${unpairedCount} sin cerrar` : undefined}
          />
          {expanded.has('mes') && (
            <div className="space-y-2 pl-1">
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${monthProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-right">{monthProgress.toFixed(0)}%</p>
              </div>

              {/* Unpaired shifts quick-close */}
              {unpairedShifts.length > 0 && canEdit && (
                <div className="border border-amber-200 bg-amber-50/50 rounded p-2 space-y-1.5">
                  <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Turnos sin cerrar
                  </p>
                  {unpairedShifts.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono">{s.date?.slice(5)} {s.time}→?</span>
                      <Input
                        type="time"
                        className="h-6 w-20 text-xs px-1"
                        value={closeTime[s.id] ?? ''}
                        onChange={(e) => setCloseTime((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        disabled={!closeTime[s.id] || closeMutation.isPending}
                        onClick={() => closeMutation.mutate({ entryId: s.id, time: closeTime[s.id], date: s.date })}
                      >
                        Cerrar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary stats */}
              {laborSummary && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded border px-2 py-1.5 text-center">
                    <div className="font-bold">{laborSummary.diasTrabajados}</div>
                    <div className="text-muted-foreground">Días</div>
                  </div>
                  <div className="rounded border px-2 py-1.5 text-center">
                    <div className="font-bold text-amber-600">{laborSummary.totalExtras.toFixed(1)}h</div>
                    <div className="text-muted-foreground">Extras</div>
                  </div>
                  <div className="rounded border px-2 py-1.5 text-center">
                    <div className={`font-bold ${laborSummary.presentismo ? 'text-green-600' : 'text-red-600'}`}>
                      {laborSummary.presentismo ? 'SI' : 'NO'}
                    </div>
                    <div className="text-muted-foreground">Pres.</div>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => navigate(`/milocal/${branchId}/equipo/fichajes`)}
              >
                Ver historial completo
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {/* ── SECTION: HORARIOS ── */}
          <SectionHeader
            label="Horarios"
            badge={nextShift ?? `${Math.round(totalScheduledHours)}h prog.`}
            expanded={expanded.has('horarios')}
            onToggle={() => toggle('horarios')}
          />
          {expanded.has('horarios') && (
            <div className="space-y-2 pl-1">
              {schedulesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !schedules?.length ? (
                <p className="text-xs text-muted-foreground">Sin horarios asignados</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => {
                    const sched = schedules?.find((s) => isSameDay(new Date(s.schedule_date + 'T12:00:00'), day));
                    if (!sched) return null;
                    const isToday = isSameDay(day, now);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`flex justify-between items-center text-xs px-2 py-1 rounded ${isToday ? 'bg-primary/5 border border-primary/20' : ''}`}
                      >
                        <span className="capitalize">{format(day, 'EEE d', { locale: es })}</span>
                        {sched.is_day_off ? (
                          <Badge variant="outline" className="text-[10px]">Franco</Badge>
                        ) : (
                          <span className="font-mono">{sched.start_time?.slice(0, 5)}-{sched.end_time?.slice(0, 5)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => navigate(`/milocal/${branchId}/equipo/horarios`)}
              >
                Editar en grilla
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {/* ── SECTION: LIQUIDACIÓN ── */}
          <SectionHeader
            label="Liquidación"
            badge={laborSummary ? `${monthHoursWorked.toFixed(1)}h | ${laborSummary.totalExtras.toFixed(1)}h ext.` : '—'}
            expanded={expanded.has('liquidacion')}
            onToggle={() => toggle('liquidacion')}
          />
          {expanded.has('liquidacion') && (
            <div className="space-y-2 pl-1">
              {laborSummary ? (
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {/* Hábiles */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-2 text-center">
                    <div className="font-bold text-blue-700 text-sm">{laborSummary.hsHabiles.toFixed(1)}h</div>
                    <div className="text-blue-600/70 text-[10px]">Hábiles</div>
                  </div>
                  {/* Feriados */}
                  <div className="rounded-lg bg-violet-50 border border-violet-200 px-2 py-2 text-center">
                    <div className="font-bold text-violet-700 text-sm">{laborSummary.feriadosHs.toFixed(1)}h</div>
                    <div className="text-violet-600/70 text-[10px]">Feriados</div>
                  </div>
                  {/* Presentismo */}
                  <div className={`rounded-lg px-2 py-2 text-center border ${laborSummary.presentismo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`font-bold text-sm ${laborSummary.presentismo ? 'text-green-700' : 'text-red-700'}`}>
                      {laborSummary.presentismo ? 'SI' : 'NO'}
                    </div>
                    <div className={`text-[10px] ${laborSummary.presentismo ? 'text-green-600/70' : 'text-red-600/70'}`}>Presentismo</div>
                  </div>
                  {/* Extras hábil */}
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-2 text-center">
                    <div className="font-bold text-amber-700 text-sm">{laborSummary.hsExtrasDiaHabil.toFixed(1)}h</div>
                    <div className="text-amber-600/70 text-[10px]">Extras háb.</div>
                  </div>
                  {/* Extras franco/feriado */}
                  <div className="rounded-lg bg-orange-50 border border-orange-200 px-2 py-2 text-center">
                    <div className="font-bold text-orange-700 text-sm">{laborSummary.hsExtrasFrancoFeriado.toFixed(1)}h</div>
                    <div className="text-orange-600/70 text-[10px]">Extras fco.</div>
                  </div>
                  {/* Faltas injustificadas */}
                  <div className={`rounded-lg px-2 py-2 text-center border ${laborSummary.faltasInjustificadas > 0 ? 'bg-red-50 border-red-200' : 'bg-muted/30 border-border'}`}>
                    <div className={`font-bold text-sm ${laborSummary.faltasInjustificadas > 0 ? 'text-red-700' : 'text-foreground'}`}>
                      {laborSummary.faltasInjustificadas}
                    </div>
                    <div className="text-muted-foreground text-[10px]">Faltas inj.</div>
                  </div>
                  {/* Lic. enfermedad */}
                  <div className="rounded-lg bg-muted/30 border border-border px-2 py-2 text-center">
                    <div className="font-bold text-foreground text-sm">{laborSummary.faltasJustificadas}</div>
                    <div className="text-muted-foreground text-[10px]">Lic. enf.</div>
                  </div>
                  {/* Consumos - always visible */}
                  <div className="rounded-lg bg-violet-50 border border-violet-200 px-2 py-2 text-center">
                    <div className="font-bold text-violet-700 text-sm">${financialData.consumos.toFixed(0)}</div>
                    <div className="text-violet-600/70 text-[10px]">Consumos</div>
                  </div>
                  {/* Adelantos - always visible */}
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-2 text-center">
                    <div className="font-bold text-indigo-700 text-sm">${financialData.adelantos.toFixed(0)}</div>
                    <div className="text-indigo-600/70 text-[10px]">Adelantos</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {/* Even without labor data, show consumos & adelantos */}
                  <div className="col-span-3 text-center text-muted-foreground py-1">Sin datos de horas</div>
                  <div className="rounded-lg bg-violet-50 border border-violet-200 px-2 py-2 text-center">
                    <div className="font-bold text-violet-700 text-sm">${financialData.consumos.toFixed(0)}</div>
                    <div className="text-violet-600/70 text-[10px]">Consumos</div>
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-2 text-center">
                    <div className="font-bold text-indigo-700 text-sm">${financialData.adelantos.toFixed(0)}</div>
                    <div className="text-indigo-600/70 text-[10px]">Adelantos</div>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => navigate(`/milocal/${branchId}/tiempo/liquidacion`)}
              >
                Ver liquidación completa
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Photo preview */}
      <Dialog open={!!photoUrl} onOpenChange={(o) => { if (!o) setPhotoUrl(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de fichaje</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <img src={photoUrl} alt="Foto fichaje" className="w-full max-h-[60vh] object-contain rounded-md bg-muted" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[85vh] rounded-t-xl p-0' : 'w-[400px] p-0 sm:max-w-[400px]'}
      >
        {open && content}
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({
  label,
  badge,
  expanded,
  onToggle,
  alert,
}: {
  label: string;
  badge: string;
  expanded: boolean;
  onToggle: () => void;
  alert?: string;
}) {
  return (
    <button
      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform text-muted-foreground ${expanded ? '' : '-rotate-90'}`} />
        <span className="text-sm font-medium">{label}</span>
        {alert && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
            {alert}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-mono">{badge}</span>
    </button>
  );
}
