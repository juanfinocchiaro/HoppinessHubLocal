import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  ExternalLink,
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Settings2,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getClockInUrl } from '@/lib/constants';
import { fetchBranchClockInfo, fetchBranchStaffForClock } from '@/services/hrService';
import { supabase } from '@/services/supabaseClient';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { useClockMutations } from '@/hooks/useClockMutations';
import { useClockEntries, useDaySchedules, useDayRequests } from '@/hooks/useClockEntries';
import { buildDayRoster } from '@/components/local/clockins/helpers';
import { DEFAULT_WINDOW, type WindowConfig } from '@/components/local/clockins/constants';
import { DayOverviewBar } from '@/components/local/clockins/DayOverviewBar';
import { RosterTable } from '@/components/local/clockins/RosterTable';
import { RosterMobileList } from '@/components/local/clockins/RosterMobileList';
import { EditEntryDialog } from '@/components/local/clockins/EditEntryDialog';
import { DeleteEntryDialog } from '@/components/local/clockins/DeleteEntryDialog';
import { AddManualEntryForm } from '@/components/local/clockins/AddManualEntryForm';
import type { ClockEntry } from '@/components/local/clockins/types';
import { createManualClockEntry } from '@/services/hrService';
import { useAuth } from '@/hooks/useAuth';

