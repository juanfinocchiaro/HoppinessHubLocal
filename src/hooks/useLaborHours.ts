/**
 * useLaborHours Hook
 *
 * Calcula horas trabajadas con configuración dinámica desde labor_config.
 * Ya no tiene constantes hardcodeadas — todo es configurable por sucursal.
 *
 * REGLAS DE CÁLCULO:
 *   1) Horas en FRANCO TRABAJADO → SIEMPRE extras (recargo configurable)
 *   2) Horas en FERIADO trabajado → SIEMPRE extras (recargo configurable)
 *   3) Horas en DÍA HÁBIL → extras solo si exceden monthly_hours_limit
 *   4) Alerta diaria: si un día supera daily_hours_limit
 *   5) Presentismo: faltasInjustificadas == 0 AND tardanzaAcumulada <= late_tolerance_total_min
 *   6) Retiro anticipado autorizado: NO afecta presentismo
 *   7) Horas de licencia: columna separada, NO suma a hsTrabajadasMes
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchSpecialDays,
  fetchAbsences,
  fetchLaborUsersData,
} from '@/services/hrService';
import {
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
  format,
} from 'date-fns';
import type { LocalRole } from './usePermissions';
import { useLaborConfig, LABOR_CONFIG_DEFAULTS, type LaborConfig } from './useLaborConfig';
import { fromUntyped } from '@/lib/supabase-helpers';

export interface ClockEntryRaw {
  id: string;
  user_id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  branch_id: string;
  schedule_id?: string | null;
  work_date?: string | null;
  early_leave_authorized?: boolean;
}

export interface DayEntry {
  date: string;
  checkIn: string;
  checkOut: string | null;
  minutesWorked: number;
  hoursDecimal: number;
  isHoliday: boolean;
  isDayOff: boolean;
  earlyLeaveAuthorized?: boolean;
}

export interface EmployeeLaborSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  localRole: LocalRole;
  cuil: string | null;
  hireDate: string | null;
  contractType: string;
  registeredHours: number | null;

  // Horas básicas
  hsTrabajadasMes: number;
  diasTrabajados: number;

  // Desglose por tipo de día
  hsRegulares: number;
  hsExtrasDiaHabil: number;
  feriadosHs: number;
  hsFrancoTrabajado: number;

  // Backward compat fields
  hsFrancoFeriado: number;
  hsHabiles: number;
  hsExtrasFrancoFeriado: number;
  totalExtras: number;

  // Alertas diarias
  diasConExceso: number;
  alertasDiarias: { date: string; horasExtra: number }[];

  // Presentismo
  faltasInjustificadas: number;
  faltasJustificadas: number;
  tardanzaAcumuladaMin: number;
  presentismo: boolean;

  // Vacaciones (días)
  diasVacaciones: number;

  // Horas de licencia (separadas)
  hsLicencia: number;

  // Control
  entries: DayEntry[];
  hasUnpairedEntries: boolean;
  unpairedCount: number;
}

export interface LaborStats {
  totalEmpleados: number;
  totalHsEquipo: number;
  totalExtrasMes: number;
  empleadosConPresentismo: number;
  empleadosSinPresentismo: number;
}

/**
 * Groups clock entries by schedule_id when available, with sequential
 * fallback for legacy data without schedule_id.
 */
function pairClockEntries(
  entries: ClockEntryRaw[],
  holidays: Set<string>,
  scheduledDaysOff: Set<string>,
): DayEntry[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const hasScheduleIds = sorted.some((e) => e.schedule_id);

  if (hasScheduleIds) {
    const bySchedule = new Map<string, ClockEntryRaw[]>();
    const unlinked: ClockEntryRaw[] = [];

    for (const e of sorted) {
      if (e.schedule_id) {
        const list = bySchedule.get(e.schedule_id) ?? [];
        list.push(e);
        bySchedule.set(e.schedule_id, list);
      } else {
        unlinked.push(e);
      }
    }

    const paired: DayEntry[] = [];

    for (const [, group] of bySchedule) {
      const clockIn = group.find((e) => e.entry_type === 'clock_in');
      const clockOut = group.find((e) => e.entry_type === 'clock_out');

      if (clockIn) {
        const checkInTime = new Date(clockIn.created_at);
        const date = clockIn.work_date ?? format(checkInTime, 'yyyy-MM-dd');
        const minutes = clockOut
          ? differenceInMinutes(new Date(clockOut.created_at), checkInTime)
          : 0;

        paired.push({
          date,
          checkIn: clockIn.created_at,
          checkOut: clockOut?.created_at ?? null,
          minutesWorked: Math.max(0, minutes),
          hoursDecimal: Math.max(0, minutes) / 60,
          isHoliday: holidays.has(date),
          isDayOff: scheduledDaysOff.has(date),
          earlyLeaveAuthorized: clockOut?.early_leave_authorized || false,
        });
      }
    }

    paired.push(...legacyPairEntries(unlinked, holidays, scheduledDaysOff));
    return paired;
  }

  return legacyPairEntries(sorted, holidays, scheduledDaysOff);
}

