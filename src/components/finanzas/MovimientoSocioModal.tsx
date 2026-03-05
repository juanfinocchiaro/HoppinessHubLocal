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
import {
  useSocioMutations,
  TIPO_MOVIMIENTO_OPTIONS,
  type MovimientoSocioFormData,
} from '@/hooks/useSocios';
import { getCurrentPeriodo } from '@/types/compra';
import type { Tables } from '@/integrations/supabase/types';

type Socio = Tables<'partners'>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  socio: Socio;
}

export function MovimientoSocioModal({ open, onOpenChange, branchId, socio }: Props) {
  const { createMovimiento } = useSocioMutations();

  const [form, setForm] = useState({
    tipo: 'retiro',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    periodo: getCurrentPeriodo(),
    observaciones: '',
  });

  const handleSubmit = async () => {
    if (!form.monto) return;

    const payload: MovimientoSocioFormData = {
      branch_id: branchId,
      socio_id: socio.id,
      tipo: form.tipo,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      periodo: form.periodo,
      observaciones: form.observaciones || undefined,
    };

    await createMovimiento.mutateAsync(payload);
    onOpenChange(false);
    setForm({
      tipo: 'retiro',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      periodo: getCurrentPeriodo(),
      observaciones: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento - {socio.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_MOVIMIENTO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Período</Label>
            <Input
              value={form.periodo}
              onChange={(e) => setForm({ ...form, periodo: e.target.value })}
              placeholder="YYYY-MM"
            />
          </div>

          <div className="grid gap-2">
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!form.monto || createMovimiento.isPending}>
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
