/**
 * useLaborHours Hook
 *
 * Calcula horas trabajadas según CCT 329/00 â€“ Servicios Rápidos
 * y art. 201 LCT, con las siguientes reglas de negocio:
 *
 * CONSTANTES (hardcodeadas por convenio):
 *   - Límite diario: 9 hs (aplica a todos los roles por igual)
 *   - Límite mensual: 190 hs (aplica a todos los roles por igual)
 *   - Recargo hora extra: +50 % (siempre, tanto hábil como franco/feriado)
 *
 * REGLAS DE CÁLCULO:
 *   1) Horas en FRANCO TRABAJADO â†’ SIEMPRE son extras (+50 %), sin importar
 *      si el empleado llegó o no a las 190 hs mensuales.
 *   2) Horas en FERIADO trabajado â†’ SIEMPRE son extras (+50 %), misma lógica.
 *   3) Horas en DÍA HÁBIL â†’ solo se consideran extras si el total de horas
 *      hábiles del mes supera las 190 hs. El excedente son extras (+50 %).
 *   4) Alerta diaria: si un día supera 9 hs, se marca como alerta informativa.
 *   5) Presentismo: "SI" si faltas injustificadas del mes == 0.
 *
 * Fórmulas resultantes:
 *   - hsExtrasFrancoFeriado = hsFrancoFeriado (siempre extra)
 *   - hsHabiles = hsTrabajadasMes - hsFrancoFeriado
 *   - hsExtrasDiaHabil = max(0, hsHabiles - 190)
 *   - totalExtras = hsExtrasFrancoFeriado + hsExtrasDiaHabil
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchClockEntries,
  fetchSpecialDays,
  fetchBranchSchedules,
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

export interface ClockEntryRaw {
  id: string;
  user_id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  branch_id: string;
  schedule_id?: string | null;
  work_date?: string | null;
}

export interface DayEntry {
  date: string;
  checkIn: string;
  checkOut: string | null;
  minutesWorked: number;
  hoursDecimal: number;
  isHoliday: boolean;
  isDayOff: boolean; // Franco programado
}

export interface EmployeeLaborSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  localRole: LocalRole;
  cuil: string | null;
  hireDate: string | null;
  contractType: string; // 'No definido', '60 hs/mes', '190 hs/mes', etc.
  registeredHours: number | null; // Raw value from employee_data

  // Horas básicas
  hsTrabajadasMes: number; // Total horas trabajadas
  diasTrabajados: number;

  // Feriados y francos
  feriadosHs: number; // Horas trabajadas en feriados
  hsFrancoFeriado: number; // Horas en feriados + francos trabajados

  // Extras (CCT 329/00 â€“ recargo siempre +50 %)
  hsHabiles: number; // Horas en días hábiles (sin francos ni feriados)
  hsExtrasDiaHabil: number; // max(0, hsHabiles - 190) â†’ extras por exceder límite mensual
  hsExtrasFrancoFeriado: number; // = hsFrancoFeriado (siempre extras)
  totalExtras: number; // hsExtrasDiaHabil + hsExtrasFrancoFeriado

  // Alertas diarias (días > 9hs)
  diasConExceso: number;
  alertasDiarias: { date: string; horasExtra: number }[];

  // Presentismo
  faltasInjustificadas: number;
  faltasJustificadas: number;
  presentismo: boolean;

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

// Constantes del convenio
const HORAS_MENSUALES_LIMITE = 190;
const HORAS_DIARIAS_LIMITE = 9;

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
        });
      }
    }

    // Pair remaining unlinked entries sequentially
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

  // Query fichajes del mes
  const { data: rawEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['labor-clock-entries', branchId, year, month],
    queryFn: async () => {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      return (await fetchClockEntries(branchId, startDate, endDate)) as unknown as ClockEntryRaw[];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });

  // Query feriados del mes
  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['labor-holidays', year, month],
    queryFn: async () => {
      return fetchSpecialDays(startStr, endStr);
    },
    staleTime: 60 * 1000,
  });

  // Query horarios del mes (para detectar francos programados)
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['labor-schedules', branchId, year, month],
    queryFn: async () => {
      return fetchBranchSchedules(branchId, startStr, endStr);
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });

  // Query ausencias (para presentismo)
  const { data: absences = [], isLoading: loadingAbsences } = useQuery({
    queryKey: ['labor-absences', branchId, year, month],
    queryFn: async () => {
      return fetchAbsences(branchId, startStr, endStr);
    },
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

  const holidaySet = new Set(holidays);

  // Calcular resumen por empleado
  const summaries: EmployeeLaborSummary[] = userIds.map((userId) => {
    const userData = usersData.find((u) => u.user_id === userId);
    const userEntries = rawEntries.filter((e) => e.user_id === userId);

    // Francos programados del empleado
    const userDaysOff = new Set(
      schedules.filter((s) => s.user_id === userId && s.is_day_off).map((s) => s.schedule_date),
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

    // Horas en feriados O francos trabajados
    const hsFrancoFeriado = completedEntries
      .filter((e) => e.isHoliday || e.isDayOff)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);

    // Agrupar horas por día para calcular excesos diarios
    const hoursByDay: Record<string, number> = {};
    for (const entry of completedEntries) {
      hoursByDay[entry.date] = (hoursByDay[entry.date] || 0) + entry.hoursDecimal;
    }

    const alertasDiarias = Object.entries(hoursByDay)
      .filter(([_, hours]) => hours > HORAS_DIARIAS_LIMITE)
      .map(([date, hours]) => ({
        date,
        horasExtra: hours - HORAS_DIARIAS_LIMITE,
      }));

    // Extras mensuales según CCT 329/00 + reglas de negocio:
    // Franco/feriado trabajado â†’ SIEMPRE extra (+50 %)
    const hsExtrasFrancoFeriado = hsFrancoFeriado;
    // Horas hábiles = total - francos/feriados
    const hsHabiles = Math.max(0, hsTrabajadasMes - hsFrancoFeriado);
    // Solo el excedente hábil sobre 190 hs es extra
    const hsExtrasDiaHabil = Math.max(0, hsHabiles - HORAS_MENSUALES_LIMITE);
    const totalExtras = hsExtrasFrancoFeriado + hsExtrasDiaHabil;

    // Presentismo (faltas injustificadas)
    const userAbsences = absences.filter((a) => a.user_id === userId);
    const faltasInjustificadas = userAbsences.filter(
      (a) =>
        a.request_type === 'unjustified_absence' ||
        (a.request_type === 'absence' && a.status !== 'approved'),
    ).length;
    const faltasJustificadas = userAbsences.filter(
      (a) =>
        a.request_type === 'justified_absence' ||
        a.request_type === 'sick_leave' ||
        (a.request_type === 'absence' && a.status === 'approved'),
    ).length;

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
      hsFrancoFeriado: Number(hsFrancoFeriado.toFixed(2)),

      hsHabiles: Number(hsHabiles.toFixed(2)),
      hsExtrasDiaHabil: Number(hsExtrasDiaHabil.toFixed(2)),
      hsExtrasFrancoFeriado: Number(hsExtrasFrancoFeriado.toFixed(2)),
      totalExtras: Number(totalExtras.toFixed(2)),

      diasConExceso: alertasDiarias.length,
      alertasDiarias,

      faltasInjustificadas,
      faltasJustificadas,
      presentismo: faltasInjustificadas === 0,

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
    'HS trabajadas',
    'FALTAS INJUSTIFICADAS',
    'LICENCIA ENFERMEDAD',
    'PRESENTISMO',
    'FERIADOS (hs)',
    'HS EXTRAS DÍA HÁBIL',
    'HS EXTRAS FRANCO/FERIADO',
  ];

  const rows = summaries.map((s, idx) => [
    (idx + 1).toString(),
    '', // Legajo - no tenemos
    s.userName,
    s.cuil || '-',
    s.localRole?.toUpperCase() || '-',
    s.hireDate || '-',
    '-', // Baja
    s.contractType,
    'Por hora',
    s.hsTrabajadasMes.toFixed(2),
    s.faltasInjustificadas.toString(),
    s.faltasJustificadas.toString(),
    s.presentismo ? 'SI' : 'NO',
    s.feriadosHs.toFixed(2),
    s.hsExtrasDiaHabil.toFixed(2),
    s.hsExtrasFrancoFeriado.toFixed(2),
  ]);

  const allRows = [headers, ...rows];
  return allRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export default useLaborHours;