function legacyPairEntries(
  sorted: ClockEntryRaw[],
  holidays: Set<string>,
  scheduledDaysOff: Set<string>,
): DayEntry[] {
  const paired: DayEntry[] = [];
  let pendingClockIn: ClockEntryRaw | null = null;

  for (const entry of sorted) {
    if (entry.entry_type === 'clock_in') {
      if (pendingClockIn) {
        const date = pendingClockIn.work_date ?? format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd');
        paired.push({
          date,
          checkIn: pendingClockIn.created_at,
          checkOut: null,
          minutesWorked: 0,
          hoursDecimal: 0,
          isHoliday: holidays.has(date),
          isDayOff: scheduledDaysOff.has(date),
        });
      }
      pendingClockIn = entry;
    } else if (entry.entry_type === 'clock_out') {
      if (pendingClockIn) {
        const checkInTime = new Date(pendingClockIn.created_at);
        const checkOutTime = new Date(entry.created_at);
        const minutes = differenceInMinutes(checkOutTime, checkInTime);
        const date = pendingClockIn.work_date ?? format(checkInTime, 'yyyy-MM-dd');
        paired.push({
          date,
          checkIn: pendingClockIn.created_at,
          checkOut: entry.created_at,
          minutesWorked: Math.max(0, minutes),
          hoursDecimal: Math.max(0, minutes) / 60,
          isHoliday: holidays.has(date),
          isDayOff: scheduledDaysOff.has(date),
          earlyLeaveAuthorized: entry.early_leave_authorized || false,
        });
        pendingClockIn = null;
      }
    }
  }

  if (pendingClockIn) {
    const date = pendingClockIn.work_date ?? format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd');
    paired.push({
      date,
      checkIn: pendingClockIn.created_at,
      checkOut: null,
      minutesWorked: 0,
      hoursDecimal: 0,
      isHoliday: holidays.has(date),
      isDayOff: scheduledDaysOff.has(date),
    });
  }

  return paired;
}

interface UseLaborHoursOptions {
  branchId: string;
  year: number;
  month: number; // 0-indexed
}

