import { useMemo } from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, UserX, TrendingUp } from 'lucide-react';
import type { RosterRow } from './types';

interface Props {
  rows: RosterRow[];
  isToday: boolean;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getScheduledMinutes(row: RosterRow): number | null {
  if (!row.schedule?.start_time || !row.schedule?.end_time) return null;
  const [sh, sm] = row.schedule.start_time.split(':').map(Number);
  const [eh, em] = row.schedule.end_time.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;

  if (row.schedule.start_time_2 && row.schedule.end_time_2) {
    const [sh2, sm2] = row.schedule.start_time_2.split(':').map(Number);
    const [eh2, em2] = row.schedule.end_time_2.split(':').map(Number);
    let diff2 = (eh2 * 60 + em2) - (sh2 * 60 + sm2);
    if (diff2 <= 0) diff2 += 24 * 60;
    diff += diff2;
  }

  return diff;
}

export function DayOverviewBar({ rows, isToday }: Props) {
  const stats = useMemo(() => {
    const mainRows = rows.filter((r) => !r.isSubRow);
    const activeStatuses = new Set(['completed', 'working', 'unclosed', 'late']);

    const scheduledShifts = mainRows.filter((r) => r.schedule && !r.schedule.is_day_off);
    const workShifts = scheduledShifts.length;
    const covered = scheduledShifts.filter((r) => activeStatuses.has(r.status)).length;
    const allCovered = workShifts > 0 && covered === workShifts;

    const activeRows = rows.filter((r) => !r.isSubRow && activeStatuses.has(r.status));
    const totalMinutes = activeRows.reduce((s, r) => s + r.totalMinutes, 0);

    let overtimeMinutes = 0;
    for (const r of activeRows) {
      const scheduled = getScheduledMinutes(r);
      if (scheduled && r.totalMinutes > scheduled) {
        overtimeMinutes += r.totalMinutes - scheduled;
      }
    }

    const lateRows = mainRows.filter((r) => r.isLate);
    const lateCount = lateRows.length;
    const lateTotalMin = lateRows.reduce((s, r) => s + r.lateMinutes, 0);

    const unclosedCount = mainRows.filter((r) => r.status === 'unclosed').length;
    const absentCount = mainRows.filter((r) => r.status === 'absent').length;
    const offCount = mainRows.filter((r) => r.status === 'day_off').length;
    const vacationCount = mainRows.filter((r) => r.status === 'vacation').length;
    const leaveCount = mainRows.filter((r) => r.status === 'leave').length;

    return {
      workShifts, covered, allCovered,
      totalMinutes, overtimeMinutes,
      lateCount, lateTotalMin,
      unclosedCount, absentCount, offCount, vacationCount, leaveCount,
    };
  }, [rows]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Coverage */}
      {stats.allCovered ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{stats.covered}/{stats.workShifts} cubiertos</span>
        </div>
      ) : stats.workShifts > 0 ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-foreground bg-muted/50 border-border">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{stats.covered}/{stats.workShifts} cubiertos</span>
        </div>
      ) : null}

      {/* Total hours */}
      {stats.totalMinutes > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-foreground bg-muted/50 border-border">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatMinutes(stats.totalMinutes)}</span>
        </div>
      )}

      {/* Overtime */}
      {stats.overtimeMinutes > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-foreground bg-muted/50 border-border">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-muted-foreground">No prog:</span>
          <span>{formatMinutes(stats.overtimeMinutes)}</span>
        </div>
      )}

      {/* Late */}
      {stats.lateCount > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{stats.lateCount} tarde{stats.lateCount !== 1 ? 's' : ''} ({stats.lateTotalMin}m)</span>
        </div>
      )}

      {/* Unclosed */}
      {stats.unclosedCount > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
          <XCircle className="w-3.5 h-3.5" />
          <span>{stats.unclosedCount} no cerrado{stats.unclosedCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Absent */}
      {stats.absentCount > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-destructive bg-destructive/10 border-destructive/20">
          <UserX className="w-3.5 h-3.5" />
          <span>{stats.absentCount} ausente{stats.absentCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Vacation */}
      {stats.vacationCount > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-800">
          <span>🏖️ {stats.vacationCount} vacaciones</span>
        </div>
      )}

      {/* Off/Leave */}
      {(stats.offCount > 0 || stats.leaveCount > 0) && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-muted-foreground bg-muted/50 border-border">
          <span>
            {stats.offCount > 0 && `${stats.offCount} franco${stats.offCount !== 1 ? 's' : ''}`}
            {stats.offCount > 0 && stats.leaveCount > 0 && ' · '}
            {stats.leaveCount > 0 && `${stats.leaveCount} licencia`}
          </span>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {isToday && (
        <span className="text-[11px] text-muted-foreground ml-auto">⟳ 30s</span>
      )}
    </div>
  );
}
