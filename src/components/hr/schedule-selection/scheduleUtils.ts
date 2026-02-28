/**
 * Pure utility functions, types, and constants for schedule selection.
 */
import type { ScheduleValue } from '@/types/schedule';
import { cellKeyString } from './types';

export const DEBUG = false;

export interface CellIndices {
  userIdx: number;
  dayIdx: number;
}

export interface DragState {
  active: boolean;
  startCell: CellIndices | null;
  currentCell: CellIndices | null;
  pointerId: number | null;
}

export interface UseScheduleSelectionOptions {
  monthDays: Date[];
  teamMemberIds: string[];
  getEffectiveValue: (userId: string, dateStr: string) => ScheduleValue;
  onCellChange: (userId: string, userName: string, dateStr: string, value: ScheduleValue) => void;
  getTeamMemberName: (userId: string) => string;
  enabled?: boolean;
}

/**
 * Multi-point sampling to find a cell even when pointer is on border/gap.
 * Uses line scanning for better border detection.
 */
export function findCellAtPoint(x: number, y: number): { userId: string; dateStr: string } | null {
  const offsets = [
    [0, 0],
    [4, 0],
    [-4, 0],
    [8, 0],
    [-8, 0],
    [0, 4],
    [0, -4],
    [0, 8],
    [0, -8],
    [4, 4],
    [-4, -4],
    [4, -4],
    [-4, 4],
  ];

  for (const [dx, dy] of offsets) {
    const el = document.elementFromPoint(x + dx, y + dy);
    if (!el) continue;

    const cellEl = el.closest('[data-cell]') as HTMLElement | null;
    if (cellEl) {
      const cellData = cellEl.getAttribute('data-cell');
      if (cellData && cellData.includes(':')) {
        const colonIdx = cellData.indexOf(':');
        const userId = cellData.substring(0, colonIdx);
        const dateStr = cellData.substring(colonIdx + 1);
        if (userId && dateStr) {
          return { userId, dateStr };
        }
      }
    }
  }

  return null;
}

export const EMPTY_SCHEDULE: ScheduleValue = {
  startTime: null,
  endTime: null,
  isDayOff: false,
  position: null,
  breakStart: null,
  breakEnd: null,
};

export const DAY_OFF_SCHEDULE: ScheduleValue = {
  startTime: null,
  endTime: null,
  isDayOff: true,
  position: null,
  breakStart: null,
  breakEnd: null,
};

export const VACATION_SCHEDULE: ScheduleValue = {
  startTime: null,
  endTime: null,
  isDayOff: true,
  position: 'vacaciones',
  breakStart: null,
  breakEnd: null,
};

export const BIRTHDAY_SCHEDULE: ScheduleValue = {
  startTime: null,
  endTime: null,
  isDayOff: true,
  position: 'cumple',
  isBirthdayOff: true,
  breakStart: null,
  breakEnd: null,
};

export function buildSourceInfo(schedule: ScheduleValue): string {
  if (schedule.isDayOff) {
    if (schedule.position === 'vacaciones') return '🏖️ Vacaciones';
    if (schedule.position === 'cumple') return '🎂 Cumple';
    return 'Franco';
  }
  if (schedule.startTime && schedule.endTime) {
    let info = `${schedule.startTime.slice(0, 5)}-${schedule.endTime.slice(0, 5)}`;
    if (schedule.position) info += ` (${schedule.position})`;
    return info;
  }
  return 'Vacío';
}

export function calculateBreakTimes(
  startTime: string,
  endTime: string,
): { breakStart: string | null; breakEnd: string | null } {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let durationMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (durationMinutes < 0) durationMinutes += 24 * 60;

  if (durationMinutes >= 360) {
    const midpoint = startH * 60 + startM + Math.floor(durationMinutes / 2);
    const breakStartMinutes = midpoint - 15;
    const breakEndMinutes = midpoint + 15;

    const breakStartH = Math.floor(breakStartMinutes / 60) % 24;
    const breakStartMin = breakStartMinutes % 60;
    const breakEndH = Math.floor(breakEndMinutes / 60) % 24;
    const breakEndMin = breakEndMinutes % 60;

    return {
      breakStart: `${String(breakStartH).padStart(2, '0')}:${String(breakStartMin).padStart(2, '0')}`,
      breakEnd: `${String(breakEndH).padStart(2, '0')}:${String(breakEndMin).padStart(2, '0')}`,
    };
  }

  return { breakStart: null, breakEnd: null };
}

export function calculateRectSelection(
  start: CellIndices,
  end: CellIndices,
  teamMemberIds: string[],
  dateStrByDayIndex: string[],
): Set<string> {
  const selection = new Set<string>();

  const minUserIdx = Math.min(start.userIdx, end.userIdx);
  const maxUserIdx = Math.max(start.userIdx, end.userIdx);
  const minDayIdx = Math.min(start.dayIdx, end.dayIdx);
  const maxDayIdx = Math.max(start.dayIdx, end.dayIdx);

  for (let uIdx = minUserIdx; uIdx <= maxUserIdx; uIdx++) {
    const userId = teamMemberIds[uIdx];
    if (!userId) continue;

    for (let dIdx = minDayIdx; dIdx <= maxDayIdx; dIdx++) {
      const dateStr = dateStrByDayIndex[dIdx];
      if (!dateStr) continue;
      selection.add(cellKeyString(userId, dateStr));
    }
  }

  return selection;
}
