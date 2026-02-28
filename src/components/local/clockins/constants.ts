import type { RosterRowStatus } from './types';

export const STATUS_LABEL: Record<RosterRowStatus, string> = {
  absent: 'Ausente',
  late: 'Tarde',
  working: 'En el local',
  unclosed: 'Turno no cerrado',
  pending: 'Pendiente',
  completed: 'Completado',
  day_off: 'Franco',
  leave: 'Licencia',
  no_schedule: 'Sin turno',
};

export const STATUS_COLOR: Record<RosterRowStatus, string> = {
  absent: 'text-red-600',
  late: 'text-amber-600',
  working: 'text-emerald-600',
  unclosed: 'text-amber-700',
  pending: 'text-sky-600',
  completed: 'text-muted-foreground',
  day_off: 'text-muted-foreground',
  leave: 'text-purple-600',
  no_schedule: 'text-orange-600',
};

export const DOT_COLOR: Record<RosterRowStatus, string> = {
  absent: 'bg-red-500',
  late: 'bg-amber-500',
  working: 'bg-emerald-500',
  unclosed: 'bg-amber-600',
  pending: 'bg-sky-400',
  completed: 'bg-gray-400',
  day_off: 'bg-gray-300',
  leave: 'bg-purple-400',
  no_schedule: 'bg-orange-300',
};

export const GROUP_BG: Partial<Record<RosterRowStatus, string>> = {
  absent: 'bg-red-50/50 dark:bg-red-950/10',
  late: 'bg-amber-50/50 dark:bg-amber-950/10',
  working: 'bg-emerald-50/40 dark:bg-emerald-950/10',
  unclosed: 'bg-amber-50/40 dark:bg-amber-950/10',
};

export const STATUS_ORDER: Record<RosterRowStatus, number> = {
  absent: 0,
  late: 1,
  unclosed: 2,
  working: 3,
  pending: 4,
  completed: 5,
  day_off: 6,
  leave: 7,
  no_schedule: 8,
};

export interface WindowConfig {
  beforeMin: number;
  afterMin: number;
}

export const DEFAULT_WINDOW: WindowConfig = { beforeMin: 90, afterMin: 60 };
