import { differenceInMinutes, format } from 'date-fns';
import type {
  ClockEntry,
  DayRequest,
  RosterRow,
  RosterRowStatus,
  ScheduleInfo,
  SessionPair,
} from './types';
import { STATUS_ORDER, type WindowConfig, DEFAULT_WINDOW } from './constants';

// ── Time helpers ────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function circularForward(from: number, to: number): number {
  return ((to - from) % 1440 + 1440) % 1440;
}

function getDayRelation(dayDate: Date): 'past' | 'today' | 'future' {
  const d = new Date(dayDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d.getTime() > now.getTime()) return 'future';
  if (d.getTime() < now.getTime()) return 'past';
  return 'today';
}

// ── Public utilities (kept for backward compat) ─────────────────────

export function calcCaptureEnd(
  dayDate: Date,
  schedules: ScheduleInfo[],
  afterMin: number,
): Date {
  let maxOvernightEnd = 0;
  for (const s of schedules) {
    if (s.is_day_off || !s.start_time || !s.end_time) continue;
    const startMin = timeToMinutes(s.start_time);
    const endMin = timeToMinutes(s.end_time);
    if (endMin < startMin && endMin > maxOvernightEnd) {
      maxOvernightEnd = endMin;
    }
  }
  const nextDay = new Date(dayDate);
  nextDay.setHours(0, 0, 0, 0);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setMinutes(nextDay.getMinutes() + maxOvernightEnd + afterMin);
  return nextDay;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function scheduledDurationMinutes(schedule: ScheduleInfo | null): number {
  if (!schedule?.start_time || !schedule?.end_time) return 0;
  const start = timeToMinutes(schedule.start_time);
  const end = timeToMinutes(schedule.end_time);
  let total = end >= start ? end - start : 1440 - start + end;
  if (schedule.start_time_2 && schedule.end_time_2) {
    const start2 = timeToMinutes(schedule.start_time_2);
    const end2 = timeToMinutes(schedule.end_time_2);
    total += end2 >= start2 ? end2 - start2 : 1440 - start2 + end2;
  }
  return total;
}

// ── Split schedule expansion ────────────────────────────────────────

function expandSplitSchedules(schedules: ScheduleInfo[]): ScheduleInfo[] {
  const result: ScheduleInfo[] = [];
  for (const sched of schedules) {
    if (sched.start_time_2 && sched.end_time_2) {
      // Segment 1: original start/end
      result.push({
        ...sched,
        start_time_2: null,
        end_time_2: null,
        _virtualSegment: 1,
      });
      // Segment 2: start_time_2/end_time_2 become primary
      result.push({
        ...sched,
        start_time: sched.start_time_2,
        end_time: sched.end_time_2,
        start_time_2: null,
        end_time_2: null,
        _virtualSegment: 2,
      });
    } else {
      result.push(sched);
    }
  }
  return result;
}

// ── Session grouping by schedule_id ─────────────────────────────────

function groupEntriesBySchedule(
  entries: ClockEntry[],
  todaySchedules: ScheduleInfo[],
  _windowConfig: WindowConfig,
): {
  bySchedule: Map<number, ClockEntry[]>;
  unlinked: ClockEntry[];
} {
  // Build a map from schedule_id -> list of virtual schedule indices
  const schedIdxByOrigId = new Map<string, number[]>();
  for (let i = 0; i < todaySchedules.length; i++) {
    const s = todaySchedules[i];
    if (s.id) {
      const list = schedIdxByOrigId.get(s.id) ?? [];
      list.push(i);
      schedIdxByOrigId.set(s.id, list);
    }
  }

  const bySchedule = new Map<number, ClockEntry[]>();
  const unlinked: ClockEntry[] = [];

  for (const e of entries) {
    if (!e.schedule_id) {
      unlinked.push(e);
      continue;
    }

    const indices = schedIdxByOrigId.get(e.schedule_id);
    if (!indices || indices.length === 0) {
      // schedule_id points to a schedule NOT in today's list (overnight from another day).
      continue;
    }

    if (indices.length === 1) {
      // Single schedule (or single segment) — direct assign
      const list = bySchedule.get(indices[0]) ?? [];
      list.push(e);
      bySchedule.set(indices[0], list);
    } else {
      // Multiple virtual segments share same schedule_id — assign by time proximity
      const entryMin = new Date(e.created_at).getHours() * 60 + new Date(e.created_at).getMinutes();
      let bestIdx = indices[0];
      let bestDist = Infinity;
      for (const idx of indices) {
        const sched = todaySchedules[idx];
        if (!sched.start_time) continue;
        const startMin = timeToMinutes(sched.start_time);
        const endMin = sched.end_time ? timeToMinutes(sched.end_time) : startMin;
        // Distance to the schedule's time window
        const distToStart = Math.min(
          circularForward(startMin, entryMin),
          circularForward(entryMin, startMin),
        );
        const distToEnd = Math.min(
          circularForward(endMin, entryMin),
          circularForward(entryMin, endMin),
        );
        const dist = Math.min(distToStart, distToEnd);
        if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
      }
      const list = bySchedule.get(bestIdx) ?? [];
      list.push(e);
      bySchedule.set(bestIdx, list);
    }
  }

  return { bySchedule, unlinked };
}

function buildSessionsFromEntries(sorted: ClockEntry[]): SessionPair[] {
  const sessions: SessionPair[] = [];
  let i = 0;
  while (i < sorted.length) {
    const cur = sorted[i];
    if (cur.entry_type === 'clock_in') {
      const next = sorted[i + 1];
      if (next && next.entry_type === 'clock_out') {
        sessions.push({
          clockIn: cur,
          clockOut: next,
          durationMin: differenceInMinutes(new Date(next.created_at), new Date(cur.created_at)),
        });
        i += 2;
      } else {
        sessions.push({ clockIn: cur, clockOut: null, durationMin: null });
        i += 1;
      }
    } else {
      sessions.push({ clockIn: null, clockOut: cur, durationMin: null });
      i += 1;
    }
  }
  return sessions;
}

function calcTotalMinutes(sessions: SessionPair[], countOpen: boolean): number {
  return sessions.reduce((sum, s) => {
    if (s.durationMin != null) return sum + s.durationMin;
    if (countOpen && s.clockIn && !s.clockOut) {
      return sum + differenceInMinutes(new Date(), new Date(s.clockIn.created_at));
    }
    return sum;
  }, 0);
}

function firstEntryTime(sessions: SessionPair[]): string | null {
  for (const s of sessions) {
    if (s.clockIn) return format(new Date(s.clockIn.created_at), 'HH:mm');
  }
  return null;
}

function lastExitTime(sessions: SessionPair[]): string | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].clockOut) return format(new Date(sessions[i].clockOut!.created_at), 'HH:mm');
  }
  return null;
}

