/**
 * InlineScheduleEditor - Unified Excel-like schedule with tabs for Personas/Cobertura
 *
 * V2 (Feb 2026) - Excel-style paradigm:
 * - Click = Select cell
 * - Shift+Click = Range select
 * - Ctrl+Click = Toggle cell in selection
 * - Click-drag = Rectangular range select
 * - Double-click = Open edit popover
 * - Toolbar with inline time inputs
 *
 * Features:
 * - Two views: Personas (schedule editing) and Cobertura (hourly heatmap)
 * - Single scrollable container shared between tabs
 * - Sticky left column and sticky header
 * - Multi-cell selection with keyboard shortcuts (Ctrl+C/V, Delete, F, Escape)
 * - Week copy/paste functionality for faster schedule entry
 */
import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  upsertSchedulesBatch,
  deleteScheduleEntriesBatch,
} from '@/services/schedulesService';
import { fetchEmployeeBirthdays } from '@/services/hrService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Save,
  Undo2,
  AlertCircle,
  Coffee,
  Utensils,
  CreditCard,
  Flame,
  Package,
  Users,
  BarChart3,
  Copy,
  Calendar,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTeamData } from '@/components/local/team/useTeamData';
import { useHolidays } from '@/hooks/useHolidays';
import { useMonthlySchedules, type ScheduleEntry } from '@/hooks/useSchedules';
import { sendBulkScheduleNotifications } from '@/hooks/useScheduleNotifications';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { useAuth } from '@/hooks/useAuth';
import type { ScheduleValue } from '@/types/schedule';
import { SaveScheduleDialog } from './SaveScheduleDialog';
import { useScheduleSelection, SelectionToolbar } from './schedule-selection';
import { usePreviousMonthPattern, applyPatternToMonth } from '@/hooks/usePreviousMonthSchedules';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import type { WorkPositionType } from '@/types/workPosition';

interface InlineScheduleEditorProps {
  branchId: string;
  readOnly?: boolean;
}

interface PendingChange {
  userId: string;
  userName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  position: WorkPositionType | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  // Split shift support
  startTime2?: string | null;
  endTime2?: string | null;
  originalValue: ScheduleEntry | null;
}

// Position icons mapping
const POSITION_ICONS: Record<
  string,
  { icon: React.ComponentType<any>; color: string; label: string }
> = {
  sandwichero: { icon: Flame, color: 'text-orange-500', label: 'Sandwichero' },
  cajero: { icon: CreditCard, color: 'text-blue-500', label: 'Cajero' },
  delivery: { icon: Package, color: 'text-green-500', label: 'Delivery' },
  limpieza: { icon: Utensils, color: 'text-purple-500', label: 'Limpieza' },
};

// Role priority for sorting (lower = higher priority = displayed first)
const ROLE_PRIORITY: Record<string, number> = {
  encargado: 1,
  cajero: 2,
  empleado: 3,
};

const changeKey = (userId: string, date: string) => `${userId}:${date}`;

const DAY_WIDTH = 80;
const EMPLOYEE_COL_WIDTH = 160;
const SCHEDULE_ROW_HEIGHT = 56;
const COVERAGE_ROW_HEIGHT = 32;

// Calculate hours for a schedule entry
const calculateShiftHours = (
  startTime: string | null,
  endTime: string | null,
  startTime2?: string | null,
  endTime2?: string | null,
): number => {
  if (!startTime || !endTime) return 0;

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  let total = 0;

  // First shift
  const start1 = parseTime(startTime);
  const end1 = parseTime(endTime);
  if (end1 > start1) {
    total += end1 - start1;
  } else if (end1 < start1) {
    // Overnight shift
    total += 24 * 60 - start1 + end1;
  }

  // Second shift (split shift)
  if (startTime2 && endTime2) {
    const start2 = parseTime(startTime2);
    const end2 = parseTime(endTime2);
    if (end2 > start2) {
      total += end2 - start2;
    } else if (end2 < start2) {
      total += 24 * 60 - start2 + end2;
    }
  }

  return total / 60; // Return in hours
};

type ViewType = 'personas' | 'cobertura';
type HourRangeType = 'all' | '12-00' | '18-00';

