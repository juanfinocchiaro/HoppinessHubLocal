import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronDown, Camera, Pencil, Trash2, Plus, AlertTriangle, Hand } from 'lucide-react';
import { createManualClockEntry } from '@/services/hrService';
import { useAuth } from '@/hooks/useAuth';
import { useFichajeDetalle } from '@/hooks/useFichajeDetalle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildDayRoster, formatDuration } from './helpers';
import { STATUS_LABEL, type WindowConfig, DEFAULT_WINDOW } from './constants';
import type { ClockEntry, RosterRow, ScheduleInfo } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  row: RosterRow;
  branchId: string;
  selectedDate: Date;
  canEdit?: boolean;
  windowConfig?: WindowConfig;
  onEditEntry?: (entry: ClockEntry) => void;
  onDeleteEntry?: (entry: ClockEntry) => void;
}

export function RosterExpandedRow({
  row,
  branchId,
  selectedDate,
  canEdit,
  windowConfig = DEFAULT_WINDOW,
  onEditEntry,
  onDeleteEntry,
}: Props) {
  const [monthOpen, setMonthOpen] = useState(false);
  const [openEventKey, setOpenEventKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<ClockEntry | null>(null);
  const [manualEventKey, setManualEventKey] = useState<string | null>(null);
  const [manualType, setManualType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [manualTime, setManualTime] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualEarlyLeave, setManualEarlyLeave] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
    queryClient.invalidateQueries({ queryKey: ['expanded-month-history'] });
    queryClient.invalidateQueries({ queryKey: ['day-requests-for-clock'] });
  };

  const addManualMutation = useMutation({
    mutationFn: async (params: { dateStr: string }) => {
      if (!user) throw new Error('No se pudo registrar fichaje');
      if (!manualTime) throw new Error('Seleccioná una hora');
      if (!manualReason.trim()) throw new Error('Ingresá un motivo');

      const [hh, mm] = manualTime.split(':').map(Number);
      let calendarDate = params.dateStr;
      if (hh < 5) {
        const next = new Date(`${params.dateStr}T12:00:00`);
        next.setDate(next.getDate() + 1);
        calendarDate = next.toISOString().slice(0, 10);
      }
      const [y, mo, d] = calendarDate.split('-').map(Number);
      const timestamp = new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();

      return createManualClockEntry({
        branchId,
        userId: row.userId,
        entryType: manualType,
        timestamp,
        reason: manualReason.trim(),
        managerId: user.id,
        earlyLeaveAuthorized: manualType === 'clock_out' ? manualEarlyLeave : undefined,
        workDate: params.dateStr,
      });
    },
    onSuccess: () => {
      toast.success('Fichaje manual agregado');
      invalidateAll();
      setManualEventKey(null);
      setManualType('clock_in');
      setManualTime('');
      setManualReason('');
      setManualEarlyLeave(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al guardar'),
  });

  // ── Day detail ──────────────────────────────────────────────────────
  const dayEntries = useMemo(() => {
    return row.sessions.flatMap((s) => [s.clockIn, s.clockOut].filter(Boolean)) as ClockEntry[];
  }, [row.sessions]);

  const dayDateStr = format(selectedDate, 'yyyy-MM-dd');

  // ── Month data ──────────────────────────────────────────────────────
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const { data: monthData } = useFichajeDetalle(branchId, row.userId, selectedDate);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { monthRows, futureScheduledCount, monthMinutes } = useMemo(() => {
    if (!monthData) return { monthRows: [], futureScheduledCount: 0, monthMinutes: 0 };
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const result: Array<RosterRow & { dateStr: string; rawEntries: ClockEntry[] }> = [];
    let futureCount = 0;

    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const schedules = monthData.schedules
        .filter((s) => s.schedule_date === dateStr)
        .map((s) => ({
          id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off ?? false,
        })) as ScheduleInfo[];

      const dayEntries = monthData.entries.filter((e) => e.work_date === dateStr);
      const entries: ClockEntry[] = dayEntries.map((e) => ({
        ...e,
        entry_type: e.entry_type as 'clock_in' | 'clock_out',
        created_at: e.created_at!,
        user_name: row.userName,
        schedule_id: e.schedule_id ?? null,
        resolved_type: (e.resolved_type as ClockEntry['resolved_type']) ?? null,
        anomaly_type: e.anomaly_type ?? null,
      }));

      const req = monthData.requests.find((r) => r.request_date === dateStr);
      const reqArr = req
        ? [{ userId: row.userId, requestType: req.request_type, status: req.status }]
        : [];

      if (entries.length === 0 && schedules.length === 0 && reqArr.length === 0) continue;
      const isFuture = dateStr > todayStr;
      if (isFuture && entries.length === 0) {
        if (schedules.length > 0) futureCount++;
        continue;
      }

      const scheduleMap = new Map<string, ScheduleInfo[]>();
      if (schedules.length > 0) scheduleMap.set(row.userId, schedules);

      const rows = buildDayRoster(
        entries,
        scheduleMap,
        [{ userId: row.userId, userName: row.userName }],
        reqArr,
        day,
        windowConfig,
      );

      for (const r of rows) {
        result.push({ ...r, dateStr, rawEntries: entries });
      }
    }

    const sorted = result.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    const minutes = sorted.reduce((sum, r) => {
      if (r.request && r.sessions.length === 0) return sum + (r.totalMinutes || 0);
      const closedOnly = r.sessions.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
      return sum + closedOnly;
    }, 0);

    return { monthRows: sorted, futureScheduledCount: futureCount, monthMinutes: minutes };
  }, [monthData, monthStart, monthEnd, row.userId, row.userName, windowConfig, todayStr]);

  // ── Manual entry form (inline) ─────────────────────────────────────
  const ManualEntryForm = ({ dateStr, eventKey }: { dateStr: string; eventKey: string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-muted/40 rounded p-2">
      <div>
        <Label className="text-[10px]">Tipo</Label>
        <Select value={manualType} onValueChange={(v) => setManualType(v as 'clock_in' | 'clock_out')}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="clock_in">Entrada</SelectItem>
            <SelectItem value="clock_out">Salida</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px]">Hora</Label>
        <Input type="time" value={manualTime} onChange={(ev) => setManualTime(ev.target.value)} className="h-8 text-xs" />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-[10px]">Motivo *</Label>
        <Input value={manualReason} onChange={(ev) => setManualReason(ev.target.value)} placeholder="Motivo de la corrección" className="h-8 text-xs" />
      </div>
      {manualType === 'clock_out' && (
        <div className="sm:col-span-4 flex items-center gap-2">
          <Checkbox id={`manual-early-${eventKey}`} checked={manualEarlyLeave} onCheckedChange={(c) => setManualEarlyLeave(!!c)} />
          <Label htmlFor={`manual-early-${eventKey}`} className="text-[10px] cursor-pointer">
            Retiro anticipado autorizado (no afecta presentismo)
          </Label>
        </div>
      )}
      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setManualEventKey(null)}>Cancelar</Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => addManualMutation.mutate({ dateStr })} disabled={addManualMutation.isPending || !manualReason.trim() || !manualTime}>
          {addManualMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/20 border-t">
      {/* ── Section 1: Day detail ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Detalle del día — {format(selectedDate, 'dd/MM/yyyy')}
          </p>
          {canEdit && manualEventKey !== `day-${dayDateStr}` && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setManualEventKey(`day-${dayDateStr}`);
                setManualType('clock_in');
                setManualTime('');
                setManualReason('');
                setManualEarlyLeave(false);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Fichaje manual
            </Button>
          )}
        </div>

        {canEdit && manualEventKey === `day-${dayDateStr}` && (
          <ManualEntryForm dateStr={dayDateStr} eventKey={`day-${dayDateStr}`} />
        )}

        {dayEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin fichajes en este turno</p>
        ) : (
          <div className="space-y-1.5">
            {dayEntries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 border rounded p-2 bg-background">
                {e.photo_url ? (
                  <button onClick={() => setPhotoPreview(e)} className="relative" title="Ver foto">
                    <img src={e.photo_url} alt="Foto fichaje" className="w-10 h-10 rounded object-cover" />
                    <span className="absolute -bottom-1 -right-1 bg-background border rounded-full p-0.5">
                      <Camera className="w-2.5 h-2.5" />
                    </span>
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                    Sin foto
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs">
                    {format(new Date(e.created_at), 'HH:mm')} — {e.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.is_manual && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
                        <Hand className="w-3 h-3" />
                        Manual{e.manual_reason ? ` · ${e.manual_reason}` : ''}
                      </span>
                    )}
                    {e.anomaly_type && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        {e.anomaly_type === 'auto_close' ? 'Cierre automático' : e.anomaly_type}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="inline-flex gap-1 flex-shrink-0">
                    {onEditEntry && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onEditEntry(e); }}
                        className="p-1 rounded hover:bg-muted"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteEntry && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e); }}
                        className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Monthly history (collapsible) ───────────────── */}
      <Collapsible open={monthOpen} onOpenChange={setMonthOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full pt-2 border-t text-left">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${monthOpen ? 'rotate-180' : ''}`} />
            <span className="text-xs font-medium text-muted-foreground">
              Historial del mes
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {monthRows.length} turno{monthRows.length !== 1 ? 's' : ''} · {formatDuration(monthMinutes)}
              {futureScheduledCount > 0 && ` · ${futureScheduledCount} pendiente${futureScheduledCount !== 1 ? 's' : ''}`}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            {monthRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros del mes</p>
            ) : (
              <div className="overflow-x-auto border rounded-md bg-background">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1.5 px-2 text-left font-medium w-20">Fecha</th>
                      <th className="py-1.5 px-2 text-left font-medium">Turno</th>
                      <th className="py-1.5 px-2 text-left font-medium">Entrada</th>
                      <th className="py-1.5 px-2 text-left font-medium">Salida</th>
                      <th className="py-1.5 px-2 text-left font-medium">Estado</th>
                      <th className="py-1.5 px-2 text-right font-medium">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((r) => {
                      const eventKey = `${r.dateStr}-${r.rowKey}`;
                      const isOpen = openEventKey === eventKey;
                      const eventTotal =
                        r.request && r.sessions.length === 0
                          ? r.totalMinutes || 0
                          : r.sessions.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
                      const eventEntries = r.sessions.flatMap((s) =>
                        [s.clockIn, s.clockOut].filter(Boolean),
                      ) as ClockEntry[];

                      return (
                        <Fragment key={eventKey}>
                          <tr
                            className="border-b hover:bg-muted/40 cursor-pointer"
                            onClick={() => setOpenEventKey(isOpen ? null : eventKey)}
                          >
                            <td className="py-1.5 px-2">
                              <span className="inline-flex items-center gap-1.5">
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                />
                                {format(new Date(`${r.dateStr}T00:00:00`), 'dd/MM')}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-mono">{r.shiftLabel}</td>
                            <td className="py-1.5 px-2 font-mono">{r.entryTime ?? '—'}</td>
                            <td className="py-1.5 px-2 font-mono">{r.exitTime ?? '—'}</td>
                            <td className="py-1.5 px-2">
                              <span className="inline-flex items-center gap-1">
                                {STATUS_LABEL[r.status] ?? r.status}
                                {r.anomalyDetail && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                {r.hasManualEntry && <Hand className="w-2.5 h-2.5 text-blue-500" />}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">
                              {eventTotal > 0 ? formatDuration(eventTotal) : '—'}
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="border-b">
                              <td colSpan={6} className="p-2 bg-muted/10">
                                <div className="space-y-2">
                                  {canEdit && (
                                    <div className="flex items-center justify-between">
                                      <p className="text-[11px] text-muted-foreground">Correcciones</p>
                                      {manualEventKey !== eventKey ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={(ev) => {
                                            ev.stopPropagation();
                                            setManualEventKey(eventKey);
                                            setManualType('clock_in');
                                            setManualTime('');
                                            setManualReason('');
                                            setManualEarlyLeave(false);
                                          }}
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Fichaje manual
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={(ev) => { ev.stopPropagation(); setManualEventKey(null); }}
                                        >
                                          Cancelar
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {canEdit && manualEventKey === eventKey && (
                                    <ManualEntryForm dateStr={r.dateStr} eventKey={eventKey} />
                                  )}

                                  <p className="text-[11px] text-muted-foreground">Fichajes del turno</p>
                                  {eventEntries.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground">Sin fichajes en este turno</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {eventEntries.map((e) => (
                                        <div key={e.id} className="border rounded p-2 bg-background space-y-2">
                                          <div className="flex items-center gap-3">
                                            {e.photo_url ? (
                                              <button onClick={() => setPhotoPreview(e)} className="relative" title="Ver foto">
                                                <img src={e.photo_url} alt="Foto fichaje" className="w-12 h-12 rounded object-cover" />
                                                <span className="absolute -bottom-1 -right-1 bg-background border rounded-full p-0.5">
                                                  <Camera className="w-2.5 h-2.5" />
                                                </span>
                                              </button>
                                            ) : (
                                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                                                Sin foto
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="font-mono text-[11px]">
                                                {format(new Date(e.created_at), 'HH:mm')} — {e.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                                              </p>
                                              {e.is_manual && (
                                                <p className="text-[10px] text-blue-600 inline-flex items-center gap-1">
                                                  <Hand className="w-2.5 h-2.5" />
                                                  Manual{e.manual_reason ? ` · ${e.manual_reason}` : ''}
                                                </p>
                                              )}
                                              {e.anomaly_type && (
                                                <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                                                  <AlertTriangle className="w-2.5 h-2.5" />
                                                  {e.anomaly_type === 'auto_close' ? 'Cierre automático' : e.anomaly_type}
                                                </p>
                                              )}
                                            </div>
                                            {canEdit && (
                                              <div className="inline-flex gap-1">
                                                {onEditEntry && (
                                                  <button onClick={(ev) => { ev.stopPropagation(); onEditEntry(e); }} className="p-1 rounded hover:bg-muted" title="Editar">
                                                    <Pencil className="w-3 h-3" />
                                                  </button>
                                                )}
                                                {onDeleteEntry && (
                                                  <button onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e); }} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive" title="Eliminar">
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Photo preview dialog */}
      <Dialog open={!!photoPreview} onOpenChange={(open) => { if (!open) setPhotoPreview(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de fichaje</DialogTitle>
          </DialogHeader>
          {photoPreview?.photo_url && (
            <div className="space-y-3">
              <img src={photoPreview.photo_url} alt="Foto fichaje" className="w-full max-h-[60vh] object-contain rounded-md bg-muted" />
              <p className="text-xs text-muted-foreground font-mono">
                {format(new Date(photoPreview.created_at), 'dd/MM HH:mm')} · {photoPreview.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