export default function ClockInsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { isSuperadmin, local } = useDynamicPermissions(branchId);
  const canEdit = isSuperadmin || local.canViewTeam;
  const [date, setDate] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);
  const isToday = isSameDay(date, today);
  const queryClient = useQueryClient();

  const [qr, setQr] = useState(false);
  const [editEntry, setEditEntry] = useState<ClockEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ClockEntry | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [leave, setLeave] = useState<{ userId: string; userName: string } | null>(null);
  const [leaveType, setLeaveType] = useState<'sick_leave' | 'vacation' | 'day_off'>('sick_leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [photoViewer, setPhotoViewer] = useState<{
    userName: string;
    shiftLabel: string;
    entries: ClockEntry[];
  } | null>(null);

  // Window config
  const { data: branch } = useQuery({
    queryKey: ['branch-clock-info', branchId],
    queryFn: () => fetchBranchClockInfo(branchId!),
    enabled: !!branchId,
  });

  const windowConfig: WindowConfig = useMemo(
    () => ({
      beforeMin: (branch as any)?.clock_window_before_min ?? DEFAULT_WINDOW.beforeMin,
      afterMin: (branch as any)?.clock_window_after_min ?? DEFAULT_WINDOW.afterMin,
    }),
    [branch],
  );

  const [wcBefore, setWcBefore] = useState<number | null>(null);
  const [wcAfter, setWcAfter] = useState<number | null>(null);
  const [wcOpen, setWcOpen] = useState(false);

  const saveWindowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('branches')
        .update({
          clock_window_before_min: wcBefore ?? windowConfig.beforeMin,
          clock_window_after_min: wcAfter ?? windowConfig.afterMin,
        })
        .eq('id', branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-clock-info'] });
      queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
      toast.success('Ventana de fichaje actualizada');
      setWcOpen(false);
    },
    onError: () => toast.error('Error al guardar ventana'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['branch-staff-for-clock', branchId],
    queryFn: () => fetchBranchStaffForClock(branchId!),
    enabled: !!branchId && canEdit,
  });
  const { data: entries = [] } = useClockEntries(
    branchId,
    date,
    'roster',
    isToday ? 30000 : undefined,
    windowConfig,
  );
  const { data: schedules = new Map() } = useDaySchedules(branchId, date);
  const { data: requests = [] } = useDayRequests(branchId, date);

  const rows = useMemo(
    () => buildDayRoster(entries, schedules, staff, requests, date, windowConfig),
    [entries, schedules, staff, requests, date, windowConfig],
  );



  const close = () => {
    setEditEntry(null);
    setDeleteEntry(null);
    setLeave(null);
    setLeaveReason('');
  };
  const { editMutation, deleteMutation, leaveMutation } = useClockMutations({
    branchId: branchId!,
    onSuccess: close,
  });

  const manualAddMutation = useMutation({
    mutationFn: (params: {
      userId: string;
      entryType: 'clock_in' | 'clock_out';
      timestamp: string;
      reason: string;
      earlyLeaveAuthorized?: boolean;
      workDate?: string;
    }) => createManualClockEntry({
      branchId: branchId!,
      userId: params.userId,
      entryType: params.entryType,
      timestamp: params.timestamp,
      reason: params.reason,
      managerId: user!.id,
      earlyLeaveAuthorized: params.earlyLeaveAuthorized,
      workDate: params.workDate,
    }),
    onSuccess: () => {
      toast.success('Fichaje manual agregado');
      setShowManualAdd(false);
      queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
    },
    onError: () => toast.error('Error al guardar fichaje manual'),
  });
  if (!branchId) return null;
  const clockUrl = branch?.clock_code ? getClockInUrl(branch.clock_code) : '';

  const actions = canEdit ? (
    <>
      {branch?.clock_code && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setQr(true)}
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">QR</span>
        </Button>
      )}
      <Popover
        open={wcOpen}
        onOpenChange={(o) => {
          setWcOpen(o);
          if (o) {
            setWcBefore(windowConfig.beforeMin);
            setWcAfter(windowConfig.afterMin);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ventana</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-4" align="end">
          <div>
            <p className="text-sm font-medium">Ventana de fichaje</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los fichajes dentro de esta ventana se asignan al turno. Los que caigan fuera
              aparecen como "No programado".
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Margen antes del turno (min)</Label>
              <Input
                type="number"
                min={0}
                max={480}
                value={wcBefore ?? windowConfig.beforeMin}
                onChange={(e) => setWcBefore(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margen después del turno (min)</Label>
              <Input
                type="number"
                min={0}
                max={480}
                value={wcAfter ?? windowConfig.afterMin}
                onChange={(e) => setWcAfter(Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>
          <Button
            className="w-full"
            size="sm"
            onClick={() => saveWindowMutation.mutate()}
            disabled={saveWindowMutation.isPending}
          >
            {saveWindowMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </PopoverContent>
        </Popover>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={() => setShowManualAdd(true)}
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Fichaje manual</span>
      </Button>
    </>
  ) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fichajes"
        subtitle="Control de asistencia del personal"
        actions={actions}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setDate(subDays(date, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            setDate(new Date(y, m - 1, d));
          }}
          className="w-auto"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setDate(addDays(date, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        {!isToday && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setDate(new Date())}
          >
            <CalendarDays className="w-4 h-4" />
            Hoy
          </Button>
        )}
      </div>
      <DayOverviewBar rows={rows} isToday={isToday} />

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <RosterTable
              rows={rows}
              branchId={branchId}
              selectedDate={date}
              isToday={isToday}
              canEdit={canEdit}
              windowConfig={windowConfig}
              onEditEntry={setEditEntry}
              onDeleteEntry={setDeleteEntry}
              onMarkLeave={(uid, name) => {
                setLeave({ userId: uid, userName: name });
                setLeaveType('sick_leave');
                setLeaveReason('');
              }}
              onOpenPhotos={setPhotoViewer}
            />
          </div>
          <div className="md:hidden">
            <RosterMobileList
              rows={rows}
              branchId={branchId}
              selectedDate={date}
              isToday={isToday}
              canEdit={canEdit}
              windowConfig={windowConfig}
              onMarkLeave={(uid, name) => {
                setLeave({ userId: uid, userName: name });
                setLeaveType('sick_leave');
                setLeaveReason('');
              }}
              onOpenPhotos={setPhotoViewer}
              onEditEntry={setEditEntry}
              onDeleteEntry={setDeleteEntry}
            />
          </div>
        </CardContent>
      </Card>

      <EditEntryDialog
        entry={editEntry}
        isPending={editMutation.isPending}
        onSave={(p) => editMutation.mutate(p)}
        onClose={() => setEditEntry(null)}
      />
      <DeleteEntryDialog
        entry={deleteEntry}
        isPending={deleteMutation.isPending}
        onConfirm={(id) => deleteMutation.mutate(id)}
        onClose={() => setDeleteEntry(null)}
      />

      {/* Global manual entry dialog */}
      <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo fichaje manual</DialogTitle>
          </DialogHeader>
          <AddManualEntryForm
            staff={staff}
            isPending={manualAddMutation.isPending}
            onSubmit={(params) => manualAddMutation.mutate(params)}
            onCancel={() => setShowManualAdd(false)}
          />
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={qr} onOpenChange={setQr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Fichaje - {branch?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG id="print-qr-svg" value={clockUrl} size={200} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(clockUrl);
                  toast.success('Link copiado');
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={clockUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.querySelector('#print-qr-svg') as SVGElement;
                  if (!el) return;
                  const w = window.open('', '_blank');
                  if (!w) return;
                  w.document.write(
                    `<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh"><div style="text-align:center"><h2>${branch?.name}</h2>${new XMLSerializer().serializeToString(el)}<p>Escaneá para fichar</p></div></body><script>setTimeout(()=>print(),300)</script></html>`,
                  );
                  w.document.close();
                }}
              >
                <Printer className="w-4 h-4 mr-1" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos dialog */}
      <Dialog
        open={!!photoViewer}
        onOpenChange={(o) => {
          if (!o) setPhotoViewer(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotos de fichaje - {photoViewer?.userName}</DialogTitle>
          </DialogHeader>
          {photoViewer && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Turno: {photoViewer.shiftLabel}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-auto pr-1">
                {photoViewer.entries.map((e) => (
                  <div key={e.id} className="border rounded-lg p-2 space-y-2">
                    {e.photo_url ? (
                      <a href={e.photo_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={e.photo_url}
                          alt="Foto fichaje"
                          className="w-full h-40 object-cover rounded-md bg-muted"
                        />
                      </a>
                    ) : (
                      <div className="w-full h-40 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono">
                        {format(new Date(e.created_at), 'HH:mm')}
                      </span>
                      <span className="text-muted-foreground">
                        {e.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                      </span>
                    </div>
                    {e.is_manual && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px]">
                          Manual
                        </Badge>
                        {e.manual_reason && (
                          <p className="text-[11px] text-muted-foreground">{e.manual_reason}</p>
                        )}
                        {e.original_created_at && (
                          <p className="text-[11px] text-muted-foreground">
                            Antes: {format(new Date(e.original_created_at), 'HH:mm')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave dialog */}
      <Dialog
        open={!!leave}
        onOpenChange={(o) => {
          if (!o) setLeave(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar licencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Marcar a <b>{leave?.userName}</b> con licencia para el{' '}
              {format(date, "d 'de' MMMM", { locale: es })}
            </p>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={leaveType}
                onValueChange={(v) => setLeaveType(v as typeof leaveType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick_leave">Enfermedad</SelectItem>
                  <SelectItem value="day_off">Día libre</SelectItem>
                  <SelectItem value="vacation">Vacaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Ej: certificado médico"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeave(null)}>
              Cancelar
            </Button>
            <Button
              disabled={leaveMutation.isPending}
              onClick={() =>
                leave &&
                leaveMutation.mutate({
                  userId: leave.userId,
                  date: format(date, 'yyyy-MM-dd'),
                  requestType: leaveType,
                  reason: leaveReason || undefined,
                })
              }
            >
              {leaveMutation.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
