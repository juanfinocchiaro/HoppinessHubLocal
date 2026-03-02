import { useMemo } from 'react';
import { Clock, TrendingUp, AlertTriangle, XCircle, UserX } from 'lucide-react';
import type { RosterRow } from './types';

interface DaySummaryStatsProps {
  rows: RosterRow[];
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
  if (diff <= 0) diff += 24 * 60; // overnight
  return diff;
}

export function DaySummaryStats({ rows }: DaySummaryStatsProps) {
  const stats = useMemo(() => {
    const activeStatuses = new Set(['completed', 'working', 'unclosed', 'late']);
    const activeRows = rows.filter((r) => !r.isSubRow && activeStatuses.has(r.status));

    const totalMinutes = activeRows.reduce((s, r) => s + r.totalMinutes, 0);

    let overtimeMinutes = 0;
    for (const r of activeRows) {
      const scheduled = getScheduledMinutes(r);
      if (scheduled && r.totalMinutes > scheduled) {
        overtimeMinutes += r.totalMinutes - scheduled;
      }
    }

    const mainRows = rows.filter((r) => !r.isSubRow);
    const lateRows = mainRows.filter((r) => r.isLate);
    const lateCount = lateRows.length;
    const lateTotalMin = lateRows.reduce((s, r) => s + r.lateMinutes, 0);

    const unclosedCount = mainRows.filter((r) => r.status === 'unclosed').length;
    const absentCount = mainRows.filter((r) => r.status === 'absent').length;

    return { totalMinutes, overtimeMinutes, lateCount, lateTotalMin, unclosedCount, absentCount };
  }, [rows]);

  const chips: { label: string; value: string; icon: React.ReactNode; className?: string }[] = [
    {
      label: 'Total',
      value: formatMinutes(stats.totalMinutes),
      icon: <Clock className="w-3.5 h-3.5" />,
    },
  ];

  if (stats.overtimeMinutes > 0) {
    chips.push({
      label: 'Extras',
      value: formatMinutes(stats.overtimeMinutes),
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    });
  }

  if (stats.lateCount > 0) {
    chips.push({
      label: 'Tardes',
      value: `${stats.lateCount} (${stats.lateTotalMin} min)`,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      className: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800',
    });
  }

  if (stats.unclosedCount > 0) {
    chips.push({
      label: 'No cerrados',
      value: String(stats.unclosedCount),
      icon: <XCircle className="w-3.5 h-3.5" />,
      className: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800',
    });
  }

  if (stats.absentCount > 0) {
    chips.push({
      label: 'Ausentes',
      value: String(stats.absentCount),
      icon: <UserX className="w-3.5 h-3.5" />,
      className: 'text-destructive bg-destructive/10 border-destructive/20',
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
            chip.className ?? 'text-foreground bg-muted/50 border-border'
          }`}
        >
          {chip.icon}
          <span className="text-muted-foreground">{chip.label}:</span>
          <span>{chip.value}</span>
        </div>
      ))}
    </div>
  );
}