export function useLaborHours({ branchId, year, month }: UseLaborHoursOptions) {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  const startStr = format(monthStart, 'yyyy-MM-dd');
  const endStr = format(monthEnd, 'yyyy-MM-dd');

  const { data: laborConfig } = useLaborConfig(branchId);
  const config: LaborConfig = laborConfig ?? LABOR_CONFIG_DEFAULTS;

  // Query fichajes del mes (including early_leave_authorized)
  const { data: rawEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['labor-clock-entries', branchId, year, month],
    queryFn: async () => {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      // Use fromUntyped to include early_leave_authorized
      const { data, error } = await fromUntyped('clock_entries')
        .select('id, user_id, entry_type, created_at, branch_id, schedule_id, work_date, early_leave_authorized')
        .eq('branch_id', branchId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ClockEntryRaw[];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });

  // Query feriados del mes
  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['labor-holidays', year, month],
    queryFn: async () => fetchSpecialDays(startStr, endStr),
    staleTime: 60 * 1000,
  });

  // Query horarios del mes (para detectar francos + calcular horas licencia)
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['labor-schedules-full', branchId, year, month],
    queryFn: async () => {
      const { data, error } = await fromUntyped('employee_schedules')
        .select('user_id, schedule_date, is_day_off, start_time, end_time')
        .eq('branch_id', branchId)
        .gte('schedule_date', startStr)
        .lte('schedule_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });

  // Query ausencias (para presentismo + licencias)
  const { data: absences = [], isLoading: loadingAbsences } = useQuery({
    queryKey: ['labor-absences', branchId, year, month],
    queryFn: async () => fetchAbsences(branchId, startStr, endStr),
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });

  // Query datos de usuarios
  const userIds = [...new Set(rawEntries.map((e) => e.user_id))];

  const { data: usersData = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['labor-users', branchId, userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      return fetchLaborUsersData(branchId, userIds);
    },
    enabled: userIds.length > 0,
    staleTime: 60 * 1000,
  });

  const holidaySet = new Set<string>(holidays);

  // Calcular resumen por empleado
  const summaries: EmployeeLaborSummary[] = userIds.map((userId) => {
    const userData = usersData.find((u) => u.user_id === userId);
    const userEntries = rawEntries.filter((e) => e.user_id === userId);

    // Francos programados del empleado
    const userDaysOff = new Set<string>(
      schedules.filter((s: any) => s.user_id === userId && s.is_day_off).map((s: any) => s.schedule_date as string),
    );

    const paired = pairClockEntries(userEntries, holidaySet, userDaysOff);

    const unpairedEntries = paired.filter((p) => p.checkOut === null);
    const completedEntries = paired.filter((p) => p.checkOut !== null);

    // Horas totales del mes
    const hsTrabajadasMes = completedEntries.reduce((sum, e) => sum + e.hoursDecimal, 0);

    // Días únicos trabajados
    const uniqueDays = new Set(completedEntries.map((e) => e.date)).size;

    // Horas en feriados
    const feriadosHs = completedEntries
      .filter((e) => e.isHoliday)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);

    // Horas en francos trabajados (sin feriado)
    const hsFrancoTrabajado = completedEntries
      .filter((e) => e.isDayOff && !e.isHoliday)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);

    // Combined franco + feriado (backward compat)
    const hsFrancoFeriado = completedEntries
      .filter((e) => e.isHoliday || e.isDayOff)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);

    // Agrupar horas por día para calcular excesos diarios
    const hoursByDay: Record<string, number> = {};
    for (const entry of completedEntries) {
      hoursByDay[entry.date] = (hoursByDay[entry.date] || 0) + entry.hoursDecimal;
    }

    const alertasDiarias = Object.entries(hoursByDay)
      .filter(([_, hours]) => hours > config.daily_hours_limit)
      .map(([date, hours]) => ({
        date,
        horasExtra: hours - config.daily_hours_limit,
      }));

    // Extras mensuales:
    const hsExtrasFrancoFeriado = hsFrancoFeriado;
    const hsHabiles = Math.max(0, hsTrabajadasMes - hsFrancoFeriado);
    const hsExtrasDiaHabil = Math.max(0, hsHabiles - config.monthly_hours_limit);
    const totalExtras = hsExtrasFrancoFeriado + hsExtrasDiaHabil;

    // Presentismo: faltas injustificadas + tardanza acumulativa
    const userAbsences = absences.filter((a: any) => a.user_id === userId);
    const faltasInjustificadas = userAbsences.filter(
      (a: any) =>
        a.request_type === 'unjustified_absence' ||
        (a.request_type === 'absence' && a.status !== 'approved'),
    ).length;
    const faltasJustificadas = userAbsences.filter(
      (a: any) =>
        a.request_type === 'justified_absence' ||
        a.request_type === 'sick_leave' ||
        a.request_type === 'vacation' ||
        (a.request_type === 'absence' && a.status === 'approved'),
    ).length;

    // Calculate cumulative lateness (tardanza acumulativa)
    let tardanzaAcumuladaMin = 0;
    for (const entry of paired) {
      if (!entry.checkIn) continue;
      // Find schedule for this entry's date
      const daySchedules = schedules.filter(
        (s: any) => s.user_id === userId && s.schedule_date === entry.date && !s.is_day_off && s.start_time,
      );
      if (daySchedules.length === 0) continue;

      const clockInTime = new Date(entry.checkIn);
      const clockInMin = clockInTime.getHours() * 60 + clockInTime.getMinutes();

      // Find closest schedule
      let bestLate = 0;
      let bestDist = Infinity;
      for (const s of daySchedules) {
        const [h, m] = (s as any).start_time.split(':').map(Number);
        const schedMin = h * 60 + m;
        const diff = ((clockInMin - schedMin) % 1440 + 1440) % 1440;
        // Only count as late if diff < 720 (not arriving way early for next shift)
        if (diff > 0 && diff < 720 && diff < bestDist) {
          bestDist = diff;
          bestLate = diff;
        }
      }
      tardanzaAcumuladaMin += bestLate;
    }

    const presentismo =
      faltasInjustificadas === 0 &&
      tardanzaAcumuladaMin <= config.late_tolerance_total_min;

    // Horas de licencia: cruzar absences aprobadas con horarios programados
    let hsLicencia = 0;
    const approvedAbsenceDates = userAbsences
      .filter((a: any) =>
        ['sick_leave', 'justified_absence', 'vacation'].includes(a.request_type) &&
        (a.status === 'approved' || a.request_type === 'sick_leave'),
      )
      .map((a: any) => a.request_date);

    for (const absDate of approvedAbsenceDates) {
      const dayScheds = schedules.filter(
        (s: any) => s.user_id === userId && s.schedule_date === absDate && !s.is_day_off && s.start_time && s.end_time,
      );
      for (const s of dayScheds) {
        const [sh, sm] = (s as any).start_time.split(':').map(Number);
        const [eh, em] = (s as any).end_time.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const duration = endMin >= startMin ? endMin - startMin : 1440 - startMin + endMin;
        hsLicencia += duration / 60;
      }
    }

    return {
      userId,
      userName: userData?.full_name || 'Usuario desconocido',
      avatarUrl: userData?.avatar_url || null,
      localRole: userData?.local_role || null,
      cuil: userData?.cuil || null,
      hireDate: userData?.hire_date || null,
      contractType: userData?.registered_hours
        ? `${userData.registered_hours} hs/mes en blanco`
        : 'No definido',
      registeredHours: userData?.registered_hours ?? null,

      hsTrabajadasMes: Number(hsTrabajadasMes.toFixed(2)),
      diasTrabajados: uniqueDays,

      feriadosHs: Number(feriadosHs.toFixed(2)),
      hsFrancoTrabajado: Number(hsFrancoTrabajado.toFixed(2)),
      hsFrancoFeriado: Number(hsFrancoFeriado.toFixed(2)),

      hsHabiles: Number(hsHabiles.toFixed(2)),
      hsExtrasDiaHabil: Number(hsExtrasDiaHabil.toFixed(2)),
      hsExtrasFrancoFeriado: Number(hsExtrasFrancoFeriado.toFixed(2)),
      totalExtras: Number(totalExtras.toFixed(2)),

      diasConExceso: alertasDiarias.length,
      alertasDiarias,

      faltasInjustificadas,
      faltasJustificadas,
      tardanzaAcumuladaMin,
      presentismo,

      hsLicencia: Number(hsLicencia.toFixed(2)),

      entries: paired,
      hasUnpairedEntries: unpairedEntries.length > 0,
      unpairedCount: unpairedEntries.length,
    };
  });

  summaries.sort((a, b) => b.hsTrabajadasMes - a.hsTrabajadasMes);

  // Stats generales
  const stats: LaborStats = {
    totalEmpleados: summaries.length,
    totalHsEquipo: summaries.reduce((sum, s) => sum + s.hsTrabajadasMes, 0),
    totalExtrasMes: summaries.reduce((sum, s) => sum + s.totalExtras, 0),
    empleadosConPresentismo: summaries.filter((s) => s.presentismo).length,
    empleadosSinPresentismo: summaries.filter((s) => !s.presentismo).length,
  };

  return {
    summaries,
    stats,
    holidays: holidaySet,
    config,
    loading:
      loadingEntries || loadingHolidays || loadingSchedules || loadingUsers || loadingAbsences,
    monthStart,
    monthEnd,
  };
}

