/**
 * Types for schedule multi-selection system
 */
import type { ScheduleValue } from '@/types/schedule';

export interface CellKey {
  userId: string;
  date: string; // yyyy-MM-dd
}

export type SelectionMode = 'single' | 'range' | 'multi';

export interface ClipboardDataV2 {
  type: 'cells';
  cells: Array<{
    dayOffset: number; // Days relative to anchor cell (horizontal)
    userOffset?: number; // User rows relative to anchor cell (vertical)
    schedule: ScheduleValue;
  }>;
  sourceInfo: string; // Human readable e.g. "3 celdas" or "19:00-02:00"
}

export interface ScheduleSelectionState {
  selectedCells: Set<string>; // "userId:date" format
  lastClickedCell: CellKey | null;
  clipboard: ClipboardDataV2 | null;
}

// Helper to create cell key string
export const cellKeyString = (userId: string, date: string) => `${userId}:${date}`;

// Helper to parse cell key string
export const parseCellKey = (key: string): CellKey => {
  const [userId, date] = key.split(':');
  return { userId, date };
};