// ── Status resolution ───────────────────────────────────────────────

// Default late threshold — overridden by labor_config.late_tolerance_total_min when available
const DEFAULT_LATE_THRESHOLD = 15;

function resolveRowStatus(
  sessions: SessionPair[],
  schedule: ScheduleInfo | null,
  dayDate: Date,
  request: DayRequest | null,
  lateThreshold: number = DEFAULT_LATE_THRESHOLD,
): { status: RosterRowStatus; isLate: boolean; lateMinutes: number } {
  const hasSessions = sessions.length > 0;
  const lastSession = sessions[sessions.length - 1];
  const isCurrentlyIn = !!lastSession?.clockIn && !lastSession?.clockOut;
  const dayRelation = getDayRelation(dayDate);

  if (request) {
    return { status: hasSessions ? 'completed' : 'leave', isLate: false, lateMinutes: 0 };
  }

  if (!schedule) {
    if (!hasSessions) return { status: 'no_schedule', isLate: false, lateMinutes: 0 };
    const noSchedStatus: RosterRowStatus = isCurrentlyIn
      ? (dayRelation === 'past' ? 'unclosed' : 'working')
      : 'completed';
    return { status: noSchedStatus, isLate: false, lateMinutes: 0 };
  }

  if (schedule.is_day_off) {
    return { status: 'day_off', isLate: false, lateMinutes: 0 };
  }

  if (!hasSessions) {
    if (dayRelation === 'future') {
      return { status: 'pending', isLate: false, lateMinutes: 0 };
    }
    if (dayRelation === 'today' && schedule.start_time) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const schedMin = timeToMinutes(schedule.start_time);
      const timeSinceStart = circularForward(schedMin, nowMin);
      if (timeSinceStart >= 720) {
        return { status: 'pending', isLate: false, lateMinutes: 0 };
      }
    }
    return { status: 'absent', isLate: false, lateMinutes: 0 };
  }

  let isLate = false;
  let lateMinutes = 0;
  if (schedule.start_time) {
    const firstIn = sessions.find((s) => s.clockIn)?.clockIn;
    if (firstIn) {
      const actualMin =
        new Date(firstIn.created_at).getHours() * 60 +
        new Date(firstIn.created_at).getMinutes();
      const schedMin = timeToMinutes(schedule.start_time);
      const diff = circularForward(schedMin, actualMin);
      if (diff > lateThreshold && diff < 720) {
        isLate = true;
        lateMinutes = diff;
      }
    }
  }

  let status: RosterRowStatus;
  if (isCurrentlyIn) {
    status = dayRelation === 'past' ? 'unclosed' : 'working';
  } else {
    status = isLate ? 'late' : 'completed';
  }
  return { status, isLate, lateMinutes };
}

