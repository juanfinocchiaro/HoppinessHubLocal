/**
 * useScheduleSelection - Excel-style multi-cell selection with drag, keyboard shortcuts,
 * copy/paste, and quick-apply actions.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cellKeyString, parseCellKey } from './types';
import {
  DEBUG,
  type CellIndices,
  type DragState,
  type UseScheduleSelectionOptions,
  findCellAtPoint,
  calculateRectSelection,
} from './scheduleUtils';
import { useScheduleActions } from './useScheduleActions';

export function useScheduleSelection({
  monthDays,
  teamMemberIds,
  getEffectiveValue,
  onCellChange,
  getTeamMemberName,
  enabled = true,
  teamDefaultPositions,
}: UseScheduleSelectionOptions) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastClickedCell, setLastClickedCell] = useState<{ userId: string; date: string } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef<DragState>({
    active: false,
    startCell: null,
    currentCell: null,
    pointerId: null,
  });
  const lastDetectedIdxRef = useRef<string | null>(null);
  const captureElementRef = useRef<HTMLElement | null>(null);

  // Delegate clipboard, actions, index maps, and selection helpers to useScheduleActions
  const {
    dateStrByDayIndex,
    cellToIndices,
    indicesToCell,
    clipboard,
    hasClipboard,
    handleCopy,
    handlePaste,
    clearClipboard,
    handleClearCells,
    handleApplyDayOff,
    handleApplyVacation,
    handleApplyBirthday,
    handleApplyWithOptions,
    handleApplyQuickSchedule,
    handleColumnSelect,
    handleRowSelect,
    isCellSelected,
    clearSelection,
  } = useScheduleActions({
    monthDays,
    teamMemberIds,
    selectedCells,
    setSelectedCells,
    getEffectiveValue,
    onCellChange,
    getTeamMemberName,
    enabled,
  });

  // ========== DRAG SELECTION ==========

  const updateDragSelection = useCallback(
    (endIndices: CellIndices) => {
      const startCell = dragStateRef.current.startCell;
      if (!startCell) return;

      const idxKey = `${endIndices.userIdx}:${endIndices.dayIdx}`;
      if (lastDetectedIdxRef.current === idxKey) return;

      if (DEBUG) {
        console.log('[Selection] updateDragSelection:', {
          start: `${startCell.userIdx}:${startCell.dayIdx}`,
          end: idxKey,
        });
      }

      lastDetectedIdxRef.current = idxKey;
      dragStateRef.current.currentCell = endIndices;

      const selection = calculateRectSelection(
        startCell,
        endIndices,
        teamMemberIds,
        dateStrByDayIndex,
      );
      setSelectedCells(selection);
    },
    [teamMemberIds, dateStrByDayIndex],
  );

  const releasePointerCapture = useCallback(() => {
    if (captureElementRef.current && dragStateRef.current.pointerId !== null) {
      try {
        captureElementRef.current.releasePointerCapture(dragStateRef.current.pointerId);
      } catch {
        // Pointer may already be released
      }
    }
  }, []);

  const resetDragState = useCallback(() => {
    dragStateRef.current = {
      active: false,
      startCell: null,
      currentCell: null,
      pointerId: null,
    };
    captureElementRef.current = null;
    lastDetectedIdxRef.current = null;
    setIsDragging(false);
  }, []);

  const cancelDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    if (DEBUG) console.log('[Selection] cancelDrag');

    releasePointerCapture();
    resetDragState();
    setSelectedCells(new Set());
  }, [releasePointerCapture, resetDragState]);

  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    if (DEBUG) console.log('[Selection] endDrag');

    releasePointerCapture();

    const finalIndices = dragStateRef.current.currentCell || dragStateRef.current.startCell;
    if (finalIndices) {
      const cell = indicesToCell(finalIndices);
      if (cell) setLastClickedCell(cell);
    }

    resetDragState();
  }, [indicesToCell, releasePointerCapture, resetDragState]);

  // ========== GLOBAL POINTER LISTENERS ==========

  useEffect(() => {
    if (!enabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.active) return;

      if ((e.buttons & 1) === 0) {
        if (DEBUG) console.log('[Selection] Button released during drag, ending');
        endDrag();
        return;
      }

      const foundCell = findCellAtPoint(e.clientX, e.clientY);
      if (foundCell) {
        const indices = cellToIndices({ userId: foundCell.userId, date: foundCell.dateStr });
        if (indices) updateDragSelection(indices);
      } else if (DEBUG) {
        console.log('[Selection] findCellAtPoint returned null at', e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      if (dragStateRef.current.active) endDrag();
    };

    const handleBlur = () => {
      if (dragStateRef.current.active) cancelDrag();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && dragStateRef.current.active) cancelDrag();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, endDrag, cancelDrag, updateDragSelection, cellToIndices]);

  // ========== KEYBOARD SHORTCUTS ==========

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (dragStateRef.current.active) cancelDrag();
        else if (selectedCells.size > 0) setSelectedCells(new Set());
        return;
      }

      if (selectedCells.size === 0) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleClearCells();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleApplyDayOff();
        return;
      }
      if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleApplyVacation();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    selectedCells,
    cancelDrag,
    handleCopy,
    handlePaste,
    handleClearCells,
    handleApplyDayOff,
    handleApplyVacation,
  ]);

  // ========== CELL EVENT HANDLERS ==========

  const handleDragStart = useCallback(
    (userId: string, date: string, e: React.PointerEvent | React.MouseEvent) => {
      if (!enabled || e.shiftKey || e.button !== 0) return;

      const indices = cellToIndices({ userId, date });
      if (!indices) return;

      if (DEBUG) console.log('[Selection] handleDragStart:', cellKeyString(userId, date));

      const target = e.currentTarget as HTMLElement;
      if ('setPointerCapture' in target && 'pointerId' in e) {
        try {
          target.setPointerCapture((e as React.PointerEvent).pointerId);
          captureElementRef.current = target;
        } catch (err) {
          if (DEBUG) console.log('[Selection] setPointerCapture failed:', err);
        }
      }

      dragStateRef.current = {
        active: true,
        startCell: indices,
        currentCell: indices,
        pointerId: 'pointerId' in e ? (e as React.PointerEvent).pointerId : null,
      };
      lastDetectedIdxRef.current = `${indices.userIdx}:${indices.dayIdx}`;
      setIsDragging(true);

      if (!e.ctrlKey && !e.metaKey) {
        setSelectedCells(new Set([cellKeyString(userId, date)]));
      }
    },
    [enabled, cellToIndices],
  );

  const handleCellEnter = useCallback(
    (userId: string, date: string) => {
      if (!dragStateRef.current.active || !dragStateRef.current.startCell) return;

      const indices = cellToIndices({ userId, date });
      if (indices) updateDragSelection(indices);
    },
    [updateDragSelection, cellToIndices],
  );

  const handleCellPointerUp = useCallback(
    (userId: string, date: string, e: React.PointerEvent | React.MouseEvent) => {
      if (!enabled) return;

      const wasActive = dragStateRef.current.active;
      const startCell = dragStateRef.current.startCell;
      const currentCell = dragStateRef.current.currentCell;

      const didMove =
        startCell &&
        currentCell &&
        (startCell.userIdx !== currentCell.userIdx || startCell.dayIdx !== currentCell.dayIdx);

      if (wasActive) endDrag();

      if ((e.ctrlKey || e.metaKey) && !didMove) {
        const cellKey = cellKeyString(userId, date);
        setSelectedCells((prev) => {
          const next = new Set(prev);
          if (next.has(cellKey)) next.delete(cellKey);
          else next.add(cellKey);
          return next;
        });
        setLastClickedCell({ userId, date });
      } else if (e.shiftKey && lastClickedCell && !wasActive) {
        const startIndices = cellToIndices(lastClickedCell);
        const endIndices = cellToIndices({ userId, date });
        if (startIndices && endIndices) {
          const selection = calculateRectSelection(
            startIndices,
            endIndices,
            teamMemberIds,
            dateStrByDayIndex,
          );
          setSelectedCells(selection);
          setLastClickedCell({ userId, date });
        }
      }
    },
    [enabled, lastClickedCell, endDrag, cellToIndices, teamMemberIds, dateStrByDayIndex],
  );

  const handleLostPointerCapture = useCallback(() => {
    if (dragStateRef.current.active) {
      if (DEBUG) console.log('[Selection] lostpointercapture, ending drag');
      endDrag();
    }
  }, [endDrag]);

  // Legacy handlers kept for compatibility
  const handleCellClick = useCallback(() => {}, []);
  const handleGridPointerMove = useCallback(() => {}, []);
  const handleCellPointerMove = useCallback(() => {}, []);

  // ========== FILL HANDLE ==========

  const canShowFillHandle = useMemo(() => {
    if (selectedCells.size !== 1) return false;
    const cellKey = Array.from(selectedCells)[0];
    const { userId, date } = parseCellKey(cellKey);
    const value = getEffectiveValue(userId, date);
    return !!(value.startTime && value.endTime) || value.isDayOff;
  }, [selectedCells, getEffectiveValue]);

  const fillHandleCell = useMemo(() => {
    if (!canShowFillHandle) return null;
    return parseCellKey(Array.from(selectedCells)[0]);
  }, [canShowFillHandle, selectedCells]);

  return {
    selectedCells,
    selectionCount: selectedCells.size,
    clipboard,
    hasSelection: selectedCells.size > 0,
    hasClipboard,
    isDragging,
    handleDragStart,
    handleCellEnter,
    handleCellPointerUp,
    handleCellClick,
    handleGridPointerMove,
    handleCellPointerMove,
    handleLostPointerCapture,
    handleColumnSelect,
    handleRowSelect,
    isCellSelected,
    handleCopy,
    handlePaste,
    handleClearCells,
    handleApplyDayOff,
    handleApplyVacation,
    handleApplyBirthday,
    handleApplyQuickSchedule,
    handleApplyWithOptions,
    clearSelection,
    clearClipboard,
    cancelDrag,
    canShowFillHandle,
    fillHandleCell,
  };
}
