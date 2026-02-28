/**
 * MyScheduleCard - Employee personal schedule view
 *
 * Shows the current month schedule with:
 * - Today's schedule prominently
 * - This week overview
 * - Expandable full month calendar
 * - Work position display
 * - Month navigation
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMySchedules } from '@/services/schedulesService';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  CreditCard,
  Package,
  Utensils,
  Info,
} from 'lucide-react';
import {
  format,
  isToday,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface ScheduleEntry {
  id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
  work_position: string | null;
}

const POSITION_ICONS: Record<
  string,
  { icon: React.ComponentType<any>; color: string; label: string }
> = {
  sandwichero: { icon: Flame, color: 'text-accent', label: 'Sandwichero' },
  cajero: { icon: CreditCard, color: 'text-info', label: 'Cajero' },
  delivery: { icon: Package, color: 'text-success', label: 'Delivery' },
  limpieza: { icon: Utensils, color: 'text-primary', label: 'Limpieza' },
};

const DAY_NAMES_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function MyScheduleCard() {
  const { id: userId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();
  const now = new Date();

  const [currentDate, setCurrentDate] = useState(now);
  const [expanded, setExpanded] = useState(false);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Franquiciados don't have schedules - hide if only has that role
  const hasOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');

  // Fetch schedules using schedule_date (correct query)
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['my-schedules-v2', userId, currentMonth, currentYear],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = format(startOfMonth(new Date(currentYear, currentMonth - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(currentYear, currentMonth - 1)), 'yyyy-MM-dd');

      return fetchMySchedules(userId, startDate, endDate) as Promise<ScheduleEntry[]>;
    },
    enabled: !!userId,
    staleTime: 10 * 1000, // Reduced stale time for fresher data
    refetchOnWindowFocus: true,
  });

  // Create map by date for efficient lookup
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    schedules?.forEach((s) => {
      if (s.schedule_date) {
        map.set(s.schedule_date, s);
      }
    });
    return map;
  }, [schedules]);

  // Get this week's days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, []);

  // Get month days for calendar
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(currentYear, currentMonth - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [currentMonth, currentYear]);

  // Navigation handlers
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToCurrentMonth = () => setCurrentDate(now);

  const formatTime = (time: string) => {
    if (!time || time === '00:00:00' || time === '00:00') return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const getScheduleForDate = (date: Date): ScheduleEntry | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedulesByDate.get(dateStr) || null;
  };

  const renderPosition = (position: string | null) => {
    if (!position) return null;
    const posConfig = POSITION_ICONS[position];
    if (!posConfig) return <span className="text-xs text-muted-foreground">{position}</span>;
    const Icon = posConfig.icon;
    return (
      <span className={`flex items-center gap-1 text-xs ${posConfig.color}`}>
        <Icon className="w-3 h-3" />
        {posConfig.label}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hide for franchisees
  if (hasOnlyFranquiciado) {
    return null;
  }

  // No schedules published
  if (!schedules?.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mi Horario</CardTitle>
          </div>
          <CardDescription>{format(currentDate, 'MMMM yyyy', { locale: es })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Info className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Tu encargado aún no publicó los horarios de este mes.
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            {!isSameMonth(currentDate, now) && (
              <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                Hoy
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Today's schedule
  const todayStr = format(now, 'yyyy-MM-dd');
  const todaySchedule = schedulesByDate.get(todayStr);
  const hasWorkToday =
    todaySchedule && !todaySchedule.is_day_off && todaySchedule.start_time !== '00:00:00';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mi Horario</CardTitle>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center capitalize">
              {format(currentDate, 'MMM yyyy', { locale: es })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Today highlight - only show if viewing current month */}
        {isSameMonth(currentDate, now) && (
          <div
            className={`p-3 rounded-lg border ${hasWorkToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">
                  Hoy - {format(now, 'EEEE d', { locale: es })}
                </p>
                {hasWorkToday ? (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatTime(todaySchedule.start_time)} -{' '}
                        {formatTime(todaySchedule.end_time)}
                      </span>
                    </div>
                    {todaySchedule.work_position && renderPosition(todaySchedule.work_position)}
                  </div>
                ) : todaySchedule?.is_day_off ? (
                  <p className="text-sm text-muted-foreground">Franco</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin turno asignado</p>
                )}
              </div>
              {hasWorkToday && (
                <Badge variant="default" className="bg-primary">
                  Trabajás
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* This week overview - only show if viewing current month */}
        {isSameMonth(currentDate, now) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Esta semana</p>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, idx) => {
                const schedule = getScheduleForDate(day);
                const isDayOff = schedule?.is_day_off;
                const hasWork = schedule && !isDayOff && schedule.start_time !== '00:00:00';
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`
                      flex flex-col items-center p-1.5 rounded text-center text-xs
                      ${isCurrentDay ? 'ring-2 ring-primary' : ''}
                      ${hasWork ? 'bg-primary/10' : isDayOff ? 'bg-muted' : 'bg-background border'}
                    `}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {DAY_NAMES_SHORT[(day.getDay() + 7) % 7]}
                    </span>
                    <span className={`font-medium ${hasWork ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {hasWork && <span className="text-[9px] text-muted-foreground">âœ“</span>}
                    {isDayOff && <span className="text-[9px]">F</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable full month calendar */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
            >
              {expanded ? 'Ocultar mes completo' : 'Ver mes completo'}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {/* Calendar header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                <div
                  key={idx}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for start of month */}
              {Array.from({ length: (monthDays[0].getDay() + 6) % 7 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-10" />
              ))}

              {/* Month days */}
              {monthDays.map((day, idx) => {
                const schedule = getScheduleForDate(day);
                const isDayOff = schedule?.is_day_off;
                const hasWork = schedule && !isDayOff && schedule.start_time !== '00:00:00';
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`
                      flex flex-col items-center justify-center h-10 rounded text-xs
                      ${isCurrentDay ? 'ring-2 ring-primary font-bold' : ''}
                      ${hasWork ? 'bg-primary/10 text-primary' : isDayOff ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'}
                    `}
                    title={
                      hasWork
                        ? `${formatTime(schedule!.start_time)} - ${formatTime(schedule!.end_time)}`
                        : isDayOff
                          ? 'Franco'
                          : ''
                    }
                  >
                    <span>{format(day, 'd')}</span>
                    {hasWork && <span className="text-[8px]">âœ“</span>}
                    {isDayOff && <span className="text-[8px]">F</span>}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary/10" /> Trabajás
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-muted" /> Franco
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Link to full page */}
        <Link to="/cuenta/horario" className="block">
          <Button variant="outline" size="sm" className="w-full">
            Ver horario detallado
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
