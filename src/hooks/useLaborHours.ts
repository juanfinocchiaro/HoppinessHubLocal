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

export interface PositionBreakdown {
  position: string;
  hsTrabajadas: number;
  hsRegulares: number;
  hsExtrasDiaHabil: number;
  hsExtrasInhabil: number;
  feriadosHs: number;
  hsFrancoTrabajado: number;
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
  hsExtrasInhabil: number;
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

  // Per-day lateness breakdown
  dailyLateness: { date: string; minutes: number; scheduledStart: string }[];

  // Desglose por puesto operativo
  positionBreakdown: PositionBreakdown[];

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
        .select('user_id, schedule_date, is_day_off, start_time, end_time, work_position')
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

  // Include user_ids from both entries AND schedules (so vacation-only employees appear)
  const userIds = [...new Set([
    ...rawEntries.map((e) => e.user_id),
    ...schedules.map((s: any) => s.user_id as string),
  ])];

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

    // Build schedule maps for this user
    const userSchedules = schedules.filter((s: any) => s.user_id === userId);
    const userDaysOff = new Set<string>(
      userSchedules.filter((s: any) => s.is_day_off).map((s: any) => s.schedule_date as string),
    );
    // Map date -> work_position for vacation detection
    const positionByDate = new Map<string, string>();
    for (const s of userSchedules) {
      if ((s as any).work_position) {
        positionByDate.set((s as any).schedule_date, (s as any).work_position);
      }
    }

    // Count vacation days from schedules (work_position = 'vacaciones')
    const diasVacaciones = userSchedules.filter(
      (s: any) => s.is_day_off && (s as any).work_position === 'vacaciones',
    ).length;

    const paired = pairClockEntries(userEntries, holidaySet, userDaysOff);

    const unpairedEntries = paired.filter((p) => p.checkOut === null);
    const completedEntries = paired.filter((p) => p.checkOut !== null);

    // Días únicos trabajados
    const uniqueDays = new Set(completedEntries.map((e) => e.date)).size;

    // Agrupar horas por día para clasificación
    const hoursByDay: Record<string, number> = {};
    for (const entry of completedEntries) {
      hoursByDay[entry.date] = (hoursByDay[entry.date] || 0) + entry.hoursDecimal;
    }

    // Classify hours day by day (unified with daily view)
    let hsRegulares = 0;
    let hsExtrasDiaHabil = 0;
    let hsExtrasInhabil = 0;
    let feriadosHs = 0;
    let hsFrancoTrabajado = 0;
    const alertasDiarias: { date: string; horasExtra: number }[] = [];

    // Position breakdown accumulator
    const posBreakdownMap = new Map<string, {
      hsTrabajadas: number; hsRegulares: number; hsExtrasDiaHabil: number;
      hsExtrasInhabil: number; feriadosHs: number; hsFrancoTrabajado: number;
    }>();
    const getPosBucket = (pos: string) => {
      if (!posBreakdownMap.has(pos)) {
        posBreakdownMap.set(pos, { hsTrabajadas: 0, hsRegulares: 0, hsExtrasDiaHabil: 0, hsExtrasInhabil: 0, feriadosHs: 0, hsFrancoTrabajado: 0 });
      }
      return posBreakdownMap.get(pos)!;
    };

