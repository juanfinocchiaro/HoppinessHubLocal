import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeConsumptionMutations } from '@/hooks/useEmployeeConsumptions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  userId: string;
  userName: string;
}

export function EmployeeConsumptionModal({ open, onOpenChange, branchId, userId, userName }: Props) {
  const { create } = useEmployeeConsumptionMutations();
  const [form, setForm] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    await create.mutateAsync({
      branchId,
      userId,
      amount: parseFloat(form.amount),
      consumptionDate: form.date,
      description: form.description || undefined,
    });
    setForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), description: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Consumo — {userName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Monto *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Ej: Hamburguesa doble + bebida"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.amount || parseFloat(form.amount) <= 0 || create.isPending}
          >
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
