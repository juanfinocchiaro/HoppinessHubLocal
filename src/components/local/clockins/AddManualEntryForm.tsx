import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

interface StaffMember {
  userId: string;
  userName: string;
}

interface AddManualEntryFormProps {
  staff: StaffMember[];
  defaultUserId?: string;
  isPending: boolean;
  onSubmit: (params: {
    userId: string;
    entryType: 'clock_in' | 'clock_out';
    timestamp: string;
    reason: string;
    earlyLeaveAuthorized?: boolean;
  }) => void;
  onCancel: () => void;
}

export function AddManualEntryForm({
  staff,
  defaultUserId,
  isPending,
  onSubmit,
  onCancel,
}: AddManualEntryFormProps) {
  const now = new Date();
  const [userId, setUserId] = useState(defaultUserId || '');
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [date, setDate] = useState(format(now, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(now, 'HH:mm'));
  const [reason, setReason] = useState('');
  const [earlyLeaveAuthorized, setEarlyLeaveAuthorized] = useState(false);

  const handleSubmit = () => {
    if (!userId) return;
    if (!reason.trim()) return;
    const timestamp = new Date(`${date}T${time}:00`).toISOString();
    onSubmit({
      userId,
      entryType,
      timestamp,
      reason: reason.trim(),
      earlyLeaveAuthorized: entryType === 'clock_out' ? earlyLeaveAuthorized : undefined,
    });
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-amber-50/50 dark:bg-amber-950/20">
      <p className="text-sm font-medium flex items-center gap-1.5">
        <Plus className="w-4 h-4" />
        Nuevo fichaje manual
      </p>

      {!defaultUserId && (
        <div>
          <Label className="text-xs">Empleado</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.userId} value={s.userId}>
                  {s.userName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={entryType} onValueChange={(v) => setEntryType(v as 'clock_in' | 'clock_out')}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clock_in">Entrada</SelectItem>
              <SelectItem value="clock_out">Salida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
        </div>
      </div>

      {entryType === 'clock_out' && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="manual-early-leave"
            checked={earlyLeaveAuthorized}
            onCheckedChange={(c) => setEarlyLeaveAuthorized(!!c)}
          />
          <Label htmlFor="manual-early-leave" className="text-xs cursor-pointer">
            Retiro anticipado autorizado (no afecta presentismo)
          </Label>
        </div>
      )}

      <div>
        <Label className="text-xs">Motivo *</Label>
        <Input
          placeholder="Ej: Olvidó marcar salida"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isPending || !userId || !reason.trim()} className="flex-1">
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
