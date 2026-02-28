/**
 * ScheduleCellPopover - Schedule editing dialog (CONTROLLED VERSION)
 *
 * V3 (Feb 2026) - Changed to Dialog for better UX with dynamic cells:
 * - Works with double-click on any cell
 * - Automatic break for shifts over 6 hours
 * - Position selection
 * - Split shift (turno cortado) support
 */
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Coffee, Check, Calendar, Clock, Trash2, Plus } from 'lucide-react';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import type { WorkPositionType } from '@/types/workPosition';

export type { ScheduleValue } from '@/types/schedule';
import type { ScheduleValue } from '@/types/schedule';

interface ScheduleCellPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
  employeeName?: string;
  dateLabel?: string;
  /** Employee's default position to pre-populate */
  defaultPosition?: string | null;
  /** Whether this employee has their birthday in the current month */
  hasBirthdayThisMonth?: boolean;
  /** Whether this employee has already used their birthday day off this month */
  birthdayUsedThisMonth?: boolean;
  /** Anchor element for positioning */
  anchorRef?: React.RefObject<HTMLElement>;
}

// Helper to calculate shift duration in hours
function calculateShiftHours(start: string, end: string): number {
  if (!start || !end) return 0;

  const isUnconfigured =
    (start === '00:00' || start === '00:00:00') && (end === '00:00' || end === '00:00:00');
  if (isUnconfigured) return 0;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

// Calculate default break time (30 min, starting halfway through the shift)
function calculateDefaultBreak(
  start: string,
  end: string,
): { breakStart: string; breakEnd: string } {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const midpoint = startMinutes + (endMinutes - startMinutes) / 2;
  const breakStartMinutes = Math.floor(midpoint / 30) * 30;
  const breakEndMinutes = breakStartMinutes + 30;

  const formatTime = (minutes: number) => {
    const normalizedMinutes = minutes % (24 * 60);
    const h = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    breakStart: formatTime(breakStartMinutes),
    breakEnd: formatTime(breakEndMinutes),
  };
}

export function ScheduleCellPopover({
  open,
  onOpenChange,
  value,
  onChange,
  employeeName,
  dateLabel,
  defaultPosition,
  hasBirthdayThisMonth = false,
  birthdayUsedThisMonth = false,
}: ScheduleCellPopoverProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customStart, setCustomStart] = useState(value.startTime || '19:30');
  const [customEnd, setCustomEnd] = useState(value.endTime || '23:30');
  const [position, setPosition] = useState<string>(value.position || defaultPosition || '');
  const [breakStart, setBreakStart] = useState(value.breakStart || '');
  const [breakEnd, setBreakEnd] = useState(value.breakEnd || '');

  // Split shift (second time range)
  const [hasSplitShift, setHasSplitShift] = useState(!!value.startTime2 && !!value.endTime2);
  const [customStart2, setCustomStart2] = useState(value.startTime2 || '20:00');
  const [customEnd2, setCustomEnd2] = useState(value.endTime2 || '01:00');

  const { data: workPositions = [] } = useWorkPositions();

  const shiftHours = useMemo(
    () => calculateShiftHours(customStart, customEnd),
    [customStart, customEnd],
  );
  const shiftHours2 = useMemo(
    () => (hasSplitShift ? calculateShiftHours(customStart2, customEnd2) : 0),
    [customStart2, customEnd2, hasSplitShift],
  );
  const totalHours = shiftHours + shiftHours2;

  // Break only applies to continuous shifts (not split shifts)
  const requiresBreak = !hasSplitShift && shiftHours > 6;

  const hasExistingShift = value.startTime || value.endTime || value.isDayOff;

  useEffect(() => {
    if (requiresBreak && customStart && customEnd) {
      const defaultBreak = calculateDefaultBreak(customStart, customEnd);
      if (!breakStart || !breakEnd) {
        setBreakStart(defaultBreak.breakStart);
        setBreakEnd(defaultBreak.breakEnd);
      }
    }
  }, [requiresBreak, customStart, customEnd]);

  useEffect(() => {
    if (open) {
      setCustomStart(value.startTime || '19:30');
      setCustomEnd(value.endTime || '23:30');
      setPosition(value.position || defaultPosition || '');
      setBreakStart(value.breakStart || '');
      setBreakEnd(value.breakEnd || '');

      // Initialize split shift state
      const hasSecondShift =
        !!value.startTime2 &&
        !!value.endTime2 &&
        value.startTime2 !== '00:00' &&
        value.endTime2 !== '00:00';
      setHasSplitShift(hasSecondShift);
      setCustomStart2(value.startTime2 || '20:00');
      setCustomEnd2(value.endTime2 || '01:00');
    }
  }, [open, value, defaultPosition]);

  const handleDayOff = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: true,
      isBirthdayOff: false,
      position: null,
      breakStart: null,
      breakEnd: null,
    });
    onOpenChange(false);
  };

  const handleBirthdayOff = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: true,
      isBirthdayOff: true,
      position: 'cumple',
      breakStart: null,
      breakEnd: null,
    });
    onOpenChange(false);
  };

  const handleVacation = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: true,
      isBirthdayOff: false,
      position: 'vacaciones',
      breakStart: null,
      breakEnd: null,
    });
    onOpenChange(false);
  };

  const handleDeleteShift = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: false,
      position: null,
      breakStart: null,
      breakEnd: null,
    });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startTime: customStart,
        endTime: customEnd,
        isDayOff: false,
        position: (position || null) as WorkPositionType | null,
        breakStart: requiresBreak ? breakStart : null,
        breakEnd: requiresBreak ? breakEnd : null,
        startTime2: hasSplitShift ? customStart2 : null,
        endTime2: hasSplitShift ? customEnd2 : null,
      });
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-80 max-w-[95vw] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="bg-primary/5 border-b px-4 py-3">
            <DialogTitle className="text-sm font-semibold">{employeeName}</DialogTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3 h-3" />
              {dateLabel}
            </div>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {/* Quick actions: Day off, Vacation, and Birthday */}
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full h-9" onClick={handleDayOff}>
                Franco (día libre)
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-cyan-600 border-cyan-200 hover:bg-cyan-50 dark:text-cyan-400 dark:border-cyan-800 dark:hover:bg-cyan-950/50"
                onClick={handleVacation}
              >
                <span className="mr-2">🏖️</span>
                Vacaciones
              </Button>

              {hasBirthdayThisMonth && !birthdayUsedThisMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-pink-600 border-pink-200 hover:bg-pink-50 dark:text-pink-400 dark:border-pink-800 dark:hover:bg-pink-950/50"
                  onClick={handleBirthdayOff}
                >
                  <span className="mr-2">🎂</span>
                  Cumple (franco mensual)
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-popover px-2 text-xs text-muted-foreground">
                  o definir horario
                </span>
              </div>
            </div>

            {/* First shift time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {hasSplitShift ? 'Turno 1 - Entrada' : 'Entrada'}
                </Label>
                <Input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {hasSplitShift ? 'Turno 1 - Salida' : 'Salida'}
                </Label>
                <Input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Split shift toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium">Turno cortado (doble jornada)</span>
              </div>
              <Switch checked={hasSplitShift} onCheckedChange={setHasSplitShift} />
            </div>

            {/* Second shift time inputs (only when split shift is enabled) */}
            {hasSplitShift && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Turno 2 - Entrada
                  </Label>
                  <Input
                    type="time"
                    value={customStart2}
                    onChange={(e) => setCustomStart2(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Turno 2 - Salida
                  </Label>
                  <Input
                    type="time"
                    value={customEnd2}
                    onChange={(e) => setCustomEnd2(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Duration badge */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs font-medium">
                <Clock className="w-3 h-3" />
                {totalHours.toFixed(1)} horas
                {hasSplitShift && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({shiftHours.toFixed(1)} + {shiftHours2.toFixed(1)})
                  </span>
                )}
                {requiresBreak && <span className="text-primary"> · incluye break</span>}
              </span>
            </div>

            {/* Break section - only for continuous shifts */}
            {requiresBreak && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-2 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Coffee className="w-4 h-4" />
                  Break obligatorio (30 min)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Inicio</Label>
                    <Input
                      type="time"
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Fin</Label>
                    <Input
                      type="time"
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Position selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Posición</Label>
              <Select
                value={position || 'none'}
                onValueChange={(v) => setPosition(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin posición asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin posición</SelectItem>
                  {workPositions.map((pos) => (
                    <SelectItem key={pos.key} value={pos.key}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply button */}
            <Button className="w-full h-10" onClick={handleCustomApply}>
              <Check className="w-4 h-4 mr-2" />
              Aplicar horario
            </Button>

            {/* Delete shift */}
            {hasExistingShift && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed" />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar turno
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar turno de {employeeName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el turno asignado para el {dateLabel}. El cambio quedará
              pendiente hasta que guardes los horarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShift}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
