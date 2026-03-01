import { CheckCircle2 } from 'lucide-react';
import type { RosterRow } from './types';

interface Props {
  rows: RosterRow[];
  isToday: boolean;
}

export function RosterSummaryBar({ rows, isToday }: Props) {
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const late = statusCounts['late'] || 0;
  const absent = statusCounts['absent'] || 0;
  const pending = statusCounts['pending'] || 0;
  const unclosed = statusCounts['unclosed'] || 0;
  const off = rows.filter((r) => ['day_off', 'leave'].includes(r.status)).length;

  const scheduledShifts = rows.filter((r) => r.schedule && !r.schedule.is_day_off);
  const workShifts = scheduledShifts.length;
  const covered = scheduledShifts.filter((r) =>
    ['working', 'completed', 'late', 'unclosed'].includes(r.status),
  ).length;
  const allCovered = workShifts > 0 && covered === workShifts;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {allCovered ? (
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Equipo completo — {covered}/{workShifts} turnos cubiertos
        </span>
      ) : (
        <>
          {covered > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {covered}/{workShifts} presentes
            </span>
          )}
          {late > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {late} tarde{late !== 1 ? 's' : ''}
            </span>
          )}
          {absent > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {absent} ausente{absent !== 1 ? 's' : ''}
            </span>
          )}
          {unclosed > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              {unclosed} turno{unclosed !== 1 ? 's' : ''} no cerrado{unclosed !== 1 ? 's' : ''}
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1.5 text-sky-600">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              {pending} pendiente{pending !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
      {off > 0 && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {off} franco/licencia
        </span>
      )}
      {isToday && (
        <span className="text-xs text-muted-foreground ml-auto">Auto-refresh cada 30s</span>
      )}
    </div>
  );
}
