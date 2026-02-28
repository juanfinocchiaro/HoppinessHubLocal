import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronDown, Camera, Pencil, Trash2 } from 'lucide-react';
import { createManualClockEntry, updateClockEntry } from '@/services/hrService';
import { useAuth } from '@/hooks/useAuth';
import { useFichajeDetalle } from '@/hooks/useFichajeDetalle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildDayRoster, formatDuration } from './helpers';
import { STATUS_LABEL, type WindowConfig, DEFAULT_WINDOW } from './constants';
import type { ClockEntry, RosterRow, ScheduleInfo } from './types';

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
  const [openEventKey, setOpenEventKey] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<ClockEntry | null>(null);
  const [editType, setEditType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [editTime, setEditTime] = useState('');
  const [editReason, setEditReason] = useState('');
  const [photoPreview, setPhotoPreview] = useState<ClockEntry | null>(null);
  const [manualEventKey, setManualEventKey] = useState<string | null>(null);
  const [manualType, setManualType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [manualTime, setManualTime] = useState('');
  const [manualReason, setManualReason] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
    queryClient.invalidateQueries({ queryKey: ['expanded-month-history'] });
    queryClient.invalidateQueries({ queryKey: ['day-requests-for-clock'] });
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingEntry || !user) throw new Error('No se pudo editar el fichaje');
      if (!editReason.trim()) throw new Error('Ingresá un motivo');
      if (!editTime) throw new Error('Seleccioná una hora');
      const base = new Date(editingEntry.created_at);
      const [h, m] = editTime.split(':').map(Number);
      const editedDate = new Date(base);
      editedDate.setHours(h, m, 0, 0);

      return updateClockEntry(
        editingEntry.id,
        { entry_type: editType, created_at: editedDate.toISOString(), reason: editReason.trim() },
        user.id,
        editingEntry.original_created_at || editingEntry.created_at,
      );
    },
    onSuccess: () => {
      invalidateAll();
      setEditingEntry(null);
      setEditReason('');
      setEditTime('');
    },
  });

  const addManualMutation = useMutation({
    mutationFn: async (params: { dateStr: string }) => {
      if (!user) throw new Error('No se pudo registrar fichaje');
      if (!manualTime) throw new Error('Seleccioná una hora');
      if (!manualReason.trim()) throw new Error('Ingresá un motivo');

      const [y, mo, d] = params.dateStr.split('-').map(Number);
      const [hh, mm] = manualTime.split(':').map(Number);
      const timestamp = new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();

      return createManualClockEntry({
        branchId,
        userId: row.userId,
        entryType: manualType,
        timestamp,
        reason: manualReason.trim(),
        managerId: user.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setManualEventKey(null);
      setManualType('clock_in');
      setManualTime('');
      setManualReason('');
    },
  });

  const startInlineEdit = (e: ClockEntry) => {
    if (!user && onEditEntry) {
      onEditEntry(e);
      return;
    }
    setEditingEntry(e);
    setEditType(e.entry_type);
    setEditReason(e.manual_reason || '');
    setEditTime(format(new Date(e.created_at), 'HH:mm'));
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const { data: monthData } = useFichajeDetalle(branchId, row.userId, selectedDate);

  const monthRows = useMemo(() => {
    if (!monthData) return [];
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const result: Array<RosterRow & { dateStr: string; rawEntries: ClockEntry[] }> = [];

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
      const scheduleMap = new Map<string, ScheduleInfo[]>();
      if (schedules.length > 0) scheduleMap.set(row.userId, schedules);

      if (entries.length === 0 && schedules.length === 0 && reqArr.length === 0) continue;

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

    return result.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [monthData, monthStart, monthEnd, row.userId, row.userName, windowConfig]);

  const monthMinutes = useMemo(
    () =>
      monthRows.reduce((sum, r) => {
        if (r.request && r.sessions.length === 0) return sum + (r.totalMinutes || 0);
        const closedOnly = r.sessions.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
        return sum + closedOnly;
      }, 0),
    [monthRows],
  );

  return (
    <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/20 border-t">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Historial del mes</p>
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
                          {STATUS_LABEL[r.status] ?? r.status}
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
                                      }}
                                    >
                                      + Fichaje manual
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        setManualEventKey(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  )}
                                </div>
                              )}

                              {canEdit && manualEventKey === eventKey && (
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-muted/40 rounded p-2">
                                  <div>
                                    <Label className="text-[10px]">Tipo</Label>
                                    <select
                                      value={manualType}
                                      onChange={(ev) =>
                                        setManualType(
                                          ev.target.value as 'clock_in' | 'clock_out',
                                        )
                                      }
                                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                                    >
                                      <option value="clock_in">Entrada</option>
                                      <option value="clock_out">Salida</option>
                                    </select>
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Hora</Label>
                                    <Input
                                      type="time"
                                      value={manualTime}
                                      onChange={(ev) => setManualTime(ev.target.value)}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <Label className="text-[10px]">Motivo</Label>
                                    <Input
                                      value={manualReason}
                                      onChange={(ev) => setManualReason(ev.target.value)}
                                      placeholder="Motivo de la corrección"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="sm:col-span-4 flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setManualEventKey(null)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        addManualMutation.mutate({ dateStr: r.dateStr })
                                      }
                                      disabled={addManualMutation.isPending}
                                    >
                                      {addManualMutation.isPending
                                        ? 'Guardando...'
                                        : 'Guardar manual'}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <p className="text-[11px] text-muted-foreground">
                                Fichajes del turno
                              </p>
                              {eventEntries.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Sin fichajes en este turno
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {eventEntries.map((e) => (
                                    <div
                                      key={e.id}
                                      className="border rounded p-2 bg-background space-y-2"
                                    >
                                      <div className="flex items-center gap-3">
                                        {e.photo_url ? (
                                          <button
                                            onClick={() => setPhotoPreview(e)}
                                            className="relative"
                                            title="Ver foto"
                                          >
                                            <img
                                              src={e.photo_url}
                                              alt="Foto fichaje"
                                              className="w-12 h-12 rounded object-cover"
                                            />
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
                                            {format(new Date(e.created_at), 'HH:mm')} -{' '}
                                            {e.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                                          </p>
                                          {e.is_manual && (
                                            <p className="text-[10px] text-amber-700">
                                              Manual
                                              {e.manual_reason ? ` · ${e.manual_reason}` : ''}
                                            </p>
                                          )}
                                        </div>
                                        {canEdit && (
                                          <div className="inline-flex gap-1">
                                            <button
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                startInlineEdit(e);
                                              }}
                                              className="p-1 rounded hover:bg-muted"
                                              title="Editar"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            {onDeleteEntry && (
                                              <button
                                                onClick={(ev) => {
                                                  ev.stopPropagation();
                                                  onDeleteEntry(e);
                                                }}
                                                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                                                title="Eliminar"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {canEdit && editingEntry?.id === e.id && (
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-muted/40 rounded p-2">
                                          <div>
                                            <Label className="text-[10px]">Tipo</Label>
                                            <select
                                              value={editType}
                                              onChange={(ev) =>
                                                setEditType(
                                                  ev.target.value as 'clock_in' | 'clock_out',
                                                )
                                              }
                                              className="h-8 w-full rounded border bg-background px-2 text-xs"
                                            >
                                              <option value="clock_in">Entrada</option>
                                              <option value="clock_out">Salida</option>
                                            </select>
                                          </div>
                                          <div>
                                            <Label className="text-[10px]">Hora</Label>
                                            <Input
                                              type="time"
                                              value={editTime}
                                              onChange={(ev) => setEditTime(ev.target.value)}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="sm:col-span-2">
                                            <Label className="text-[10px]">Motivo</Label>
                                            <Input
                                              value={editReason}
                                              onChange={(ev) => setEditReason(ev.target.value)}
                                              placeholder="Motivo de la corrección"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="sm:col-span-4 flex justify-end gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() => setEditingEntry(null)}
                                            >
                                              Cancelar
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() => editMutation.mutate()}
                                              disabled={editMutation.isPending}
                                            >
                                              {editMutation.isPending
                                                ? 'Guardando...'
                                                : 'Guardar'}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
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

      <div className="pt-2 border-t flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Horas del mes:</span>
          <span className="text-sm font-semibold">{formatDuration(monthMinutes)}</span>
        </div>
      </div>

      <Dialog
        open={!!photoPreview}
        onOpenChange={(open) => {
          if (!open) setPhotoPreview(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de fichaje</DialogTitle>
          </DialogHeader>
          {photoPreview?.photo_url && (
            <div className="space-y-3">
              <img
                src={photoPreview.photo_url}
                alt="Foto fichaje"
                className="w-full max-h-[60vh] object-contain rounded-md bg-muted"
              />
              <p className="text-xs text-muted-foreground font-mono">
                {format(new Date(photoPreview.created_at), 'dd/MM HH:mm')} ·{' '}
                {photoPreview.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
