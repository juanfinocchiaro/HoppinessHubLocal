import { useQuery } from '@tanstack/react-query';
import {
  fetchClockEntriesRaw,
  fetchProfileNames,
  fetchDaySchedulesForClock,
  fetchDayRequests,
} from '@/services/hrService';
import { format } from 'date-fns';
import type { ClockEntry, DayRequest, ScheduleInfo } from '@/components/local/clockins/types';
import { DEFAULT_WINDOW, type WindowConfig } from '@/components/local/clockins/constants';

export function useClockEntries(
  branchId: string | undefined,
  date: Date,
  queryTag: string,
  refetchInterval?: number,
  _windowConfig: WindowConfig = DEFAULT_WINDOW,
) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['clock-entries-grouped', queryTag, branchId, dateStr],
    queryFn: async (): Promise<ClockEntry[]> => {
      const data = await fetchClockEntriesRaw(branchId!, dateStr);
      if (data.length === 0) return [];

      const userIds = [...new Set(data.map((e) => e.user_id))];
      const profileMap = await fetchProfileNames(userIds);

      return data.map((entry) => ({
        ...entry,
        entry_type: entry.entry_type as 'clock_in' | 'clock_out',
        created_at: entry.created_at!,
        user_name: profileMap.get(entry.user_id) || 'Usuario',
        isFromNextDay: false,
        schedule_id: entry.schedule_id ?? null,
        resolved_type: (entry.resolved_type ?? null) as ClockEntry['resolved_type'],
        anomaly_type: entry.anomaly_type ?? null,
      }));
    },
    enabled: !!branchId,
    refetchInterval,
  });
}

export function useDaySchedules(branchId: string | undefined, date: Date) {
  return useQuery({
    queryKey: ['day-schedules-for-clock', branchId, format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<Map<string, ScheduleInfo[]>> => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const rows = await fetchDaySchedulesForClock(branchId!, dateStr);

      const map = new Map<string, ScheduleInfo[]>();
      for (const row of rows) {
        const list = map.get(row.user_id) ?? [];
        list.push({
          id: row.id,
          start_time: row.start_time,
          end_time: row.end_time,
          start_time_2: (row as any).start_time_2 ?? null,
          end_time_2: (row as any).end_time_2 ?? null,
          is_day_off: row.is_day_off ?? false,
          position: (row as any).work_position ?? null,
        });
        map.set(row.user_id, list);
      }

      for (const [, schedules] of map) {
        schedules.sort((a, b) => {
          const aMin = a.start_time
            ? parseInt(a.start_time.split(':')[0], 10) * 60 +
              parseInt(a.start_time.split(':')[1], 10)
            : 0;
          const bMin = b.start_time
            ? parseInt(b.start_time.split(':')[0], 10) * 60 +
              parseInt(b.start_time.split(':')[1], 10)
            : 0;
          return aMin - bMin;
        });
      }

      return map;
    },
    enabled: !!branchId,
  });
}

export function useDayRequests(branchId: string | undefined, date: Date) {
  return useQuery({
    queryKey: ['day-requests-for-clock', branchId, format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<DayRequest[]> => {
      return fetchDayRequests(branchId!, format(date, 'yyyy-MM-dd'));
    },
    enabled: !!branchId,
  });
}