// ── Label helpers ───────────────────────────────────────────────────

const ANOMALY_LABELS: Record<string, string> = {
  auto_close: 'Salida cerrada automáticamente por el sistema',
  missing_exit: 'Falta registrar salida',
  missing_entry: 'Falta registrar entrada',
  duplicate: 'Fichaje duplicado',
  out_of_window: 'Fichaje fuera de ventana',
};

function extractRowMeta(sessions: SessionPair[]): { anomalyDetail: string | null; hasManualEntry: boolean } {
  let anomalyDetail: string | null = null;
  let hasManualEntry = false;

  for (const s of sessions) {
    for (const e of [s.clockIn, s.clockOut]) {
      if (!e) continue;
      if (e.is_manual) hasManualEntry = true;
      if (e.anomaly_type && !anomalyDetail) {
        const label = ANOMALY_LABELS[e.anomaly_type] ?? `Anomalía: ${e.anomaly_type}`;
        const time = format(new Date(e.created_at), 'HH:mm');
        anomalyDetail = `${label} (${time})`;
      }
    }
  }

  return { anomalyDetail, hasManualEntry };
}

function shiftLabel(schedule: ScheduleInfo | null, request: DayRequest | null): string {
  if (request) {
    const labels: Record<string, string> = {
      sick_leave: 'Licencia',
      day_off: 'Día libre',
      vacation: 'Vacaciones',
      other: 'Licencia',
    };
    return labels[request.requestType] || request.requestType;
  }
  if (!schedule) return '—';
  if (schedule.is_day_off) return 'Franco';
  if (schedule.start_time && schedule.end_time) {
    const t1 = `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`;
    if (schedule.start_time_2 && schedule.end_time_2) {
      return `${t1} / ${schedule.start_time_2.slice(0, 5)} - ${schedule.end_time_2.slice(0, 5)}`;
    }
    return t1;
  }
  return '—';
}

// ── Main roster builder (unified by schedule_id) ────────────────────

