import { useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useQuery } from '@tanstack/react-query';
import { fetchMyClockEntries } from '@/services/hrService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Timer, LogIn, LogOut, ChevronDown, ChevronUp, UserCog } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface ClockEntry {
  id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  branch_id: string;
  is_manual?: boolean;
  branches?: { name: string } | null;
  schedule_id?: string | null;
}

interface ShiftPair {
  date: Date;
  clockIn: ClockEntry | null;
  clockOut: ClockEntry | null;
}

function pairShifts(entries: ClockEntry[]): ShiftPair[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const hasScheduleIds = sorted.some((e) => e.schedule_id);

  if (hasScheduleIds) {
    const bySchedule = new Map<string, ClockEntry[]>();
    const unlinked: ClockEntry[] = [];
    for (const e of sorted) {
      if (e.schedule_id) {
        const list = bySchedule.get(e.schedule_id) ?? [];
        list.push(e);
        bySchedule.set(e.schedule_id, list);
      } else {
        unlinked.push(e);
      }
    }

    const shifts: ShiftPair[] = [];
    for (const [, group] of bySchedule) {
      const clockIn = group.find((e) => e.entry_type === 'clock_in') ?? null;
      const clockOut = group.find((e) => e.entry_type === 'clock_out') ?? null;
      const ref = clockIn ?? clockOut;
      if (ref) shifts.push({ date: new Date(ref.created_at), clockIn, clockOut });
    }
    shifts.push(...legacyPair(unlinked));
    shifts.sort((a, b) => b.date.getTime() - a.date.getTime());
    return shifts;
  }

  return legacyPair(sorted).reverse();
}

function legacyPair(sorted: ClockEntry[]): ShiftPair[] {
  const shifts: ShiftPair[] = [];
  let pendingIn: ClockEntry | null = null;
  for (const entry of sorted) {
    if (entry.entry_type === 'clock_in') {
      if (pendingIn) {
        shifts.push({ date: new Date(pendingIn.created_at), clockIn: pendingIn, clockOut: null });
      }
      pendingIn = entry;
    } else if (entry.entry_type === 'clock_out') {
      if (pendingIn) {
        shifts.push({ date: new Date(pendingIn.created_at), clockIn: pendingIn, clockOut: entry });
        pendingIn = null;
      } else {
        shifts.push({ date: new Date(entry.created_at), clockIn: null, clockOut: entry });
      }
    }
  }
  if (pendingIn) {
    shifts.push({ date: new Date(pendingIn.created_at), clockIn: pendingIn, clockOut: null });
  }
  return shifts;
}

export default function MyClockInsCard() {
  const { id: userId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();

  const isOperationalEmployee = branchRoles.some(
    (r) => r.local_role && r.local_role !== 'franquiciado',
  );

  const { data: clockEntries, isLoading } = useQuery({
    queryKey: ['my-clock-entries', userId],
    queryFn: async () => {
      if (!userId) return [];

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      return fetchMyClockEntries(userId, monthStart.toISOString(), monthEnd.toISOString()) as Promise<ClockEntry[]>;
    },
    enabled: !!userId && isOperationalEmployee,
  });

  const shifts = clockEntries ? pairShifts(clockEntries) : [];

  // Calculate total hours from paired shifts
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    for (const shift of shifts) {
      if (shift.clockIn && shift.clockOut) {
        totalMinutes += differenceInMinutes(
          new Date(shift.clockOut.created_at),
          new Date(shift.clockIn.created_at),
        );
      } else if (shift.clockIn && !shift.clockOut) {
        // Currently working
        totalMinutes += differenceInMinutes(new Date(), new Date(shift.clockIn.created_at));
      }
    }
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  };

  const totalTime = calculateTotalHours();
  const isCurrentlyWorking = shifts.length > 0 && shifts[0].clockIn && !shifts[0].clockOut;
  const [showAll, setShowAll] = useState(false);
  const recentShifts = showAll ? shifts : shifts.slice(0, 5);

  if (!isOperationalEmployee) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mis Fichajes</CardTitle>
          </div>
          {isCurrentlyWorking && (
            <Badge className="bg-success text-success-foreground animate-pulse">Trabajando</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <Timer className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Horas este mes</p>
            <p className="text-2xl font-bold">
              {totalTime.hours}h {totalTime.minutes > 0 ? `${totalTime.minutes}m` : ''}
            </p>
          </div>
        </div>

        {recentShifts.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Últimos fichajes
            </h4>
            <div className="space-y-2">
              {recentShifts.map((shift, i) => {
                let duration = null;
                if (shift.clockIn && shift.clockOut) {
                  const mins = differenceInMinutes(
                    new Date(shift.clockOut.created_at),
                    new Date(shift.clockIn.created_at),
                  );
                  duration = { hours: Math.floor(mins / 60), mins: mins % 60 };
                }

                return (
                  <div
                    key={shift.clockIn?.id || shift.clockOut?.id || i}
                    className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-20">
                        {format(shift.date, 'EEE d', { locale: es })}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        {shift.clockIn && (
                          <span className="flex items-center gap-1 text-success">
                            <LogIn className="w-3 h-3" />
                            {format(new Date(shift.clockIn.created_at), 'HH:mm')}
                          </span>
                        )}
                        {shift.clockOut && (
                          <span className="flex items-center gap-1 text-destructive">
                            <LogOut className="w-3 h-3" />
                            {format(new Date(shift.clockOut.created_at), 'HH:mm')}
                          </span>
                        )}
                        {shift.clockIn && !shift.clockOut && (
                          <Badge variant="outline" className="text-xs animate-pulse">
                            En curso
                          </Badge>
                        )}
                        {(shift.clockIn?.is_manual || shift.clockOut?.is_manual) && (
                          <span className="flex items-center gap-0.5 text-amber-600 text-[10px]">
                            <UserCog className="w-3 h-3" />
                            Ajustado
                          </span>
                        )}
                      </div>
                    </div>
                    {duration && (
                      <Badge variant="secondary">
                        {duration.hours}h {duration.mins}m
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            {shifts.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" /> Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" /> Ver todos ({shifts.length})
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay fichajes este mes</p>
        )}
      </CardContent>
    </Card>
  );
}
