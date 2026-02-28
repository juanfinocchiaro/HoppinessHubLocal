import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    patch: { entry_type?: string; created_at?: string; reason: string };
    originalCreatedAt: string;
  }) => void;
  onClose: () => void;
}

export function EditEntryDialog({ entry, isPending, onSave, onClose }: EditEntryDialogProps) {
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (entry) {
      setEntryType(entry.entry_type);
      setTime(format(new Date(entry.created_at), 'HH:mm'));
      setReason('');
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry || !reason.trim()) return;
    const dateStr = format(new Date(entry.created_at), 'yyyy-MM-dd');
    const newTimestamp = new Date(`${dateStr}T${time}:00`).toISOString();
    onSave({
      entryId: entry.id,
      patch: {
        entry_type: entryType,
        created_at: newTimestamp,
        reason: reason.trim(),
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
            <div>
              <Label className="text-xs">Hora corregida</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
            </div>
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
