/**
 * EmployeeClockInsModal - Modal de solo lectura para ver fichajes de un empleado
 *
 * Para corregir fichajes, ir a Mi Local > Equipo > Fichajes
 */
import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeClockInsMonth } from '@/services/hrService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogIn, LogOut, Clock, UserCog } from 'lucide-react';

interface EmployeeClockInsModalProps {
  userId: string;
  userName: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClockEntryRow {
  id: string;
  entry_type: string;
  created_at: string;
  gps_status?: string | null;
  is_manual?: boolean;
  manual_reason?: string | null;
  schedule_id?: string | null;
}

export function EmployeeClockInsModal({
  userId,
  userName,
  branchId,
  open,
  onOpenChange,
}: EmployeeClockInsModalProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: clockIns, isLoading } = useQuery({
    queryKey: ['employee-clock-ins', userId, branchId],
    queryFn: () =>
      fetchEmployeeClockInsMonth(userId, branchId, monthStart.toISOString(), monthEnd.toISOString()),
    enabled: open,
  });

  const calculateHours = () => {
    if (!clockIns?.length) return 0;
    const sorted = [...clockIns].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const hasScheduleIds = sorted.some((e: ClockEntryRow) => e.schedule_id);
    let totalMinutes = 0;

    if (hasScheduleIds) {
      const bySchedule = new Map<string, ClockEntryRow[]>();
      const unlinked: ClockEntryRow[] = [];
      for (const e of sorted) {
        if (e.schedule_id) {
          const list = bySchedule.get(e.schedule_id) ?? [];
          list.push(e);
          bySchedule.set(e.schedule_id, list);
        } else {
          unlinked.push(e);
        }
      }
      for (const [, group] of bySchedule) {
        const cin = group.find((e) => e.entry_type === 'clock_in');
        const cout = group.find((e) => e.entry_type === 'clock_out');
        if (cin && cout) {
          totalMinutes += (new Date(cout.created_at).getTime() - new Date(cin.created_at).getTime()) / 60000;
        }
      }
      // Legacy unlinked entries
      let lastClockIn: Date | null = null;
      for (const entry of unlinked) {
        if (entry.entry_type === 'clock_in') lastClockIn = new Date(entry.created_at);
        else if (entry.entry_type === 'clock_out' && lastClockIn) {
          totalMinutes += (new Date(entry.created_at).getTime() - lastClockIn.getTime()) / 60000;
          lastClockIn = null;
        }
      }
    } else {
      let lastClockIn: Date | null = null;
      for (const entry of sorted) {
        if (entry.entry_type === 'clock_in') lastClockIn = new Date(entry.created_at);
        else if (entry.entry_type === 'clock_out' && lastClockIn) {
          totalMinutes += (new Date(entry.created_at).getTime() - lastClockIn.getTime()) / 60000;
          lastClockIn = null;
        }
      }
    }
    return Math.round((totalMinutes / 60) * 10) / 10;
  };

  const manualCount = clockIns?.filter((e: ClockEntryRow) => e.is_manual).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fichajes de {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            {format(monthStart, 'MMMM yyyy', { locale: es })}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{calculateHours()}h trabajadas</span>
            {manualCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({manualCount} manual{manualCount > 1 ? 'es' : ''})
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Para corregir fichajes, usá la pantalla de Fichajes en Equipo.
        </p>

        {isLoading ? (
          <HoppinessLoader size="sm" text="Cargando fichajes..." />
        ) : clockIns?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Sin fichajes este mes</p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {(clockIns as ClockEntryRow[])?.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${entry.is_manual ? 'border-amber-200 bg-amber-50/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {entry.entry_type === 'clock_in' ? (
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <LogIn className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-red-100 text-red-600">
                        <LogOut className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {entry.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                        {entry.is_manual && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-300 text-amber-700">
                                  <UserCog className="w-2.5 h-2.5" />
                                  Manual
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-48">
                                {entry.manual_reason || 'Fichado manual por encargado'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), 'EEEE dd/MM', { locale: es })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg">
                      {format(new Date(entry.created_at), 'HH:mm')}
                    </div>
                    {entry.gps_status && (
                      <Badge
                        variant={entry.gps_status === 'ok' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {entry.gps_status === 'ok' ? 'GPS ✓' : 'Sin GPS'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
