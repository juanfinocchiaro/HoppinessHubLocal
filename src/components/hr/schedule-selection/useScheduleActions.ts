/**
 * useScheduleActions - Clipboard operations, cell actions, and index maps
 * for the schedule selection system.
 */
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { ScheduleValue } from '@/types/schedule';
import { cellKeyString, parseCellKey, type CellKey, type ClipboardDataV2 } from './types';
import {
  DEBUG,
  type CellIndices,
  EMPTY_SCHEDULE,
  DAY_OFF_SCHEDULE,
  VACATION_SCHEDULE,
  BIRTHDAY_SCHEDULE,
  buildSourceInfo,
  calculateBreakTimes,
} from './scheduleUtils';

interface UseScheduleActionsOptions {
  monthDays: Date[];
  teamMemberIds: string[];
  selectedCells: Set<string>;
  setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  getEffectiveValue: (userId: string, dateStr: string) => ScheduleValue;
  onCellChange: (userId: string, userName: string, dateStr: string, value: ScheduleValue) => void;
  getTeamMemberName: (userId: string) => string;
  enabled: boolean;
  teamDefaultPositions?: Map<string, string>;
}

export function useScheduleActions({
  monthDays,
  teamMemberIds,
  selectedCells,
  setSelectedCells,
  getEffectiveValue,
  onCellChange,
  getTeamMemberName,
  enabled,
}: UseScheduleActionsOptions) {
  const [clipboard, setClipboard] = useState<ClipboardDataV2 | null>(null);

  // ========== INDEX-BASED LOOKUP MAPS ==========

  const dayIndexByDateStr = useMemo(() => {
    const map = new Map<string, number>();
    monthDays.forEach((day, idx) => {
      map.set(format(day, 'yyyy-MM-dd'), idx);
    });
    return map;
  }, [monthDays]);

  const dateStrByDayIndex = useMemo(() => {
    return monthDays.map((day) => format(day, 'yyyy-MM-dd'));
  }, [monthDays]);

  const userIndexById = useMemo(() => {
    const map = new Map<string, number>();
    teamMemberIds.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map;
  }, [teamMemberIds]);

  const cellToIndices = useCallback(
    (cell: CellKey): CellIndices | null => {
      const userIdx = userIndexById.get(cell.userId);
      const dayIdx = dayIndexByDateStr.get(cell.date);
      if (userIdx === undefined || dayIdx === undefined) return null;
      return { userIdx, dayIdx };
    },
    [userIndexById, dayIndexByDateStr],
  );

  const indicesToCell = useCallback(
    (indices: CellIndices): CellKey | null => {
      const userId = teamMemberIds[indices.userIdx];
      const dateStr = dateStrByDayIndex[indices.dayIdx];
      if (!userId || !dateStr) return null;
      return { userId, date: dateStr };
    },
    [teamMemberIds, dateStrByDayIndex],
  );

  // ========== CLIPBOARD: COPY ==========

  const handleCopy = useCallback(() => {
    if (selectedCells.size === 0) return;

    const cellsArray = Array.from(selectedCells).map(parseCellKey);

    const cellsWithIndices = cellsArray
      .map((cell) => {
        const indices = cellToIndices(cell);
        return indices ? { cell, indices } : null;
      })
      .filter((x): x is { cell: CellKey; indices: CellIndices } => x !== null);

    if (cellsWithIndices.length === 0) return;

    cellsWithIndices.sort((a, b) => {
      if (a.indices.dayIdx !== b.indices.dayIdx) return a.indices.dayIdx - b.indices.dayIdx;
      return a.indices.userIdx - b.indices.userIdx;
    });

    const anchor = cellsWithIndices[0];

    if (DEBUG) {
      console.log('[Copy] anchor:', {
        dayIdx: anchor.indices.dayIdx,
        userIdx: anchor.indices.userIdx,
        date: anchor.cell.date,
      });
    }

    const copiedCells = cellsWithIndices.map(({ cell, indices }) => ({
      dayOffset: indices.dayIdx - anchor.indices.dayIdx,
      userOffset: indices.userIdx - anchor.indices.userIdx,
      schedule: getEffectiveValue(cell.userId, cell.date),
    }));

    const sourceInfo =
      selectedCells.size === 1
        ? buildSourceInfo(copiedCells[0].schedule)
        : `${selectedCells.size} celdas`;

    const clipboardData: ClipboardDataV2 = {
      type: 'cells',
      cells: copiedCells,
      sourceInfo,
    };

    setClipboard(clipboardData);
    toast.success(`📋 Copiado: ${sourceInfo}`);
  }, [selectedCells, getEffectiveValue, cellToIndices]);

  // ========== CLIPBOARD: PASTE ==========

  const handlePaste = useCallback(() => {
    if (!clipboard || selectedCells.size === 0) {
      if (!clipboard) toast.error('No hay nada en el portapapeles');
      return;
    }

    if (clipboard.cells.length === 1) {
      const schedule = clipboard.cells[0].schedule;
      const targetCells = Array.from(selectedCells).map(parseCellKey);

      targetCells.forEach((cell) => {
        const userName = getTeamMemberName(cell.userId);
        onCellChange(cell.userId, userName, cell.date, schedule);
      });

      toast.success(`✓ Pegado en ${targetCells.length} celda${targetCells.length > 1 ? 's' : ''}`);
      setSelectedCells(new Set());
      return;
    }

    const targetCellsArray = Array.from(selectedCells).map(parseCellKey);

    const targetsWithIndices = targetCellsArray
      .map((cell) => {
        const indices = cellToIndices(cell);
        return indices ? { cell, indices } : null;
      })
      .filter((x): x is { cell: CellKey; indices: CellIndices } => x !== null);

    if (targetsWithIndices.length === 0) return;

    targetsWithIndices.sort((a, b) => {
      if (a.indices.dayIdx !== b.indices.dayIdx) return a.indices.dayIdx - b.indices.dayIdx;
      return a.indices.userIdx - b.indices.userIdx;
    });

    const anchorTarget = targetsWithIndices[0];

    if (DEBUG) {
      console.log('[Paste] anchor target:', {
        dayIdx: anchorTarget.indices.dayIdx,
        userIdx: anchorTarget.indices.userIdx,
        date: anchorTarget.cell.date,
      });
    }

    let pastedCount = 0;

    clipboard.cells.forEach((copiedCell) => {
      const dayOffset = copiedCell.dayOffset;
      const userOffset = copiedCell.userOffset ?? 0;

      const targetDayIdx = anchorTarget.indices.dayIdx + dayOffset;
      const targetUserIdx = anchorTarget.indices.userIdx + userOffset;

      if (targetUserIdx < 0 || targetUserIdx >= teamMemberIds.length) return;
      if (targetDayIdx < 0 || targetDayIdx >= dateStrByDayIndex.length) return;

      const targetUserId = teamMemberIds[targetUserIdx];
      const targetDateStr = dateStrByDayIndex[targetDayIdx];

      if (!targetUserId || !targetDateStr) return;

      if (DEBUG) {
        console.log('[Paste] applying cell:', {
          dayOffset,
          userOffset,
          targetDayIdx,
          targetUserIdx,
          targetDate: targetDateStr,
        });
      }

      const userName = getTeamMemberName(targetUserId);
      onCellChange(targetUserId, userName, targetDateStr, copiedCell.schedule);
      pastedCount++;
    });

    toast.success(`✓ Pegado en ${pastedCount} celda${pastedCount > 1 ? 's' : ''}`);
    setSelectedCells(new Set());
  }, [
    clipboard,
    selectedCells,
    onCellChange,
    getTeamMemberName,
    teamMemberIds,
    dateStrByDayIndex,
    cellToIndices,
    setSelectedCells,
  ]);

  // ========== CELL ACTIONS ==========

  const handleClearCells = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);

    cells.forEach((cell) => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, EMPTY_SCHEDULE);
    });

    setSelectedCells(new Set());
    toast.info(
      `🗑️ ${cells.length} celda${cells.length > 1 ? 's' : ''} limpiada${cells.length > 1 ? 's' : ''}`,
    );
  }, [selectedCells, onCellChange, getTeamMemberName, setSelectedCells]);

  const handleApplyDayOff = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);

    cells.forEach((cell) => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, DAY_OFF_SCHEDULE);
    });

    toast.success(`✓ Franco aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  const handleApplyVacation = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);

    cells.forEach((cell) => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, VACATION_SCHEDULE);
    });

    toast.success(`🏖️ Vacaciones aplicadas a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  const handleApplyBirthday = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);

    cells.forEach((cell) => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, BIRTHDAY_SCHEDULE);
    });

    toast.success(`🎂 Cumple aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  const handleApplyWithOptions = useCallback(
    (
      startTime: string,
      endTime: string,
      position: string | null,
      includeBreak: boolean,
      startTime2?: string,
      endTime2?: string,
    ) => {
      if (selectedCells.size === 0) return;

      const cells = Array.from(selectedCells).map(parseCellKey);
      const hasSplitShift = startTime2 && endTime2;

      let breakStart: string | null = null;
      let breakEnd: string | null = null;

      if (!hasSplitShift && includeBreak && startTime && endTime) {
        ({ breakStart, breakEnd } = calculateBreakTimes(startTime, endTime));
      }

      const scheduleValue: ScheduleValue = {
        startTime,
        endTime,
        isDayOff: false,
        position,
        breakStart: hasSplitShift ? null : breakStart,
        breakEnd: hasSplitShift ? null : breakEnd,
        startTime2: hasSplitShift ? startTime2 : null,
        endTime2: hasSplitShift ? endTime2 : null,
      };

      cells.forEach((cell) => {
        const userName = getTeamMemberName(cell.userId);
        onCellChange(cell.userId, userName, cell.date, scheduleValue);
      });

      const posLabel = position ? ` (${position})` : '';
      const breakLabel = breakStart ? ' + break' : '';
      const splitLabel = hasSplitShift ? ` / ${startTime2}-${endTime2}` : '';
      toast.success(
        `✓ ${startTime}-${endTime}${splitLabel}${posLabel}${breakLabel} aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`,
      );
      setSelectedCells(new Set());
    },
    [selectedCells, onCellChange, getTeamMemberName, setSelectedCells],
  );

  const handleApplyQuickSchedule = useCallback(
    (startTime: string, endTime: string) => {
      handleApplyWithOptions(startTime, endTime, null, false);
    },
    [handleApplyWithOptions],
  );

  // ========== SELECTION HELPERS ==========

  const handleColumnSelect = useCallback(
    (date: string) => {
      if (!enabled) return;

      const newSelection = new Set<string>();
      teamMemberIds.forEach((userId) => {
        newSelection.add(cellKeyString(userId, date));
      });
      setSelectedCells(newSelection);
    },
    [enabled, teamMemberIds, setSelectedCells],
  );

  const handleRowSelect = useCallback(
    (userId: string) => {
      if (!enabled) return;

      const newSelection = new Set<string>();
      dateStrByDayIndex.forEach((dateStr) => {
        newSelection.add(cellKeyString(userId, dateStr));
      });
      setSelectedCells(newSelection);
    },
    [enabled, dateStrByDayIndex, setSelectedCells],
  );

  const isCellSelected = useCallback(
    (userId: string, date: string) => {
      return selectedCells.has(cellKeyString(userId, date));
    },
    [selectedCells],
  );

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, [setSelectedCells]);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
    toast.info('Portapapeles limpiado');
  }, []);

  return {
    // Index maps & conversions (needed by main hook for drag logic)
    dateStrByDayIndex,
    cellToIndices,
    indicesToCell,

    // Clipboard
    clipboard,
    hasClipboard: clipboard !== null,
    handleCopy,
    handlePaste,
    clearClipboard,

    // Cell actions
    handleClearCells,
    handleApplyDayOff,
    handleApplyVacation,
    handleApplyBirthday,
    handleApplyWithOptions,
    handleApplyQuickSchedule,

    // Selection helpers
    handleColumnSelect,
    handleRowSelect,
    isCellSelected,
    clearSelection,
  };
}