    for (const [date, horasDia] of Object.entries(hoursByDay)) {
      const isHoliday = holidaySet.has(date);
      const isDayOff = userDaysOff.has(date);
      const position = positionByDate.get(date);
      const posKey = position || 'Sin puesto';
      const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const bucket = getPosBucket(posKey);

      if (position === 'vacaciones') {
        const reg = Math.min(horasDia, config.daily_hours_limit);
        hsRegulares += reg;
        bucket.hsRegulares += reg;
        if (isWeekend) {
          const ext = Math.max(0, horasDia - config.daily_hours_limit);
          hsExtrasInhabil += ext;
          bucket.hsExtrasInhabil += ext;
        } else {
          const ext = Math.max(0, horasDia - config.daily_hours_limit);
          hsExtrasDiaHabil += ext;
          bucket.hsExtrasDiaHabil += ext;
        }
      } else if (isHoliday) {
        feriadosHs += horasDia;
        bucket.feriadosHs += horasDia;
      } else if (isDayOff) {
        hsFrancoTrabajado += horasDia;
        bucket.hsFrancoTrabajado += horasDia;
      } else {
        // Regular business day
        const reg = Math.min(horasDia, config.daily_hours_limit);
        hsRegulares += reg;
        bucket.hsRegulares += reg;
        if (isWeekend) {
          const ext = Math.max(0, horasDia - config.daily_hours_limit);
          hsExtrasInhabil += ext;
          bucket.hsExtrasInhabil += ext;
        } else {
          const ext = Math.max(0, horasDia - config.daily_hours_limit);
          hsExtrasDiaHabil += ext;
          bucket.hsExtrasDiaHabil += ext;
        }
      }
      bucket.hsTrabajadas += horasDia;

      if (horasDia > config.daily_hours_limit) {
        alertasDiarias.push({ date, horasExtra: horasDia - config.daily_hours_limit });
      }
    }

    // Build positionBreakdown array
    const positionBreakdown: PositionBreakdown[] = Array.from(posBreakdownMap.entries())
      .filter(([pos]) => pos !== 'vacaciones' && pos !== 'cumple')
      .map(([position, b]) => ({
        position,
        hsTrabajadas: Number(b.hsTrabajadas.toFixed(2)),
        hsRegulares: Number(b.hsRegulares.toFixed(2)),
        hsExtrasDiaHabil: Number(b.hsExtrasDiaHabil.toFixed(2)),
        hsExtrasInhabil: Number(b.hsExtrasInhabil.toFixed(2)),
        feriadosHs: Number(b.feriadosHs.toFixed(2)),
        hsFrancoTrabajado: Number(b.hsFrancoTrabajado.toFixed(2)),
      }))
      .sort((a, b) => b.hsTrabajadas - a.hsTrabajadas);

    const hsTrabajadasMes = hsRegulares + hsExtrasDiaHabil + hsExtrasInhabil + feriadosHs + hsFrancoTrabajado;
    const hsFrancoFeriado = feriadosHs + hsFrancoTrabajado;
    const hsExtrasFrancoFeriado = hsFrancoFeriado;
    const hsHabiles = hsRegulares + hsExtrasDiaHabil + hsExtrasInhabil;
    const totalExtras = hsExtrasDiaHabil + hsExtrasInhabil + hsExtrasFrancoFeriado;

    // Presentismo: faltas calculadas cruzando schedules con clock_entries
    // (misma lógica que Fichajes: si tiene horario y no fichó → ausente)
    const userAbsences = absences.filter((a: any) => a.user_id === userId);
    const today = format(new Date(), 'yyyy-MM-dd');
    const datesWithClockIn = new Set(paired.map((p) => p.date));

    let faltasInjustificadas = 0;
    let faltasJustificadas = 0;

