import { differenceInMinutes, format } from 'date-fns';

export interface RawClockEntry {
  id: string;
  user_id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  schedule_id?: string | null;
  work_date?: string | null;
  is_manual?: boolean | null;
}

export interface ClockPair {
  date: string;
  clockIn: RawClockEntry | null;
  clockOut: RawClockEntry | null;
  minutesWorked: number;
  scheduleId: string | null;
  isManual: boolean;
}

export interface LaborConfig {
  dailyHoursLimit: number;
  monthlyHoursLimit: number;
  overtimeSurchargeWeekday: number;
  overtimeSurchargeHoliday: number;
  overtimeSurchargeDayOff: number;
  dayOffAlwaysOvertime: boolean;
  holidayAlwaysOvertime: boolean;
  presentismoEnabled: boolean;
  presentismoRule: 'zero_unjustified' | 'max_1_justified' | 'custom';
}

export interface AbsenceEntry {
  date: string;
  kind: 'justified' | 'unjustified';
}

export interface LaborSummary {
  hoursRegular: number;
  hoursHoliday: number;
  hoursDayOff: number;
  overtimeRegular: number;
  overtimeHolidayDayOff: number;
  totalOvertime: number;
  unjustifiedAbsences: number;
  justifiedAbsences: number;
  hasPresentismo: boolean;
  dailyAlerts: Array<{ date: string; hours: number; extraHours: number }>;
}

export type DayStatusType =
  | 'vacation'
  | 'day_off'
  | 'day_off_worked'
  | 'leave'
  | 'worked'
  | 'absent'
  | 'no_schedule';

export interface DayStatusResult {
  type: DayStatusType;
  hours: number;
  leaveTypeCode?: string;
  isPaid?: boolean;
  isOvertime?: boolean;
  wasConverted?: boolean;
}

interface ResolveDayStatusParams {
  dayDate: string;
  pairs: ClockPair[];
  schedule: { isDayOff: boolean; shiftHours: number } | null;
  leaveRequest:
    | {
        status: 'approved' | 'pending' | 'rejected';
        leaveTypeCode?: string | null;
        hoursGranted?: number | null;
        isPaid?: boolean;
        originalStatus?: string | null;
      }
    | null;
  vacationPeriod:
    | {
        status: 'approved' | 'requested' | 'rejected' | 'completed' | 'cancelled';
      }
    | null;
}

const DEFAULT_LABOR_CONFIG: LaborConfig = {
  dailyHoursLimit: 9,
  monthlyHoursLimit: 190,
  overtimeSurchargeWeekday: 50,
  overtimeSurchargeHoliday: 100,
  overtimeSurchargeDayOff: 50,
  dayOffAlwaysOvertime: true,
  holidayAlwaysOvertime: true,
  presentismoEnabled: true,
  presentismoRule: 'zero_unjustified',
};

export function normalizeLaborConfig(input: Partial<LaborConfig> | null | undefined): LaborConfig {
  return {
    ...DEFAULT_LABOR_CONFIG,
    ...(input ?? {}),
  };
}

export function calculateShiftHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  startTime2?: string | null,
  endTime2?: string | null,
): number {
  const block = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const minutes = endMin >= startMin ? endMin - startMin : 1440 - startMin + endMin;
    return minutes / 60;
  };
  const total = block(startTime, endTime) + block(startTime2, endTime2);
  return Math.round(total * 100) / 100;
}

export function calculateScheduledHours(
  schedules: Array<{
    is_day_off?: boolean | null;
    start_time?: string | null;
    end_time?: string | null;
    start_time_2?: string | null;
    end_time_2?: string | null;
  }>,
): number {
  const total = schedules.reduce((sum, s) => {
    if (s.is_day_off) return sum;
    return sum + calculateShiftHours(s.start_time, s.end_time, s.start_time_2, s.end_time_2);
  }, 0);
  return Math.round(total * 100) / 100;
}

