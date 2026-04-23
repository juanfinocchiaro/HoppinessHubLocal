import { describe, expect, it } from 'vitest';
import {
  calculateLaborSummary,
  calculateShiftHours,
  pairClockEntries,
  resolveDayStatus,
} from './timeEngine';

describe('timeEngine', () => {
  it('calculates overnight shift hours correctly', () => {
    expect(calculateShiftHours('18:00:00', '02:00:00')).toBe(8);
  });

  it('pairs schedule-linked entries first', () => {
    const pairs = pairClockEntries([
      {
        id: '1',
        user_id: 'u1',
        entry_type: 'clock_in',
        created_at: '2026-02-27T21:00:00.000Z',
        schedule_id: 's1',
        work_date: '2026-02-27',
      },
      {
        id: '2',
        user_id: 'u1',
        entry_type: 'clock_out',
        created_at: '2026-02-28T02:00:00.000Z',
        schedule_id: 's1',
        work_date: '2026-02-27',
      },
    ], { includeInProgress: false });

    expect(pairs).toHaveLength(1);
    expect(pairs[0].scheduleId).toBe('s1');
    expect(pairs[0].minutesWorked).toBeGreaterThan(0);
  });

  it('resolves day status precedence (vacation > day_off > leave > worked > absent)', () => {
    const vacation = resolveDayStatus({
      dayDate: '2026-03-01',
      pairs: [],
      schedule: { isDayOff: false, shiftHours: 8 },
      leaveRequest: null,
      vacationPeriod: { status: 'approved' },
    });
    expect(vacation.type).toBe('vacation');

    const absent = resolveDayStatus({
      dayDate: '2026-03-01',
      pairs: [],
      schedule: { isDayOff: false, shiftHours: 8 },
      leaveRequest: null,
      vacationPeriod: null,
    });
    expect(absent.type).toBe('absent');
  });

  it('calculates labor summary with configurable monthly limit', () => {
    const summary = calculateLaborSummary(
      [
        {
          date: '2026-03-01',
          clockIn: null,
          clockOut: null,
          minutesWorked: 600, // 10h
          scheduleId: null,
          isManual: false,
        },
      ],
      new Set<string>(),
      new Set<string>(),
      [],
      { monthlyHoursLimit: 8, dailyHoursLimit: 9 },
    );

    expect(summary.hoursRegular).toBe(10);
    expect(summary.overtimeRegular).toBe(2);
    expect(summary.dailyAlerts).toHaveLength(1);
  });
});