export function buildDayRoster(
  entries: ClockEntry[],
  scheduleMap: Map<string, ScheduleInfo[]>,
  staff: { userId: string; userName: string }[],
  requests: DayRequest[],
  dayDate: Date,
  _windowConfig: WindowConfig = DEFAULT_WINDOW,
  lateThreshold: number = DEFAULT_LATE_THRESHOLD,
): RosterRow[] {
  const countOpen = getDayRelation(dayDate) === 'today';

  const entriesByUser = new Map<string, ClockEntry[]>();
  for (const e of entries) {
    const list = entriesByUser.get(e.user_id) ?? [];
    list.push(e);
    entriesByUser.set(e.user_id, list);
  }

  const requestByUser = new Map<string, DayRequest>();
  for (const r of requests) requestByUser.set(r.userId, r);

  const allUserIds = new Set<string>();
  for (const s of staff) allUserIds.add(s.userId);
  for (const uid of entriesByUser.keys()) allUserIds.add(uid);
  for (const uid of scheduleMap.keys()) allUserIds.add(uid);

  const nameMap = new Map<string, string>();
  for (const s of staff) nameMap.set(s.userId, s.userName);
  for (const [uid, userEntries] of entriesByUser) {
    if (!nameMap.has(uid) && userEntries.length > 0) nameMap.set(uid, userEntries[0].user_name);
  }

  const rows: RosterRow[] = [];

  for (const userId of allUserIds) {
    const userEntries = entriesByUser.get(userId) ?? [];
    const schedules = scheduleMap.get(userId) ?? [];
    const request = requestByUser.get(userId) ?? null;
    const userName = nameMap.get(userId) || 'Usuario';

    if (schedules.length === 0 && userEntries.length === 0 && !request) continue;

    const sorted = [...userEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // Expand split schedules into virtual segments before matching
    const workSchedules = expandSplitSchedules(schedules.filter((s) => !s.is_day_off));

    const hasScheduleIds = sorted.some((e) => e.schedule_id);

    if (hasScheduleIds) {
      // ── New path: group by schedule_id ────────────────────────────
      const { bySchedule, unlinked } = groupEntriesBySchedule(sorted, workSchedules, _windowConfig);

      // Unlinked entries (schedule_id = null) -> try to rescue into empty schedules first
      if (unlinked.length > 0) {
        const sortedUnlinked = [...unlinked].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        const unlinkedSessions = buildSessionsFromEntries(sortedUnlinked);
        const realSessions = unlinkedSessions.filter((s) => s.clockIn !== null);

        // Rescue: try to assign unlinked sessions to empty schedules by time proximity
        const rescuedToSchedule = new Set<number>();
        const remainingUnlinked: SessionPair[] = [];

        for (const session of realSessions) {
          if (!session.clockIn) { remainingUnlinked.push(session); continue; }
          const refMin =
            new Date(session.clockIn.created_at).getHours() * 60 +
            new Date(session.clockIn.created_at).getMinutes();

          let bestIdx = -1;
          let bestDist = Infinity;
          for (let i = 0; i < workSchedules.length; i++) {
            const sched = workSchedules[i];
            if (!sched.start_time || !sched.end_time) continue;
            // Skip schedules that already have linked entries or were already rescued into
            const hasLinked = (bySchedule.get(i) ?? []).length > 0;
            if (hasLinked || rescuedToSchedule.has(i)) continue;

            const startMin = timeToMinutes(sched.start_time);
            const endMin = timeToMinutes(sched.end_time);
            const wStart = startMin - _windowConfig.beforeMin;
            const wEnd = endMin + _windowConfig.afterMin;
            if (!isInWindow(refMin, wStart, wEnd)) continue;

            const dist = Math.min(
              circularForward(startMin, refMin),
              circularForward(refMin, startMin),
            );
            if (dist < bestDist) { bestDist = dist; bestIdx = i; }
          }

          if (bestIdx >= 0) {
            // Rescue: attach this session's entries to the schedule
            const entries = [session.clockIn, session.clockOut].filter(Boolean) as ClockEntry[];
            const existing = bySchedule.get(bestIdx) ?? [];
            bySchedule.set(bestIdx, [...existing, ...entries]);
            rescuedToSchedule.add(bestIdx);
          } else {
            remainingUnlinked.push(session);
          }
        }

        // Only create "No programado" rows for truly unmatched sessions
        for (let si = 0; si < remainingUnlinked.length; si++) {
          const session = remainingUnlinked[si];
          const isOpen = !!session.clockIn && !session.clockOut;
          const status: RosterRowStatus = isOpen
            ? (getDayRelation(dayDate) === 'past' ? 'unclosed' : 'working')
            : 'completed';
          rows.push({
            rowKey: `${userId}-unlinked-${si}`,
            userId,
            userName,
            isSubRow: false,
            status,
            shiftLabel: 'No programado',
            entryTime: session.clockIn ? format(new Date(session.clockIn.created_at), 'HH:mm') : null,
            exitTime: session.clockOut ? format(new Date(session.clockOut.created_at), 'HH:mm') : null,
            totalMinutes: session.durationMin != null
              ? session.durationMin
              : (isOpen && session.clockIn
                ? differenceInMinutes(new Date(), new Date(session.clockIn.created_at))
                : 0),
            isLate: false,
            lateMinutes: 0,
            anomalies: [],
            sessions: [session],
            request: null,
            schedule: null,
            ...extractRowMeta([session]),
          });
        }
      }

      // Scheduled shifts – iterate work schedules and join linked entries
      let rowIdx = unlinked.length > 0 ? 1 : 0;
      for (let i = 0; i < workSchedules.length; i++) {
        const sched = workSchedules[i];
        const schedEntries = bySchedule.get(i) ?? [];
        const sessions = buildSessionsFromEntries(
          schedEntries.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          ),
        );
        const { status, isLate, lateMinutes } = resolveRowStatus(sessions, sched, dayDate, request, lateThreshold);

        const leaveWithoutClock = !!request && sessions.length === 0;
        rows.push({
          rowKey: `${userId}-${i}`,
          userId,
          userName,
          isSubRow: rowIdx > 0,
          status,
          shiftLabel: shiftLabel(sched, null),
          entryTime: firstEntryTime(sessions),
          exitTime: lastExitTime(sessions),
          totalMinutes: leaveWithoutClock
            ? scheduledDurationMinutes(sched)
            : calcTotalMinutes(sessions, countOpen),
          isLate,
          lateMinutes,
          anomalies: [],
          sessions,
          request,
          schedule: sched,
          ...extractRowMeta(sessions),
        });
        rowIdx++;
      }

      // Foreign-schedule entries (overnight from yesterday) are now filtered out
      // in groupEntriesBySchedule — they belong to their original day's view.
    } else {
      // ── Legacy fallback: no schedule_id on entries ────────────────
      const allSessions = buildSessionsFromEntries(sorted);

      if (workSchedules.length === 0) {
        const sched = schedules[0] ?? null;
        const { status, isLate, lateMinutes } = resolveRowStatus(
          allSessions,
          sched,
          dayDate,
          request,
          lateThreshold,
        );
        rows.push({
          rowKey: userId,
          userId,
          userName,
          isSubRow: false,
          status,
          shiftLabel: shiftLabel(sched, request),
          entryTime: firstEntryTime(allSessions),
          exitTime: lastExitTime(allSessions),
          totalMinutes: calcTotalMinutes(allSessions, countOpen),
          isLate,
          lateMinutes,
          anomalies: [],
          sessions: allSessions,
          request,
          schedule: sched,
          ...extractRowMeta(allSessions),
        });
        continue;
      }

      // Legacy: assign sessions to shifts by time proximity
      const legacyAssign = legacyAssignSessions(allSessions, workSchedules, _windowConfig);

      let rowIdx = 0;
      const realExtras = legacyAssign.unmatched.filter((s) => s.clockIn !== null);
      const rescuedExtras = new Set<SessionPair>();
      const rescueBeforeMin = _windowConfig.beforeMin + 60;

      // Rescue pass: if there is an open "No programado" session close to an empty shift,
      // attach it to that shift so the manager sees the likely intended assignment.
      for (const session of realExtras) {
        if (!session.clockIn || session.clockOut) continue;
        const refMin =
          new Date(session.clockIn.created_at).getHours() * 60 +
          new Date(session.clockIn.created_at).getMinutes();

        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < workSchedules.length; i++) {
          const sched = workSchedules[i];
          if (!sched.start_time || !sched.end_time) continue;
          if ((legacyAssign.matched.get(i) ?? []).length > 0) continue;

          const startMin = timeToMinutes(sched.start_time);
          const deltaToStart = ((startMin - refMin) % 1440 + 1440) % 1440;
          if (deltaToStart <= rescueBeforeMin && deltaToStart < bestDelta) {
            bestDelta = deltaToStart;
            bestIdx = i;
          }
        }

        if (bestIdx >= 0) {
          legacyAssign.matched.get(bestIdx)!.push(session);
          rescuedExtras.add(session);
        }
      }

      const unmatchedExtras = realExtras.filter((s) => !rescuedExtras.has(s));
      if (unmatchedExtras.length > 0) {
        for (let si = 0; si < unmatchedExtras.length; si++) {
          const session = unmatchedExtras[si];
          const isOpen = !!session.clockIn && !session.clockOut;
          rows.push({
            rowKey: `${userId}-extra-${si}`,
            userId,
            userName,
            isSubRow: rowIdx > 0,
            status: isOpen
              ? (getDayRelation(dayDate) === 'past' ? 'unclosed' : 'working')
              : 'completed',
            shiftLabel: 'No programado',
            entryTime: session.clockIn ? format(new Date(session.clockIn.created_at), 'HH:mm') : null,
            exitTime: session.clockOut ? format(new Date(session.clockOut.created_at), 'HH:mm') : null,
            totalMinutes: session.durationMin != null
              ? session.durationMin
              : (isOpen && countOpen && session.clockIn
                ? differenceInMinutes(new Date(), new Date(session.clockIn.created_at))
                : 0),
            isLate: false,
            lateMinutes: 0,
            anomalies: [],
            sessions: [session],
            request: null,
            schedule: null,
            ...extractRowMeta([session]),
          });
          rowIdx++;
        }
      }

      for (let i = 0; i < workSchedules.length; i++) {
        const sched = workSchedules[i];
        const shiftSessions = legacyAssign.matched.get(i) ?? [];
        const { status, isLate, lateMinutes } = resolveRowStatus(
          shiftSessions,
          sched,
          dayDate,
          request,
          lateThreshold,
        );
        const leaveWithoutClock = !!request && shiftSessions.length === 0;
        rows.push({
          rowKey: `${userId}-${i}`,
          userId,
          userName,
          isSubRow: rowIdx > 0,
          status,
          shiftLabel: shiftLabel(sched, null),
          entryTime: firstEntryTime(shiftSessions),
          exitTime: lastExitTime(shiftSessions),
          totalMinutes: leaveWithoutClock
            ? scheduledDurationMinutes(sched)
            : calcTotalMinutes(shiftSessions, countOpen),
          isLate,
          lateMinutes,
          anomalies: [],
          sessions: shiftSessions,
          request,
          schedule: sched,
          ...extractRowMeta(shiftSessions),
        });
        rowIdx++;
      }
    }
  }

  // Sort by status priority then name
  const groups = new Map<string, RosterRow[]>();
  const groupOrder: string[] = [];
  for (const row of rows) {
    if (!groups.has(row.userId)) {
      groups.set(row.userId, []);
      groupOrder.push(row.userId);
    }
    groups.get(row.userId)!.push(row);
  }

  const bestStatus = new Map<string, number>();
  for (const [uid, userRows] of groups) {
    bestStatus.set(uid, Math.min(...userRows.map((r) => STATUS_ORDER[r.status])));
  }

  groupOrder.sort((a, b) => {
    const so = bestStatus.get(a)! - bestStatus.get(b)!;
    if (so !== 0) return so;
    const nameA = groups.get(a)![0].userName;
    const nameB = groups.get(b)![0].userName;
    return nameA.localeCompare(nameB, 'es');
  });

  const result: RosterRow[] = [];
  for (const uid of groupOrder) {
    result.push(...groups.get(uid)!);
  }
  return result;
}