    // Iterate each day of the month up to today
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(year, month, d), 'yyyy-MM-dd');
      if (dateStr > today) break; // don't count future days
      if (dateStr > endStr) break;

      // Skip holidays
      if (holidaySet.has(dateStr)) continue;

      // Find scheduled work for this user on this date
      const dayScheds = userSchedules.filter(
        (s: any) => s.schedule_date === dateStr && !s.is_day_off && s.start_time,
      );
      if (dayScheds.length === 0) continue;

      // Skip vacations and birthdays
      const pos = positionByDate.get(dateStr);
      if (pos === 'vacaciones' || pos === 'cumple') continue;

      // Check if employee clocked in
      if (!datesWithClockIn.has(dateStr)) {
        // No clock-in → check if there's an approved absence
        const hasApprovedAbsence = userAbsences.some(
          (a: any) =>
            a.request_date === dateStr &&
            (a.status === 'approved' ||
              a.request_type === 'sick_leave' ||
              a.request_type === 'justified_absence'),
        );
        if (hasApprovedAbsence) {
          faltasJustificadas++;
        } else {
          faltasInjustificadas++;
        }
      }
    }

    // Calculate cumulative lateness (tardanza acumulativa)
    // Only count on working days (skip francos, vacaciones, holidays)
    let tardanzaAcumuladaMin = 0;
    const dailyLateness: { date: string; minutes: number; scheduledStart: string }[] = [];
    for (const entry of paired) {
      if (!entry.checkIn) continue;
      if (entry.isDayOff || entry.isHoliday) continue;
      const position = positionByDate.get(entry.date);
      if (position === 'vacaciones' || position === 'cumple') continue;

      const daySchedules = schedules.filter(
        (s: any) => s.user_id === userId && s.schedule_date === entry.date && !s.is_day_off && s.start_time,
      );
      if (daySchedules.length === 0) continue;

      const clockInTime = new Date(entry.checkIn);
      const argentinaOffsetMs = -3 * 60 * 60 * 1000;
      const localClockIn = new Date(clockInTime.getTime() + clockInTime.getTimezoneOffset() * 60000 + argentinaOffsetMs);
      const clockInMin = localClockIn.getHours() * 60 + localClockIn.getMinutes();

      let bestLate = 0;
      let bestDist = Infinity;
      let bestSchedStart = '';
      for (const s of daySchedules) {
        const [h, m] = (s as any).start_time.split(':').map(Number);
        const schedMin = h * 60 + m;
        const diff = ((clockInMin - schedMin) % 1440 + 1440) % 1440;
        if (diff > 0 && diff < 360 && diff < bestDist) {
          bestDist = diff;
          bestLate = diff;
          bestSchedStart = (s as any).start_time;
        }
      }
      if (bestLate > 0) {
        dailyLateness.push({ date: entry.date, minutes: bestLate, scheduledStart: bestSchedStart });
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

      hsRegulares: Number(hsRegulares.toFixed(2)),
      feriadosHs: Number(feriadosHs.toFixed(2)),
      hsFrancoTrabajado: Number(hsFrancoTrabajado.toFixed(2)),
      hsFrancoFeriado: Number(hsFrancoFeriado.toFixed(2)),

      hsHabiles: Number(hsHabiles.toFixed(2)),
      hsExtrasDiaHabil: Number(hsExtrasDiaHabil.toFixed(2)),
      hsExtrasInhabil: Number(hsExtrasInhabil.toFixed(2)),
      hsExtrasFrancoFeriado: Number(hsExtrasFrancoFeriado.toFixed(2)),
      totalExtras: Number(totalExtras.toFixed(2)),

      diasConExceso: alertasDiarias.length,
      alertasDiarias,

      faltasInjustificadas,
      faltasJustificadas,
      tardanzaAcumuladaMin,
      presentismo,

      diasVacaciones,
      hsLicencia: Number(hsLicencia.toFixed(2)),

      dailyLateness,
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
    'RECURSO',
    'PUESTO',
    'HS TRABAJADAS',
    'HS REGULARES',
    'VACACIONES (días)',
    'FALTAS INJ.',
    'FALTA JUSTIFICADA (hs)',
    'TARDANZA (min)',
    'HS FERIADOS',
    'HS FRANCO',
    'EXTRAS HÁBIL',
    'EXTRAS INHÁBIL',
    'PRESENTISMO',
  ];

  const rows = summaries.map((s, idx) => [
    (idx + 1).toString(),
    s.userName,
    s.localRole?.toUpperCase() || '-',
    s.hsTrabajadasMes.toFixed(2),
    s.hsRegulares.toFixed(2),
    s.diasVacaciones.toString(),
    s.faltasInjustificadas.toString(),
    s.hsLicencia.toFixed(2),
    s.tardanzaAcumuladaMin.toString(),
    s.feriadosHs.toFixed(2),
    s.hsFrancoTrabajado.toFixed(2),
    s.hsExtrasDiaHabil.toFixed(2),
    s.hsExtrasInhabil.toFixed(2),
    s.presentismo ? 'SI' : 'NO',
  ]);

  const allRows = [headers, ...rows];
  return allRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export default useLaborHours;