/**
 * Formatea horas decimales a string (ej: 176.5 -> "176h 30m")
 */
export function formatHoursDecimal(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Genera CSV para liquidación según formato requerido
 */
export function generateLaborCSV(summaries: EmployeeLaborSummary[], _monthLabel: string): string {
  const headers = [
    'QTY',
    'LEGAJO',
    'RECURSO',
    'CUIL',
    'PUESTO',
    'INGRESO',
    'BAJA',
    'CONTRATO',
    'JORNADA',
    'HS TRABAJADAS',
    'HS LICENCIA',
    'FALTAS INJUSTIFICADAS',
    'LICENCIA ENFERMEDAD',
    'TARDANZA ACUM (min)',
    'PRESENTISMO',
    'FERIADOS (hs)',
    'HS FRANCO TRABAJADO',
    'HS EXTRAS DÍA HÁBIL',
    'HS EXTRAS FRANCO/FERIADO',
  ];

  const rows = summaries.map((s, idx) => [
    (idx + 1).toString(),
    '',
    s.userName,
    s.cuil || '-',
    s.localRole?.toUpperCase() || '-',
    s.hireDate || '-',
    '-',
    s.contractType,
    'Por hora',
    s.hsTrabajadasMes.toFixed(2),
    s.hsLicencia.toFixed(2),
    s.faltasInjustificadas.toString(),
    s.faltasJustificadas.toString(),
    s.tardanzaAcumuladaMin.toString(),
    s.presentismo ? 'SI' : 'NO',
    s.feriadosHs.toFixed(2),
    s.hsFrancoTrabajado.toFixed(2),
    s.hsExtrasDiaHabil.toFixed(2),
    s.hsExtrasFrancoFeriado.toFixed(2),
  ]);

  const allRows = [headers, ...rows];
  return allRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export default useLaborHours;