export default function InlineScheduleEditor({
  branchId,
  readOnly: propReadOnly,
}: InlineScheduleEditorProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('personas');
  const [hourRange, setHourRange] = useState<HourRangeType>('all');
  const [copyMonthDialogOpen, setCopyMonthDialogOpen] = useState(false);

  // Work positions for toolbar
  const { data: workPositions = [] } = useWorkPositions();

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { local } = useDynamicPermissions(branchId);
  const canManageSchedules = !propReadOnly && local.canEditSchedules;

  // Fetch data
  const { team: rawTeam, loading: loadingTeam } = useTeamData(branchId, { excludeOwners: true });
  const { data: holidays = [] } = useHolidays(month, year);
  const {
    data: schedules = [],
    isLoading: loadingSchedules,
    refetch,
  } = useMonthlySchedules(branchId, month, year);

  // Phase 3: Previous month pattern
  const { data: previousMonthPattern } = usePreviousMonthPattern(branchId, month, year);

  // Sort team hierarchically by role
  const team = useMemo(() => {
    return [...rawTeam]
      .filter((m) => m.local_role !== 'contador_local')
      .sort((a, b) => {
        const roleA = a.local_role || 'empleado';
        const roleB = b.local_role || 'empleado';
        const priorityA = ROLE_PRIORITY[roleA] ?? 99;
        const priorityB = ROLE_PRIORITY[roleB] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
  }, [rawTeam]);

  useQuery({
    queryKey: ['employee-birthdays', branchId],
    queryFn: () => fetchEmployeeBirthdays(branchId),
    enabled: !!branchId,
  });

  // Generate days of the month
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [month, year]);

  // Team member IDs array for selection
  const teamMemberIds = useMemo(() => team.map((m) => m.id), [team]);

  // Team member name lookup
  const getTeamMemberName = useCallback(
    (userId: string) => {
      return team.find((m) => m.id === userId)?.full_name || 'Empleado';
    },
    [team],
  );

  // Holiday dates set
  const holidayDates = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach((h) => map.set(h.day_date, h.description));
    return map;
  }, [holidays]);

  // Group schedules by user
  const schedulesByUser = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleEntry>>();
    schedules.forEach((s) => {
      if (!s.user_id || !s.schedule_date) return;
      if (!map.has(s.user_id)) {
        map.set(s.user_id, new Map());
      }
      map.get(s.user_id)!.set(s.schedule_date, s);
    });
    return map;
  }, [schedules]);

  // Get effective value
  const getEffectiveValue = useCallback(
    (userId: string, dateStr: string): ScheduleValue => {
      const key = changeKey(userId, dateStr);
      const pending = pendingChanges.get(key);
      if (pending) {
        return {
          startTime: pending.startTime,
          endTime: pending.endTime,
          isDayOff: pending.isDayOff,
          position: pending.position,
          breakStart: pending.breakStart,
          breakEnd: pending.breakEnd,
          startTime2: pending.startTime2,
          endTime2: pending.endTime2,
        };
      }

      const schedule = schedulesByUser.get(userId)?.get(dateStr);
      if (schedule) {
        return {
          startTime: schedule.start_time || null,
          endTime: schedule.end_time || null,
          isDayOff: schedule.is_day_off || false,
          position: (schedule as any).work_position || null,
          breakStart: (schedule as any).break_start || null,
          breakEnd: (schedule as any).break_end || null,
          startTime2: (schedule as any).start_time_2 || null,
          endTime2: (schedule as any).end_time_2 || null,
        };
      }

      return { startTime: null, endTime: null, isDayOff: false, position: null };
    },
    [pendingChanges, schedulesByUser],
  );

  // Check if cell has pending changes
  const hasPendingChange = useCallback(
    (userId: string, dateStr: string) => {
      return pendingChanges.has(changeKey(userId, dateStr));
    },
    [pendingChanges],
  );

  // Handle cell change
  const handleCellChange = useCallback(
    (userId: string, userName: string, dateStr: string, value: ScheduleValue) => {
      const key = changeKey(userId, dateStr);
      const originalSchedule = schedulesByUser.get(userId)?.get(dateStr) || null;

      const isSameAsOriginal =
        (originalSchedule?.start_time || null) === value.startTime &&
        (originalSchedule?.end_time || null) === value.endTime &&
        (originalSchedule?.is_day_off || false) === value.isDayOff &&
        ((originalSchedule as any)?.work_position || null) === value.position &&
        ((originalSchedule as any)?.start_time_2 || null) === value.startTime2 &&
        ((originalSchedule as any)?.end_time_2 || null) === value.endTime2;

      if (isSameAsOriginal) {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          next.set(key, {
            userId,
            userName,
            date: dateStr,
            startTime: value.startTime,
            endTime: value.endTime,
            isDayOff: value.isDayOff,
            position: value.position,
            breakStart: value.breakStart,
            breakEnd: value.breakEnd,
            startTime2: value.startTime2,
            endTime2: value.endTime2,
            originalValue: originalSchedule,
          });
          return next;
        });
      }
    },
    [schedulesByUser],
  );

  // Selection system
  const selection = useScheduleSelection({
    monthDays,
    teamMemberIds,
    getEffectiveValue,
    onCellChange: handleCellChange,
    getTeamMemberName,
    enabled: canManageSchedules && activeView === 'personas',
  });

  // Discard changes
  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    selection.clearSelection();
    toast.info('Cambios descartados');
  };

  // Save mutation - uses BATCH UPSERT for efficiency and reliability
  const saveMutation = useMutation({
    mutationFn: async (_: {
      notifyEmail: boolean;
      notifyCommunication: boolean;
    }) => {
      const recordsToUpsert: Array<{
        user_id: string;
        employee_id: string;
        branch_id: string;
        schedule_date: string;
        schedule_month: number;
        schedule_year: number;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_day_off: boolean;
        work_position: WorkPositionType | null;
        shift_number: number;
        published_at: string;
        published_by: string | null;
        start_time_2: string | null;
        end_time_2: string | null;
      }> = [];

      const recordsToDelete: Array<{ userId: string; date: string }> = [];
      const now = new Date().toISOString();

      // Process all pending changes into batch arrays
      pendingChanges.forEach((change) => {
        const hasValidSchedule = change.startTime || change.isDayOff;

        // Calculate day_of_week using the month's local date reference (avoids UTC issues)
        const dayDate = monthDays.find((d) => format(d, 'yyyy-MM-dd') === change.date);
        const dayOfWeek = dayDate ? dayDate.getDay() : 0;

        if (hasValidSchedule) {
          recordsToUpsert.push({
            user_id: change.userId,
            employee_id: change.userId,
            branch_id: branchId,
            schedule_date: change.date,
            schedule_month: month,
            schedule_year: year,
            day_of_week: dayOfWeek,
            start_time: change.isDayOff ? '00:00' : change.startTime || '00:00',
            end_time: change.isDayOff ? '00:00' : change.endTime || '00:00',
            is_day_off: change.isDayOff,
            work_position: change.position,
            shift_number: 1,
            published_at: now,
            published_by: currentUserId,
            start_time_2: change.startTime2 || null,
            end_time_2: change.endTime2 || null,
          });
        } else {
          recordsToDelete.push({ userId: change.userId, date: change.date });
        }
      });

      if (recordsToUpsert.length > 0) {
        await upsertSchedulesBatch(recordsToUpsert);
      }

      if (recordsToDelete.length > 0) {
        await deleteScheduleEntriesBatch(
          recordsToDelete.map((record) => ({ ...record, branchId })),
        );
      }
    },
    onSuccess: async (_, { notifyEmail, notifyCommunication }) => {
      if ((notifyEmail || notifyCommunication) && affectedEmployees.length > 0) {
        await sendBulkScheduleNotifications(
          affectedEmployees.map((e) => ({ id: e.id, name: e.name })),
          {
            branch_id: branchId,
            month,
            year,
            is_modification: false,
            notify_email: notifyEmail,
            notify_communication: notifyCommunication,
            sender_id: currentUserId || '',
          },
        );
      }

      setPendingChanges(new Map());
      setSaveDialogOpen(false);
      selection.clearSelection();

      queryClient.invalidateQueries({ queryKey: ['monthly-schedules', branchId] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules-v2'] });
      queryClient.invalidateQueries({ queryKey: ['employee-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['has-published-schedule'] });

      refetch();
      toast.success('Horarios publicados');
    },
    onError: (error: unknown) => {
      if (import.meta.env.DEV) console.error('Save schedule error:', error);

      let message = 'Error desconocido';
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        if (typeof errObj.message === 'string') {
          message = errObj.message;
        } else if (typeof errObj.error_description === 'string') {
          message = errObj.error_description;
        } else if (typeof errObj.details === 'string') {
          message = errObj.details;
        } else {
          try {
            message = JSON.stringify(error);
          } catch {
            message = 'Error al procesar la respuesta';
          }
        }
      }

      toast.error('Error al guardar: ' + message);
    },
  });

  // Affected employees
  const affectedEmployees = useMemo(() => {
    const byUser = new Map<string, { name: string; count: number }>();
    pendingChanges.forEach((change) => {
      const existing = byUser.get(change.userId) || { name: change.userName, count: 0 };
      existing.count += 1;
      byUser.set(change.userId, existing);
    });
    return Array.from(byUser.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      changesCount: data.count,
    }));
  }, [pendingChanges]);

  // Month navigation
  const goToPrevMonth = () => {
    const prev = subMonths(new Date(year, month - 1), 1);
    setMonth(prev.getMonth() + 1);
    setYear(prev.getFullYear());
    setPendingChanges(new Map());
    selection.clearSelection();
  };

  const goToNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    setPendingChanges(new Map());
    selection.clearSelection();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const loading = loadingTeam || loadingSchedules;

  // Schedules with pending changes for coverage
  const schedulesWithPending = useMemo(() => {
    const result: Array<{
      schedule_date: string;
      start_time: string | null;
      end_time: string | null;
      is_day_off: boolean;
      user_id: string;
      user_name: string;
      work_position?: string | null;
    }> = [];

    const teamNameMap = new Map(team.map((t) => [t.id, t.full_name]));

    schedules.forEach((s) => {
      const pendingChange = pendingChanges.get(changeKey(s.user_id!, s.schedule_date!));
      if (pendingChange) {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: pendingChange.startTime,
          end_time: pendingChange.endTime,
          is_day_off: pendingChange.isDayOff,
          user_id: s.user_id!,
          user_name: teamNameMap.get(s.user_id!) || 'Empleado',
          work_position: pendingChange.position,
        });
      } else {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off || false,
          user_id: s.user_id!,
          user_name: teamNameMap.get(s.user_id!) || 'Empleado',
          work_position: (s as any).work_position,
        });
      }
    });

    pendingChanges.forEach((change, key) => {
      const existing = schedules.find((s) => changeKey(s.user_id!, s.schedule_date!) === key);
      if (!existing) {
        result.push({
          schedule_date: change.date,
          start_time: change.startTime,
          end_time: change.endTime,
          is_day_off: change.isDayOff,
          user_id: change.userId,
          user_name: change.userName,
          work_position: change.position,
        });
      }
    });

    return result;
  }, [schedules, pendingChanges, team]);

  // Calculate monthly hours per employee (with pending changes)
  const monthlyHoursByEmployee = useMemo(() => {
    const hoursMap = new Map<string, number>();

    team.forEach((member) => {
      let totalHours = 0;

      monthDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const value = getEffectiveValue(member.id, dateStr);

        if (!value.isDayOff && value.startTime && value.endTime) {
          totalHours += calculateShiftHours(
            value.startTime,
            value.endTime,
            value.startTime2,
            value.endTime2,
          );
        }
      });

      hoursMap.set(member.id, totalHours);
    });

    return hoursMap;
  }, [team, monthDays, getEffectiveValue]);

  // Helper: Sort hours in operational order (11:00 → 02:00+)
  // Early morning hours (0-4) come AFTER evening hours (23)
  const operationalHourOrder = (hour: number): number => {
    return hour < 5 ? hour + 24 : hour; // 0→24, 1→25, 2→26, 3→27, 4→28
  };

  // Calculate all hours with coverage - sorted by operational day
  const allHoursWithCoverage = useMemo(() => {
    const hourSet = new Set<number>();

    schedulesWithPending.forEach((s) => {
      if (s.is_day_off || !s.start_time || !s.end_time) return;

      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      const adjustedEnd = endH < startH ? endH + 24 : endH;

      for (let h = startH; h < adjustedEnd; h++) {
        hourSet.add(h % 24);
      }
    });

    if (hourSet.size === 0) return [];

    // Sort in operational order: 5, 6, ..., 23, 0, 1, 2, 3, 4
    const hours = Array.from(hourSet).sort(
      (a, b) => operationalHourOrder(a) - operationalHourOrder(b),
    );
    return hours;
  }, [schedulesWithPending]);

  // Filter hours by range
  const filteredHours = useMemo(() => {
    if (hourRange === 'all') return allHoursWithCoverage;
    if (hourRange === '12-00') {
      return allHoursWithCoverage.filter((h) => h >= 12 || h < 1);
    }
    if (hourRange === '18-00') {
      return allHoursWithCoverage.filter((h) => h >= 18 || h < 1);
    }
    return allHoursWithCoverage;
  }, [allHoursWithCoverage, hourRange]);

  // Get employees at specific hour for a day
  // Key concept: "Operational Day" - early morning hours (0-4) belong to the SAME operational day
  // A shift 20:00-02:00 on Saturday shows coverage at 00:00/01:00 in the Saturday column
  const getEmployeesAtHour = useCallback(
    (dateStr: string, hour: number) => {
      // For early morning hours (0-4), we show employees whose shift STARTED on this same date
      // and crosses midnight (overnight shift)
      if (hour < 5) {
        return schedulesWithPending.filter((s) => {
          if (s.schedule_date !== dateStr) return false;
          if (s.is_day_off || !s.start_time || !s.end_time) return false;

          const [startH] = s.start_time.split(':').map(Number);
          const [endH] = s.end_time.split(':').map(Number);

          // Only overnight shifts that cross midnight
          const isOvernight = endH < startH;
          if (!isOvernight) return false;

          // Check if this early morning hour is covered by the shift
          return hour < endH;
        });
      }

      // For regular hours (5:00-23:59), show employees working on this date
      return schedulesWithPending.filter((s) => {
        if (s.schedule_date !== dateStr) return false;
        if (s.is_day_off || !s.start_time || !s.end_time) return false;

        const [startH] = s.start_time.split(':').map(Number);
        const [endH] = s.end_time.split(':').map(Number);
        const isOvernight = endH < startH;

        if (isOvernight) {
          // For overnight shifts, cover from start until midnight (23:59)
          return hour >= startH;
        } else {
          // Normal shift
          return startH <= hour && hour < endH;
        }
      });
    },
    [schedulesWithPending],
  );

  const getCoverageColor = (count: number): string => {
    if (count === 0) return 'bg-muted text-muted-foreground';
    if (count < 2) return 'bg-destructive/20 text-destructive';
    if (count < 4) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-primary/20 text-primary';
  };

  // Render schedule cell content
  const renderCellContent = (
    value: ScheduleValue,
    isPending: boolean,
    _isHoliday: boolean,
    _isSelected: boolean,
  ) => {
    if (value.isDayOff && (value.isBirthdayOff || value.position === 'cumple')) {
      return (
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
            isPending && 'ring-2 ring-primary ring-offset-1',
          )}
        >
          🎂 Cumple
        </Badge>
      );
    }

    if (value.isDayOff && value.position === 'vacaciones') {
      return (
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
            isPending && 'ring-2 ring-primary ring-offset-1',
          )}
        >
          🏖️ Vac
        </Badge>
      );
    }

    if (value.isDayOff) {
      return (
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5', isPending && 'ring-2 ring-primary ring-offset-1')}
        >
          Franco
        </Badge>
      );
    }

    const isEmptySchedule =
      !value.startTime ||
      !value.endTime ||
      (value.startTime === '00:00' && value.endTime === '00:00') ||
      (value.startTime === '00:00:00' && value.endTime === '00:00:00');

    if (isEmptySchedule) {
      // Don't show holiday emoji inside cells - holidays are shown in the day header
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    const positionConfig = value.position ? POSITION_ICONS[value.position] : null;
    const PositionIcon = positionConfig?.icon;
    const hasBreak = value.breakStart && value.breakEnd;

    // Check for split shift (second time range)
    const hasSplitShift =
      value.startTime2 &&
      value.endTime2 &&
      value.startTime2 !== '00:00' &&
      value.endTime2 !== '00:00';

    return (
      <div
        className={cn(
          'flex flex-col items-center gap-0.5 p-1 rounded text-[10px]',
          isPending && 'ring-2 ring-primary ring-offset-1 bg-primary/5',
        )}
      >
        <div className="font-medium text-foreground">
          {value.startTime.slice(0, 5)}-{value.endTime.slice(0, 5)}
          {hasSplitShift && (
            <span className="text-muted-foreground">
              {' '}
              / {value.startTime2!.slice(0, 5)}-{value.endTime2!.slice(0, 5)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 max-w-full">
          {PositionIcon ? (
            <div className="flex items-center gap-0.5 truncate max-w-full" style={{ color: positionConfig.color.includes('text-') ? undefined : positionConfig.color }}>
              <PositionIcon className={cn('w-3 h-3 shrink-0', positionConfig.color)} />
              <span className={cn('truncate', positionConfig.color)}>{positionConfig.label}</span>
            </div>
          ) : value.position ? (
            <span className="truncate text-muted-foreground capitalize">{value.position}</span>
          ) : null}
          {hasBreak && !hasSplitShift && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Coffee className="w-3 h-3 text-amber-600 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Break: {value.breakStart?.slice(0, 5)}-{value.breakEnd?.slice(0, 5)}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  // Handle mouse move on grid container for drag selection
  // handleGridMouseMove is now handled in the unified container with selection.handleGridPointerMove

  // Phase 3: Copy previous month pattern
  const handleCopyPreviousMonth = useCallback(() => {
    if (!previousMonthPattern) {
      toast.error('No se encontraron horarios del mes anterior');
      return;
    }

    const changes = applyPatternToMonth(
      previousMonthPattern,
      monthDays,
      teamMemberIds,
      getTeamMemberName,
    );

    if (changes.length === 0) {
      toast.info('No hay horarios para copiar del mes anterior');
      setCopyMonthDialogOpen(false);
      return;
    }

    // Apply changes as pending
    changes.forEach((change) => {
      handleCellChange(change.userId, change.userName, change.date, change.schedule);
    });

    toast.success(`📋 ${changes.length} horarios copiados del mes anterior`);
    setCopyMonthDialogOpen(false);
  }, [previousMonthPattern, monthDays, teamMemberIds, getTeamMemberName, handleCellChange]);

  // Check if month is empty (for prominent copy button)
  const isMonthEmpty = schedules.length === 0 && pendingChanges.size === 0;

  const gridWidth = monthDays.length * DAY_WIDTH;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium capitalize min-w-[150px] text-center">
              {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legend - for Cobertura view */}
          {activeView === 'cobertura' && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive/20" /> &lt;2
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> 2-3
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20" /> 4+
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        ) : team.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay empleados para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="py-2 px-4 border-b bg-muted/30 space-y-0">
              {/* Row 1: View toggle + Clipboard indicator + Actions - ALWAYS */}
              <div className="flex items-center justify-between gap-4 min-h-[40px]">
                {/* Left: Segmented Control + hour filter */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    <button
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                        activeView === 'personas'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setActiveView('personas')}
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Personas</span>
                    </button>
                    <button
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                        activeView === 'cobertura'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setActiveView('cobertura')}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Cobertura</span>
                    </button>
                  </div>

                  {/* Monthly hours summary - only for personas view */}
                  {activeView === 'personas' && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      <span className="font-medium">
                        {Array.from(monthlyHoursByEmployee.values())
                          .reduce((a, b) => a + b, 0)
                          .toFixed(0)}
                        h
                      </span>
                      <span className="text-muted-foreground/70">programadas</span>
                      {Array.from(monthlyHoursByEmployee.entries()).some(([_, h]) => h > 190) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Hay empleados que superan las 190hs mensuales
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}

                  {/* Hour range filter - only for Cobertura view */}
                  {activeView === 'cobertura' && (
                    <Select
                      value={hourRange}
                      onValueChange={(v) => setHourRange(v as HourRangeType)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Rango horario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las horas</SelectItem>
                        <SelectItem value="12-00">12:00 - 00:00</SelectItem>
                        <SelectItem value="18-00">18:00 - 00:00</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Copy previous month button - prominent when empty, subtle otherwise */}
                  {canManageSchedules &&
                    activeView === 'personas' &&
                    (previousMonthPattern?.patterns?.length ?? 0) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isMonthEmpty ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-8 text-xs gap-1', isMonthEmpty && 'animate-pulse')}
                            onClick={() => setCopyMonthDialogOpen(true)}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copiar mes anterior</span>
                            <span className="sm:hidden">📋</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Copiar patrón semanal de{' '}
                          {format(subMonths(new Date(year, month - 1), 1), 'MMMM', { locale: es })}
                        </TooltipContent>
                      </Tooltip>
                    )}
                </div>

                {/* Center: Clipboard indicator (when something is copied) */}
                {selection.clipboard && (
                  <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <span>📋 {selection.clipboard.sourceInfo}</span>
                    <button
                      onClick={selection.clearClipboard}
                      className="text-primary hover:underline ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Right: Actions area (Save/Discard) */}
                <div className="flex items-center gap-2 min-w-[180px] justify-end">
                  {pendingChanges.size > 0 && (
                    <>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {pendingChanges.size} pendiente{pendingChanges.size !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDiscardChanges}
                        className="h-8 text-xs"
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-1" />
                        Descartar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSaveDialogOpen(true)}
                        className="h-8 text-xs"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        Guardar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Selection toolbar - ONLY visible when cells are selected */}
              {canManageSchedules &&
                activeView === 'personas' &&
                selection.selectedCells.size > 0 && (
                  <div className="flex items-center border-t border-border/50 pt-2 mt-2">
                    <SelectionToolbar
                      selectionCount={selection.selectedCells.size}
                      clipboard={selection.clipboard}
                      onCopy={selection.handleCopy}
                      onPaste={selection.handlePaste}
                      onClear={selection.handleClearCells}
                      onApplyDayOff={selection.handleApplyDayOff}
                      onApplyVacation={selection.handleApplyVacation}
                      onApplyBirthday={selection.handleApplyBirthday}
                      onApplyWithOptions={selection.handleApplyWithOptions}
                      onDeselect={selection.clearSelection}
                      positions={workPositions}
                      showBirthday={true}
                      initialValues={(() => {
                        if (selection.selectedCells.size !== 1) return undefined;
                        const cellKey = Array.from(selection.selectedCells)[0];
                        const [userId, dateStr] = cellKey.split(':');
                        const val = getEffectiveValue(userId, dateStr);
                        if (val.isDayOff || !val.startTime || !val.endTime) return undefined;
                        return {
                          startTime: val.startTime,
                          endTime: val.endTime,
                          position: val.position,
                          isSplitShift: !!(val.startTime2 && val.endTime2),
                          startTime2: val.startTime2 || undefined,
                          endTime2: val.endTime2 || undefined,
                        };
                      })()}
                    />
                  </div>
                )}
            </CardHeader>

            {/* CalendarViewport */}
            <CardContent className="p-0 overflow-hidden">
              <div
                className="overflow-auto overscroll-contain"
                style={{ maxHeight: 'calc(100vh - 340px)', maxWidth: '100%' }}
              >
                <div className="flex" style={{ minWidth: EMPLOYEE_COL_WIDTH + gridWidth }}>
                  {/* Fixed Left Column - sticky */}
                  <div className="shrink-0 border-r bg-card z-20 sticky left-0 flex">
                    {/* Employee name column */}
                    <div style={{ width: EMPLOYEE_COL_WIDTH }}>
                      {/* Header cell */}
                      <div className="h-12 border-b bg-muted/50 flex items-center px-3 sticky top-0 z-30 bg-card">
                        <span className="text-xs font-medium text-muted-foreground">
                          {activeView === 'personas' ? 'Empleado' : 'Hora'}
                        </span>
                      </div>

                      {/* Left column rows - changes based on active view */}
                      {activeView === 'personas' ? (
                        // Employee rows - show full name
                        team.map((member) => (
                          <div
                            key={member.id}
                            className="border-b flex items-center gap-2 px-2 bg-card hover:bg-muted/50 cursor-pointer"
                            style={{ height: SCHEDULE_ROW_HEIGHT }}
                            onClick={() =>
                              canManageSchedules && selection.handleRowSelect(member.id)
                            }
                            title="Click para seleccionar toda la fila"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                              {getInitials(member.full_name)}
                            </div>
                            <span
                              className="text-xs truncate flex-1 min-w-0"
                              title={member.full_name}
                            >
                              {member.full_name}
                            </span>
                          </div>
                        ))
                      ) : // Hour rows
                      filteredHours.length === 0 ? (
                        <div className="py-8 px-3 text-center text-sm text-muted-foreground">
                          Sin datos
                        </div>
                      ) : (
                        filteredHours.map((hour) => (
                          <div
                            key={hour}
                            className="border-b bg-muted/10 flex items-center px-3 gap-1"
                            style={{ height: COVERAGE_ROW_HEIGHT }}
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              {String(hour).padStart(2, '0')}:00
                            </span>
                            {hour < 5 && (
                              <span className="text-[9px] text-muted-foreground/70">(cierre)</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Days Grid */}
                  <div className="flex-1" style={{ touchAction: 'none' }}>
                    <div style={{ width: gridWidth }}>
                      {/* Day headers - sticky top */}
                      <div className="h-12 border-b bg-muted/50 flex sticky top-0 z-10">
                        {monthDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isHoliday = holidayDates.has(dateStr);
                          const holidayName = holidayDates.get(dateStr);
                          const dayOfWeek = day.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          const isSaturday = dayOfWeek === 6;
                          const isSunday = dayOfWeek === 0;

                          return (
                            <Tooltip key={dateStr}>
                              <TooltipTrigger asChild>
                                <div
                                  style={{ width: DAY_WIDTH }}
                                  className={cn(
                                    'shrink-0 flex flex-col items-center justify-center border-r border-border/40 cursor-pointer hover:bg-primary/5 relative',
                                    // Feriado - color de acento fuerte
                                    isHoliday &&
                                      'bg-orange-100 dark:bg-orange-950/40 border-border/70',
                                    // Fin de semana (si no es feriado)
                                    !isHoliday && isSaturday && 'bg-blue-50 dark:bg-blue-950/30',
                                    !isHoliday && isSunday && 'bg-blue-100 dark:bg-blue-950/50',
                                  )}
                                  onClick={() =>
                                    canManageSchedules &&
                                    activeView === 'personas' &&
                                    selection.handleColumnSelect(dateStr)
                                  }
                                >
                                  <span
                                    className={cn(
                                      'text-[10px]',
                                      isWeekend &&
                                        !isHoliday &&
                                        'text-blue-600 dark:text-blue-400 font-medium',
                                      isHoliday && 'text-orange-600 dark:text-orange-400',
                                    )}
                                  >
                                    {dayNames[day.getDay()]}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-sm font-medium flex items-center gap-0.5',
                                      isWeekend && !isHoliday && 'text-blue-700 dark:text-blue-300',
                                      isHoliday && 'text-orange-700 dark:text-orange-300',
                                    )}
                                  >
                                    {format(day, 'd')}
                                    {isHoliday && <Flag className="w-3 h-3 ml-0.5" />}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {isHoliday ? (
                                  <span className="text-orange-600 font-medium">
                                    🎉 {holidayName}
                                  </span>
                                ) : (
                                  <span>Click para seleccionar columna</span>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      {/* Content rows - changes based on active view */}
                      {activeView === 'personas' ? (
                        // Schedule rows
                        team.map((member) => (
                          <div
                            key={member.id}
                            className="flex border-b"
                            style={{ height: SCHEDULE_ROW_HEIGHT }}
                          >
                            {monthDays.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const isHoliday = holidayDates.has(dateStr);
                              const dayOfWeek = day.getDay();
                              const isSaturday = dayOfWeek === 6;
                              const isSunday = dayOfWeek === 0;
                              const value = getEffectiveValue(member.id, dateStr);
                              const isPending = hasPendingChange(member.id, dateStr);
                              const isEditable = canManageSchedules; // Feriados también se pueden editar en gastronomía
                              const isSelected = selection.isCellSelected(member.id, dateStr);

                              return (
                                <div
                                  key={dateStr}
                                  data-cell={`${member.id}:${dateStr}`}
                                  style={{ width: DAY_WIDTH, height: SCHEDULE_ROW_HEIGHT }}
                                  className={cn(
                                    'shrink-0 flex items-center justify-center border-r border-b border-border/40 cursor-pointer transition-all select-none',
                                    // Feriado - solo cambio de fondo, bordes consistentes
                                    isHoliday && 'bg-orange-50 dark:bg-orange-950/20',
                                    // Fin de semana (si no es feriado)
                                    !isHoliday && isSaturday && 'bg-blue-50/50 dark:bg-blue-950/20',
                                    !isHoliday && isSunday && 'bg-blue-100/50 dark:bg-blue-950/30',
                                    isEditable && 'hover:bg-primary/5',
                                    isSelected && 'bg-primary/20 ring-2 ring-primary ring-inset',
                                  )}
                                  onPointerDown={(e) => {
                                    if (!isEditable) return;
                                    selection.handleDragStart(member.id, dateStr, e);
                                  }}
                                  onPointerEnter={() => {
                                    if (!isEditable) return;
                                    selection.handleCellEnter(member.id, dateStr);
                                  }}
                                  onPointerUp={(e) => {
                                    if (!isEditable) return;
                                    selection.handleCellPointerUp(member.id, dateStr, e);
                                  }}
                                  onLostPointerCapture={() => {
                                    selection.handleLostPointerCapture();
                                  }}
                                >
                                  {renderCellContent(value, isPending, isHoliday, isSelected)}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : // Coverage rows (hourly heatmap)
                      filteredHours.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No hay horarios cargados este mes
                        </div>
                      ) : (
                        filteredHours.map((hour) => (
                          <div
                            key={hour}
                            className="flex border-b"
                            style={{ height: COVERAGE_ROW_HEIGHT }}
                          >
                            {monthDays.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const employees = getEmployeesAtHour(dateStr, hour);
                              const count = employees.length;
                              const dayOfWeek = day.getDay();
                              const isSaturday = dayOfWeek === 6;
                              const isSunday = dayOfWeek === 0;
                              const isHoliday = holidayDates.has(dateStr);

                              return (
                                <Tooltip key={dateStr}>
                                  <TooltipTrigger asChild>
                                    <div
                                      style={{ width: DAY_WIDTH, height: COVERAGE_ROW_HEIGHT }}
                                      className={cn(
                                        'shrink-0 flex items-center justify-center border-r',
                                        // Feriado
                                        isHoliday && 'bg-orange-50/50 dark:bg-orange-950/10',
                                        // Fin de semana
                                        !isHoliday &&
                                          isSaturday &&
                                          'bg-blue-50/30 dark:bg-blue-950/10',
                                        !isHoliday &&
                                          isSunday &&
                                          'bg-blue-100/30 dark:bg-blue-950/20',
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          'w-10 h-6 rounded text-xs font-medium flex items-center justify-center',
                                          getCoverageColor(count),
                                        )}
                                      >
                                        {count}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-medium">
                                      {format(day, 'EEE d', { locale: es })},{' '}
                                      {String(hour).padStart(2, '0')}:00
                                      {hour < 5 && (
                                        <span className="text-muted-foreground"> (cierre)</span>
                                      )}
                                    </p>
                                    {count > 0 ? (
                                      <>
                                        <p className="text-muted-foreground">
                                          {hour < 5
                                            ? 'Cerrando el turno:'
                                            : `${count} persona${count !== 1 ? 's' : ''}:`}
                                        </p>
                                        <ul className="mt-1">
                                          {employees.slice(0, 5).map((e, i) => (
                                            <li key={i} className="truncate">
                                              {e.user_name}
                                            </li>
                                          ))}
                                          {employees.length > 5 && (
                                            <li className="text-muted-foreground">
                                              +{employees.length - 5} más
                                            </li>
                                          )}
                                        </ul>
                                      </>
                                    ) : (
                                      <p className="text-muted-foreground">Sin cobertura</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Dialog */}
        <SaveScheduleDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          affectedEmployees={affectedEmployees}
          totalChanges={pendingChanges.size}
          monthLabel={format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
          onConfirm={async (notifyEmail, notifyCommunication) => {
            await saveMutation.mutateAsync({ notifyEmail, notifyCommunication });
          }}
          isPending={saveMutation.isPending}
        />

        {/* Copy Previous Month Dialog */}
        <AlertDialog open={copyMonthDialogOpen} onOpenChange={setCopyMonthDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Copiar mes anterior
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Se copiará el patrón semanal de{' '}
                    <strong>
                      {format(subMonths(new Date(year, month - 1), 1), 'MMMM yyyy', { locale: es })}
                    </strong>{' '}
                    a todos los días de{' '}
                    <strong>
                      {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
                    </strong>
                    .
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Los horarios se cargarán como borrador. Podrás ajustarlos antes de publicar.
                  </p>
                  {(previousMonthPattern?.patterns?.length ?? 0) > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <p className="font-medium">Patrón encontrado:</p>
                      <p className="text-muted-foreground">
                        {previousMonthPattern.patterns.length} horarios de la semana del{' '}
                        {format(previousMonthPattern.sourceWeekStart, 'd', { locale: es })} al{' '}
                        {format(previousMonthPattern.sourceWeekEnd, "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCopyPreviousMonth}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar horarios
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
