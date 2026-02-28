/**
 * MiHorarioPage - Employee personal schedule view page
 *
 * Full page view of the employee's monthly schedule with:
 * - Month navigation
 * - Today's schedule prominently displayed
 * - Week view with details
 * - Full month calendar
 * - Work position information
 * - Read-only (no editing capability)
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMySchedules } from '@/services/schedulesService';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  CreditCard,
  Package,
  Utensils,
  Info,
  Coffee,
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
import { PageHeader } from '@/components/ui/page-header';

interface ScheduleEntry {
  id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
  work_position: string | null;
}

const POSITION_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }
> = {
  sandwichero: {
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Sandwichero',
  },
  cajero: { icon: CreditCard, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Cajero' },
  delivery: { icon: Package, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Delivery' },
  limpieza: {
    icon: Utensils,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Limpieza',
  },
  cumple: {
    icon: Coffee,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    label: 'Día libre (Cumple)',
  },
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function MiHorarioPage() {
  const { id: userId } = useEffectiveUser();
  const now = new Date();

  const [currentDate, setCurrentDate] = useState(now);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch schedules using schedule_date
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['my-schedules-v2', userId, currentMonth, currentYear],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = format(startOfMonth(new Date(currentYear, currentMonth - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(currentYear, currentMonth - 1)), 'yyyy-MM-dd');

      return fetchMySchedules(userId, startDate, endDate) as Promise<ScheduleEntry[]>;
    },
    enabled: !!userId,
    staleTime: 10 * 1000,
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

  // Get this week's days (Monday start)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, []);

  // Get month days
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(currentYear, currentMonth - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [currentMonth, currentYear]);

  // Calculate total scheduled hours
  const totalHours = useMemo(() => {
    let minutes = 0;
    schedules?.forEach((s) => {
      if (!s.is_day_off && s.start_time && s.end_time && s.start_time !== '00:00:00') {
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time.split(':').map(Number);

        let startMins = startH * 60 + startM;
        let endMins = endH * 60 + endM;

        // Handle overnight shifts
        if (endMins <= startMins) {
          endMins += 24 * 60;
        }

        minutes += endMins - startMins;
      }
    });
    return Math.round((minutes / 60) * 10) / 10;
  }, [schedules]);

  // Count work days and francos
  const { workDays, francos } = useMemo(() => {
    let work = 0;
    let free = 0;
    schedules?.forEach((s) => {
      if (s.is_day_off) {
        free++;
      } else if (s.start_time && s.start_time !== '00:00:00') {
        work++;
      }
    });
    return { workDays: work, francos: free };
  }, [schedules]);

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

  const calculateDuration = (start: string, end: string): string => {
    if (!start || !end || start === '00:00:00') return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let startMins = startH * 60 + startM;
    let endMins = endH * 60 + endM;

    if (endMins <= startMins) endMins += 24 * 60;

    const duration = endMins - startMins;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;

    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderPosition = (position: string | null, size: 'sm' | 'md' = 'sm') => {
    if (!position) return null;
    const config = POSITION_CONFIG[position];
    if (!config)
      return (
        <Badge variant="outline" className="text-xs">
          {position}
        </Badge>
      );

    const Icon = config.icon;
    const sizeClass = size === 'md' ? 'text-sm py-1 px-2' : 'text-xs py-0.5 px-1.5';

    return (
      <span
        className={`inline-flex items-center gap-1 rounded ${config.bgColor} ${config.color} ${sizeClass}`}
      >
        <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
        {config.label}
      </span>
    );
  };

  // Today's schedule
  const todayStr = format(now, 'yyyy-MM-dd');
  const todaySchedule = schedulesByDate.get(todayStr);
  const hasWorkToday =
    todaySchedule && !todaySchedule.is_day_off && todaySchedule.start_time !== '00:00:00';

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Horario" subtitle="Tu horario de trabajo mensual" />

      {/* Month navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-semibold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              {!isSameMonth(currentDate, now) && (
                <Button variant="link" size="sm" onClick={goToCurrentMonth} className="text-xs">
                  Ir a mes actual
                </Button>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* No schedules */}
      {!isLoading && !schedules?.length && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Info className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin horarios publicados</h3>
              <p className="text-muted-foreground max-w-md">
                Tu encargado aún no publicó los horarios para{' '}
                {format(currentDate, 'MMMM yyyy', { locale: es })}. Te notificaremos cuando estén
                disponibles.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule content */}
      {!isLoading && schedules && schedules.length > 0 && (
        <div className="space-y-6">
          {/* Month summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">{workDays}</p>
                <p className="text-sm text-muted-foreground">Días de trabajo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{francos}</p>
                <p className="text-sm text-muted-foreground">Francos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{totalHours}h</p>
                <p className="text-sm text-muted-foreground">Horas totales</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's schedule - only if current month */}
          {isSameMonth(currentDate, now) && (
            <Card className={hasWorkToday ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Hoy - {format(now, "EEEE d 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasWorkToday ? (
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-lg">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold">
                          {formatTime(todaySchedule.start_time)} -{' '}
                          {formatTime(todaySchedule.end_time)}
                        </span>
                        <span className="text-muted-foreground">
                          ({calculateDuration(todaySchedule.start_time, todaySchedule.end_time)})
                        </span>
                      </div>
                      {todaySchedule.work_position &&
                        renderPosition(todaySchedule.work_position, 'md')}
                    </div>
                    <Badge className="bg-primary text-primary-foreground text-base px-4 py-2">
                      Trabajás
                    </Badge>
                  </div>
                ) : todaySchedule?.is_day_off ? (
                  <div className="flex items-center justify-between">
                    <p className="text-lg text-muted-foreground">Día franco</p>
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      Franco
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin turno asignado para hoy</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* This week - only if current month */}
          {isSameMonth(currentDate, now) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Esta semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weekDays.map((day, idx) => {
                    const schedule = getScheduleForDate(day);
                    const isDayOff = schedule?.is_day_off;
                    const hasWork = schedule && !isDayOff && schedule.start_time !== '00:00:00';
                    const isCurrentDay = isToday(day);

                    return (
                      <div
                        key={idx}
                        className={`
                          flex items-center justify-between p-3 rounded-lg
                          ${isCurrentDay ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/30'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 text-center ${isCurrentDay ? 'font-bold text-primary' : ''}`}
                          >
                            <div className="text-xs text-muted-foreground">
                              {DAY_NAMES[day.getDay()].slice(0, 3)}
                            </div>
                            <div className="text-lg">{format(day, 'd')}</div>
                          </div>

                          {hasWork ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </span>
                              {schedule.work_position && renderPosition(schedule.work_position)}
                            </div>
                          ) : isDayOff ? (
                            <span className="text-muted-foreground">Franco</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>

                        {hasWork && (
                          <span className="text-sm text-muted-foreground">
                            {calculateDuration(schedule.start_time, schedule.end_time)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full month calendar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg capitalize">
                Calendario de {format(currentDate, 'MMMM', { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for start of month (Monday = 0) */}
                {Array.from({ length: (monthDays[0].getDay() + 6) % 7 }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-20" />
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
                        flex flex-col p-2 rounded-lg h-20 text-sm
                        ${isCurrentDay ? 'ring-2 ring-primary' : 'border'}
                        ${hasWork ? 'bg-primary/5' : isDayOff ? 'bg-muted/50' : ''}
                      `}
                    >
                      <span className={`font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>

                      {hasWork ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-medium">
                            {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                          </p>
                          {schedule.work_position && (
                            <p className="text-xs text-muted-foreground truncate">
                              {POSITION_CONFIG[schedule.work_position]?.label ||
                                schedule.work_position}
                            </p>
                          )}
                        </div>
                      ) : isDayOff ? (
                        <p className="text-xs text-muted-foreground mt-1">Franco</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Posiciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(POSITION_CONFIG).map(([key, config]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm ${config.bgColor} ${config.color}`}
                  >
                    <config.icon className="w-4 h-4" />
                    {config.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
