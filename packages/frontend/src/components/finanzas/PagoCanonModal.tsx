import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { usePagoCanonMutations } from '@/hooks/useCanonLiquidaciones';
import { MEDIO_PAGO_OPTIONS } from '@/types/compra';
import type { CanonLiquidacion } from '@/types/ventas';

interface PagoCanonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canon: CanonLiquidacion | null;
}

export function PagoCanonModal({ open, onOpenChange, canon }: PagoCanonModalProps) {
  const { create } = usePagoCanonMutations();
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'transfer',
    reference: '',
    notes: '',
  });

  const saldo = canon?.pending_balance ?? 0;

  const handleSubmit = async () => {
    if (!canon || !form.amount) return;
    await create.mutateAsync({
      canon_settlement_id: canon.id,
      branch_id: canon.branch_id,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Canon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted text-sm">
            <p>
              Total Canon: <strong>$ {Number(canon?.total_canon).toLocaleString('es-AR')}</strong>
            </p>
            <p>
              Saldo pendiente:{' '}
              <strong className="text-destructive">
                $ {Number(saldo).toLocaleString('es-AR')}
              </strong>
            </p>
          </div>

          <div>
            <Label>Monto a pagar *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder={`Máx $ ${Number(saldo).toLocaleString('es-AR')}`}
            />
          </div>

          <div>
            <Label>Fecha de pago</Label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={(e) => set('payment_date', e.target.value)}
            />
          </div>

          <div>
            <Label>Medio de pago</Label>
            <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIO_PAGO_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Referencia</Label>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} />
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.amount}>
              {create.isPending ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
