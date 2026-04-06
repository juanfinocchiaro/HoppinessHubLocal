import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import {
  fetchAbsences,
  fetchBranchSchedules,
  fetchClockEntries,
  fetchLaborUsersData,
  fetchSpecialDays,
} from '@/services/hrService';
import { fromUntyped } from '@/lib/supabase-helpers';
import {
  calculateLaborSummary,
  calculateScheduledHours,
  pairClockEntries,
  type AbsenceEntry,
  type ClockPair,
  type LaborSummary,
  normalizeLaborConfig,
} from '@/lib/timeEngine';

interface UseEmployeeTimeDataParams {
  branchId: string;
  year: number;
  month: number; // 0-indexed
  userId?: string;
}

export interface EmployeeTimeDataRow {
  userId: string;
  userName: string;
  localRole: string | null;
  scheduledHoursMonth: number;
  workedHoursMonth: number;
  currentSessionMinutes: number;
  clockPairs: ClockPair[];
  labor: LaborSummary;
  hasUnpairedEntries: boolean;
}

export function useEmployeeTimeData({ branchId, year, month, userId }: UseEmployeeTimeDataParams) {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  const startDate = format(monthStart, 'yyyy-MM-dd');
  const endDate = format(monthEnd, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['employee-time-data', branchId, year, month, userId ?? 'all'],
    enabled: !!branchId,
    queryFn: async () => {
      const [entries, holidays, schedules, absences, laborConfigRaw] = await Promise.all([
        fetchClockEntries(branchId, startDate, endDate),
        fetchSpecialDays(startDate, endDate),
        fetchBranchSchedules(branchId, startDate, endDate),
        fetchAbsences(branchId, startDate, endDate),
        (async () => {
          const { data } = await fromUntyped('labor_config')
            .select('*')
            .eq('branch_id', branchId)
            .maybeSingle();
          return data;
        })(),
      ]);
      const laborConfig = laborConfigRaw;

      const userIdsFromEntries = [...new Set(entries.map((e: any) => e.user_id as string))];
      const userIdsFromSchedules = [...new Set(schedules.map((s: any) => s.user_id as string))];
      const allUserIds: string[] = [...new Set([...userIdsFromEntries, ...userIdsFromSchedules])];
      const targetUserIds = userId ? allUserIds.filter((id) => id === userId) : allUserIds;
      const usersData = await fetchLaborUsersData(branchId, targetUserIds);

      return {
        entries,
        holidays: new Set(holidays),
        schedules,
        absences,
        usersData,
        laborConfig: normalizeLaborConfig(
          laborConfig
            ? {
                dailyHoursLimit: laborConfig.daily_hours_limit,
                monthlyHoursLimit: laborConfig.monthly_hours_limit,
                overtimeSurchargeWeekday: laborConfig.overtime_surcharge_weekday,
                overtimeSurchargeHoliday: laborConfig.overtime_surcharge_holiday,
                overtimeSurchargeDayOff: laborConfig.overtime_surcharge_day_off,
                dayOffAlwaysOvertime: laborConfig.day_off_always_overtime,
                holidayAlwaysOvertime: laborConfig.holiday_always_overtime,
                presentismoEnabled: laborConfig.presentismo_enabled,
                presentismoRule: laborConfig.presentismo_rule as
                  | 'zero_unjustified'
                  | 'max_1_justified'
                  | 'custom',
              }
            : null,
        ),
      };
    },
    staleTime: 60_000,
  });

  const rows = useMemo<EmployeeTimeDataRow[]>(() => {
    if (!query.data) return [];
    const { entries, holidays, schedules, absences, usersData, laborConfig } = query.data;

    const byUserEntries = new Map<string, any[]>();
    for (const e of entries) {
      const list = byUserEntries.get(e.user_id) ?? [];
      list.push(e);
      byUserEntries.set(e.user_id, list);
    }

    const byUserSchedules = new Map<string, any[]>();
    for (const s of schedules) {
      const list = byUserSchedules.get(s.user_id) ?? [];
      list.push(s);
      byUserSchedules.set(s.user_id, list);
    }

    const byUserAbsences = new Map<string, AbsenceEntry[]>();
    for (const a of absences) {
      const list = byUserAbsences.get(a.user_id) ?? [];
      list.push({
        date: a.request_date,
        kind: a.request_type === 'unjustified_absence' ? 'unjustified' : 'justified',
      });
      byUserAbsences.set(a.user_id, list);
    }

    return usersData.map((u: any) => {
      const userEntries = byUserEntries.get(u.user_id) ?? [];
      const pairs = pairClockEntries(userEntries as any, { includeInProgress: true });
      const scheduled = byUserSchedules.get(u.user_id) ?? [];
      const scheduledHoursMonth = calculateScheduledHours(scheduled as any);
      const workedHoursMonth = Math.round((pairs.reduce((acc, p) => acc + p.minutesWorked, 0) / 60) * 100) / 100;
      const latest = pairs[pairs.length - 1];
      const currentSessionMinutes = latest && latest.clockIn && !latest.clockOut ? latest.minutesWorked : 0;
      const dayOffSet = new Set(
        scheduled
          .filter((s: any) => s.is_day_off)
          .map((s: any) => s.schedule_date),
      );
      const labor = calculateLaborSummary(
        pairs,
        holidays,
        dayOffSet,
        byUserAbsences.get(u.user_id) ?? [],
        laborConfig,
      );

      return {
        userId: u.user_id,
        userName: u.full_name || 'Sin nombre',
        localRole: u.local_role ?? null,
        scheduledHoursMonth,
        workedHoursMonth,
        currentSessionMinutes,
        clockPairs: pairs,
        labor,
        hasUnpairedEntries: pairs.some((p) => !!p.clockIn && !p.clockOut),
      };
    });
  }, [query.data]);

  return {
    ...query,
    rows,
  };
}

