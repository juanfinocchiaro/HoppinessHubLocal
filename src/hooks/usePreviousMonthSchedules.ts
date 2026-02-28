/**
 * usePreviousMonthSchedules - Hook for copying schedules from previous month
 *
 * Phase 3 implementation:
 * - Takes the last complete week (Mon-Sun) of previous month as pattern
 * - Maps that week pattern to all weeks of current month
 * - Returns changes as pending (not saved automatically)
 */
import { useQuery } from '@tanstack/react-query';
import { fetchSchedulesByDateRange } from '@/services/schedulesService';
import {
  format,
  subMonths,
  endOfMonth,
  getDay,
  subDays,
} from 'date-fns';
import type { ScheduleValue } from '@/types/schedule';
interface SchedulePatternEntry {
  userId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  schedule: ScheduleValue;
}

interface CopyPreviousMonthResult {
  patterns: SchedulePatternEntry[];
  sourceWeekStart: Date;
  sourceWeekEnd: Date;
}

/**
 * Fetch the last complete week of the previous month as a pattern
 */
export function usePreviousMonthPattern(branchId: string | undefined, month: number, year: number) {
  const previousMonth = subMonths(new Date(year, month - 1, 1), 1);
  const prevMonth = previousMonth.getMonth() + 1;
  const prevYear = previousMonth.getFullYear();

  return useQuery({
    queryKey: ['previous-month-pattern', branchId, prevYear, prevMonth],
    queryFn: async () => {
      if (!branchId) return null;

      // Find the last complete week (Mon-Sun) of previous month
      const lastDayOfPrevMonth = endOfMonth(previousMonth);

      // Find the last Sunday of the month
      let lastSunday = lastDayOfPrevMonth;
      while (getDay(lastSunday) !== 0) {
        lastSunday = subDays(lastSunday, 1);
      }

      // The Monday of that week
      const lastMonday = subDays(lastSunday, 6);

      // If the week starts in the previous month (we want a complete week within the month)
      if (lastMonday.getMonth() !== previousMonth.getMonth()) {
        // Go back one more week
        const altSunday = subDays(lastSunday, 7);
        const altMonday = subDays(altSunday, 6);

        if (altMonday.getMonth() === previousMonth.getMonth()) {
          lastSunday = altSunday;
        }
      }

      // Final Monday
      const weekMonday = subDays(lastSunday, 6);

      const startDate = format(weekMonday, 'yyyy-MM-dd');
      const endDate = format(lastSunday, 'yyyy-MM-dd');

      const data = await fetchSchedulesByDateRange(branchId, startDate, endDate);

      // Build pattern map: userId -> dayOfWeek -> schedule
      const patterns: SchedulePatternEntry[] = [];

      (data || []).forEach((s) => {
        if (!s.user_id || !s.schedule_date) return;

        const scheduleDate = new Date(s.schedule_date);
        const dayOfWeek = getDay(scheduleDate);

        patterns.push({
          userId: s.user_id,
          dayOfWeek,
          schedule: {
            startTime: s.start_time || null,
            endTime: s.end_time || null,
            isDayOff: s.is_day_off || false,
            position: (s as any).work_position || null,
            breakStart: (s as any).break_start || null,
            breakEnd: (s as any).break_end || null,
          },
        });
      });

      return {
        patterns,
        sourceWeekStart: weekMonday,
        sourceWeekEnd: lastSunday,
      } as CopyPreviousMonthResult;
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Apply the previous month pattern to current month days
 * Returns an array of pending changes to be applied
 */
export function applyPatternToMonth(
  pattern: CopyPreviousMonthResult | null | undefined,
  currentMonthDays: Date[],
  teamMemberIds: string[],
  getTeamMemberName: (userId: string) => string,
): Array<{
  userId: string;
  userName: string;
  date: string;
  schedule: ScheduleValue;
}> {
  if (!pattern || !pattern.patterns.length) return [];

  const changes: Array<{
    userId: string;
    userName: string;
    date: string;
    schedule: ScheduleValue;
  }> = [];

  // Group patterns by userId and dayOfWeek for fast lookup
  const patternMap = new Map<string, Map<number, ScheduleValue>>();
  pattern.patterns.forEach((p) => {
    if (!patternMap.has(p.userId)) {
      patternMap.set(p.userId, new Map());
    }
    patternMap.get(p.userId)!.set(p.dayOfWeek, p.schedule);
  });

  // For each day in current month, apply the pattern
  currentMonthDays.forEach((day) => {
    const dayOfWeek = getDay(day);
    const dateStr = format(day, 'yyyy-MM-dd');

    teamMemberIds.forEach((userId) => {
      const userPatterns = patternMap.get(userId);
      if (!userPatterns) return;

      const schedule = userPatterns.get(dayOfWeek);
      if (!schedule) return;

      // Only copy if it's an actual schedule (has times or is day off)
      const hasContent = (schedule.startTime && schedule.endTime) || schedule.isDayOff;
      if (!hasContent) return;

      changes.push({
        userId,
        userName: getTeamMemberName(userId),
        date: dateStr,
        schedule,
      });
    });
  });

  return changes;
}
