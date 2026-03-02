import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ClockEntry } from './types';

interface EditEntryDialogProps {
  entry: ClockEntry | null;
  isPending: boolean;
  onSave: (params: {
    entryId: string;
    patch: { entry_type?: string; created_at?: string; reason: string; work_date?: string; early_leave_authorized?: boolean };
    originalCreatedAt: string;
  }) => void;
  onClose: () => void;
}

export function EditEntryDialog({ entry, isPending, onSave, onClose }: EditEntryDialogProps) {
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [earlyLeaveAuthorized, setEarlyLeaveAuthorized] = useState(false);

  // Check if editing a previous month
  const isRetroactive = (() => {
    if (!date) return false;
    const now = new Date();
    const [y, m] = date.split('-').map(Number);
    return y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1);
  })();

  useEffect(() => {
    if (entry) {
      setEntryType(entry.entry_type);
      // Use work_date as the date source (not derived from created_at)
      const workDate = (entry as any).work_date;
      if (workDate) {
        setDate(workDate);
      } else {
        // Fallback: derive from created_at using local timezone
        setDate(format(new Date(entry.created_at), 'yyyy-MM-dd'));
      }
      setTime(format(new Date(entry.created_at), 'HH:mm'));
      setReason('');
      setEarlyLeaveAuthorized((entry as any).early_leave_authorized ?? false);
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry || !reason.trim()) return;
    // Build timestamp using the selected date + time, interpreted as local
    const newTimestamp = new Date(`${date}T${time}:00`).toISOString();
    onSave({
      entryId: entry.id,
      patch: {
        entry_type: entryType,
        created_at: newTimestamp,
        reason: reason.trim(),
        work_date: date,
        early_leave_authorized: entryType === 'clock_out' ? earlyLeaveAuthorized : undefined,
      },
      originalCreatedAt: entry.created_at,
    });
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Corregir fichaje</DialogTitle>
        </DialogHeader>
        {entry && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {entry.user_name} &mdash;{' '}
              {format(new Date(entry.created_at), "EEEE dd/MM 'a las' HH:mm", { locale: es })}
            </p>

            {isRetroactive && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-700 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Estás editando un fichaje de un período anterior. Esto puede afectar una liquidación ya procesada.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as 'clock_in' | 'clock_out')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clock_in">Entrada</SelectItem>
                  <SelectItem value="clock_out">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fecha (jornada operativa)</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Hora corregida</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
              </div>
            </div>

            {entryType === 'clock_out' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="early-leave-auth"
                  checked={earlyLeaveAuthorized}
                  onCheckedChange={(c) => setEarlyLeaveAuthorized(!!c)}
                />
                <Label htmlFor="early-leave-auth" className="text-xs cursor-pointer">
                  Retiro anticipado autorizado (no afecta presentismo)
                </Label>
              </div>
            )}

            <div>
              <Label className="text-xs">Motivo de la corrección *</Label>
              <Input
                placeholder="Ej: Marcó entrada en vez de salida"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={isPending || !reason.trim()} className="flex-1">
                {isPending ? 'Guardando...' : 'Guardar corrección'}
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
