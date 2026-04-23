/**
 * EmployeeScheduleModal - Modal para ver horarios de un empleado específico
 */
import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeScheduleForBranch } from '@/services/schedulesService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';

interface EmployeeScheduleModalProps {
  userId: string;
  userName: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeScheduleModal({
  userId,
  userName,
  branchId,
  open,
  onOpenChange,
}: EmployeeScheduleModalProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['employee-schedules', userId, branchId],
    queryFn: () =>
      fetchEmployeeScheduleForBranch(
        userId,
        branchId,
        format(monthStart, 'yyyy-MM-dd'),
        format(monthEnd, 'yyyy-MM-dd'),
      ),
    enabled: open,
  });

  const getScheduleForDay = (date: Date) => {
    return schedules?.find((s) => s.schedule_date && isSameDay(new Date(s.schedule_date), date));
  };

  // Calculate total scheduled hours
  const totalScheduledHours = () => {
    if (!schedules?.length) return 0;

    let total = 0;
    for (const s of schedules) {
      if (s.is_day_off) continue;
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      total += (endMinutes - startMinutes) / 60;
    }
    return Math.round(total * 10) / 10;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Horarios de {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            {format(monthStart, 'MMMM yyyy', { locale: es })}
          </div>
          <div className="text-2xl font-bold">{totalScheduledHours()}h programadas</div>
        </div>

        {isLoading ? (
          <HoppinessLoader size="sm" text="Cargando horarios..." />
        ) : schedules?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Sin horarios asignados este mes</p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {daysInMonth.map((day) => {
                const schedule = getScheduleForDay(day);
                if (!schedule) return null;

                const isToday = isSameDay(day, now);
                const isPast = day < now && !isToday;

                return (
                  <div
                    key={day.toISOString()}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isToday ? 'border-primary bg-primary/5' : ''
                    } ${isPast ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
                          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <span className="text-xs uppercase">
                          {format(day, 'EEE', { locale: es })}
                        </span>
                        <span className="font-bold text-sm">{format(day, 'd')}</span>
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {format(day, 'EEEE', { locale: es })}
                        </div>
                        {isToday && (
                          <Badge variant="secondary" className="text-xs">
                            Hoy
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {schedule.is_day_off ? (
                        <Badge variant="outline">Franco</Badge>
                      ) : (
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