// ── Legacy window-based assignment (fallback for old entries) ────────

function isInWindow(refMin: number, windowStart: number, windowEnd: number): boolean {
  const ws = ((windowStart % 1440) + 1440) % 1440;
  const we = ((windowEnd % 1440) + 1440) % 1440;
  if (ws <= we) return refMin >= ws && refMin <= we;
  return refMin >= ws || refMin <= we;
}

function legacyAssignSessions(
  sessions: SessionPair[],
  schedules: ScheduleInfo[],
  config: WindowConfig,
): { matched: Map<number, SessionPair[]>; unmatched: SessionPair[] } {
  const matched = new Map<number, SessionPair[]>();
  for (let i = 0; i < schedules.length; i++) matched.set(i, []);
  const unmatched: SessionPair[] = [];

  for (const session of sessions) {
    if (!session.clockIn) {
      unmatched.push(session);
      continue;
    }
    const refMin =
      new Date(session.clockIn.created_at).getHours() * 60 +
      new Date(session.clockIn.created_at).getMinutes();

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < schedules.length; i++) {
      const sched = schedules[i];
      if (sched.is_day_off || !sched.start_time || !sched.end_time) continue;
      const startMin = timeToMinutes(sched.start_time);
      const endMin = timeToMinutes(sched.end_time);
      const windowStart = startMin - config.beforeMin;
      const windowEnd = endMin + config.afterMin;

      let inWin = isInWindow(refMin, windowStart, windowEnd);
      if (!inWin && sched.start_time_2 && sched.end_time_2) {
        const s2 = timeToMinutes(sched.start_time_2);
        const e2 = timeToMinutes(sched.end_time_2);
        inWin = isInWindow(refMin, s2 - config.beforeMin, e2 + config.afterMin);
      }
      if (!inWin) continue;
      const dist = Math.min(
        circularForward(startMin, refMin),
        circularForward(refMin, startMin),
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      matched.get(bestIdx)!.push(session);
    } else {
      unmatched.push(session);
    }
  }
  return { matched, unmatched };
}