export function pairClockEntries(
  entries: RawClockEntry[],
  options?: { includeInProgress?: boolean },
): ClockPair[] {
  const includeInProgress = options?.includeInProgress ?? true;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const hasScheduleIds = sorted.some((e) => !!e.schedule_id);
  const pairs: ClockPair[] = [];

  const toDateStr = (entry: RawClockEntry) =>
    entry.work_date ?? format(new Date(entry.created_at), 'yyyy-MM-dd');

  if (hasScheduleIds) {
    const bySchedule = new Map<string, RawClockEntry[]>();
    const unlinked: RawClockEntry[] = [];

    for (const e of sorted) {
      if (e.schedule_id) {
        const list = bySchedule.get(e.schedule_id) ?? [];
        list.push(e);
        bySchedule.set(e.schedule_id, list);
      } else {
        unlinked.push(e);
      }
    }

    for (const [scheduleId, group] of bySchedule) {
      let pendingIn: RawClockEntry | null = null;
      for (const e of group) {
        if (e.entry_type === 'clock_in') {
          if (pendingIn) {
            const mw = includeInProgress
              ? Math.max(0, differenceInMinutes(new Date(), new Date(pendingIn.created_at)))
              : 0;
            pairs.push({
              date: toDateStr(pendingIn),
              clockIn: pendingIn,
              clockOut: null,
              minutesWorked: mw,
              scheduleId,
              isManual: !!pendingIn.is_manual,
            });
          }
          pendingIn = e;
        } else if (e.entry_type === 'clock_out' && pendingIn) {
          pairs.push({
            date: toDateStr(pendingIn),
            clockIn: pendingIn,
            clockOut: e,
            minutesWorked: Math.max(0, differenceInMinutes(new Date(e.created_at), new Date(pendingIn.created_at))),
            scheduleId,
            isManual: !!pendingIn.is_manual || !!e.is_manual,
          });
          pendingIn = null;
        }
      }
      if (pendingIn) {
        const mw = includeInProgress
          ? Math.max(0, differenceInMinutes(new Date(), new Date(pendingIn.created_at)))
          : 0;
        pairs.push({
          date: toDateStr(pendingIn),
          clockIn: pendingIn,
          clockOut: null,
          minutesWorked: mw,
          scheduleId,
          isManual: !!pendingIn.is_manual,
        });
      }
    }

    pairs.push(...pairClockEntries(unlinked, { includeInProgress }));
    return pairs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  let pendingClockIn: RawClockEntry | null = null;
  for (const e of sorted) {
    if (e.entry_type === 'clock_in') {
      if (pendingClockIn) {
        const minutesWorked = includeInProgress
          ? Math.max(0, differenceInMinutes(new Date(), new Date(pendingClockIn.created_at)))
          : 0;
        pairs.push({
          date: toDateStr(pendingClockIn),
          clockIn: pendingClockIn,
          clockOut: null,
          minutesWorked,
          scheduleId: pendingClockIn.schedule_id ?? null,
          isManual: !!pendingClockIn.is_manual,
        });
      }
      pendingClockIn = e;
      continue;
    }

    if (e.entry_type === 'clock_out' && pendingClockIn) {
      pairs.push({
        date: toDateStr(pendingClockIn),
        clockIn: pendingClockIn,
        clockOut: e,
        minutesWorked: Math.max(
          0,
          differenceInMinutes(new Date(e.created_at), new Date(pendingClockIn.created_at)),
        ),
        scheduleId: pendingClockIn.schedule_id ?? null,
        isManual: !!pendingClockIn.is_manual || !!e.is_manual,
      });
      pendingClockIn = null;
    }
  }

  if (pendingClockIn) {
    const minutesWorked = includeInProgress
      ? Math.max(0, differenceInMinutes(new Date(), new Date(pendingClockIn.created_at)))
      : 0;
    pairs.push({
      date: toDateStr(pendingClockIn),
      clockIn: pendingClockIn,
      clockOut: null,
      minutesWorked,
      scheduleId: pendingClockIn.schedule_id ?? null,
      isManual: !!pendingClockIn.is_manual,
    });
  }

  return pairs;
}

export function resolveDayStatus(params: ResolveDayStatusParams): DayStatusResult {
  const { pairs, schedule, leaveRequest, vacationPeriod } = params;
  const totalHours = Math.round((pairs.reduce((acc, p) => acc + p.minutesWorked, 0) / 60) * 100) / 100;

  if (vacationPeriod?.status === 'approved') {
    return { type: 'vacation', hours: schedule?.shiftHours ?? 0, isPaid: true };
  }

  if (schedule?.isDayOff) {
    if (pairs.length > 0) return { type: 'day_off_worked', hours: totalHours, isOvertime: true };
    return { type: 'day_off', hours: 0 };
  }

  if (leaveRequest?.status === 'approved') {
    return {
      type: 'leave',
      leaveTypeCode: leaveRequest.leaveTypeCode ?? undefined,
      hours: leaveRequest.hoursGranted ?? schedule?.shiftHours ?? 0,
      isPaid: leaveRequest.isPaid ?? true,
      wasConverted: !!leaveRequest.originalStatus,
    };
  }

  if (pairs.length > 0) return { type: 'worked', hours: totalHours };

  if (schedule && !schedule.isDayOff) return { type: 'absent', hours: 0 };

  return { type: 'no_schedule', hours: 0 };
}

export function calculateLaborSummary(
  pairs: ClockPair[],
  holidays: Set<string>,
  daysOff: Set<string>,
  absences: AbsenceEntry[],
  configInput?: Partial<LaborConfig> | null,
): LaborSummary {
  const config = normalizeLaborConfig(configInput);
  const dailyMap = new Map<string, number>();
  for (const pair of pairs) {
    const hours = pair.minutesWorked / 60;
    dailyMap.set(pair.date, (dailyMap.get(pair.date) ?? 0) + hours);
  }

  let hoursHoliday = 0;
  let hoursDayOff = 0;
  let hoursRegular = 0;
  for (const [date, hours] of dailyMap) {
    if (holidays.has(date)) {
      hoursHoliday += hours;
    } else if (daysOff.has(date)) {
      hoursDayOff += hours;
    } else {
      hoursRegular += hours;
    }
  }

  const overtimeRegular = Math.max(0, hoursRegular - config.monthlyHoursLimit);
  const overtimeHoliday = config.holidayAlwaysOvertime ? hoursHoliday : 0;
  const overtimeDayOff = config.dayOffAlwaysOvertime ? hoursDayOff : 0;
  const overtimeHolidayDayOff = overtimeHoliday + overtimeDayOff;
  const totalOvertime = overtimeRegular + overtimeHolidayDayOff;

  const unjustifiedAbsences = absences.filter((a) => a.kind === 'unjustified').length;
  const justifiedAbsences = absences.filter((a) => a.kind === 'justified').length;
  const hasPresentismo = !config.presentismoEnabled
    ? true
    : config.presentismoRule === 'zero_unjustified'
      ? unjustifiedAbsences === 0
      : config.presentismoRule === 'max_1_justified'
        ? unjustifiedAbsences === 0 && justifiedAbsences <= 1
        : unjustifiedAbsences === 0;

  const dailyAlerts = [...dailyMap.entries()]
    .filter(([, hours]) => hours > config.dailyHoursLimit)
    .map(([date, hours]) => ({
      date,
      hours: Math.round(hours * 100) / 100,
      extraHours: Math.round((hours - config.dailyHoursLimit) * 100) / 100,
    }));

  return {
    hoursRegular: Math.round(hoursRegular * 100) / 100,
    hoursHoliday: Math.round(hoursHoliday * 100) / 100,
    hoursDayOff: Math.round(hoursDayOff * 100) / 100,
    overtimeRegular: Math.round(overtimeRegular * 100) / 100,
    overtimeHolidayDayOff: Math.round(overtimeHolidayDayOff * 100) / 100,
    totalOvertime: Math.round(totalOvertime * 100) / 100,
    unjustifiedAbsences,
    justifiedAbsences,
    hasPresentismo,
    dailyAlerts,
  };
}

