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
import { Textarea } from '@/components/ui/textarea';
import {
  useConsumoManualMutations,
  CATEGORIA_PL_OPTIONS,
  TIPO_CONSUMO_OPTIONS,
  type ConsumoManualFormData,
} from '@/hooks/useConsumosManuales';
import { getCurrentPeriodo } from '@/types/compra';
type ConsumoManual = any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  consumo?: ConsumoManual | null;
}

export function ConsumoManualFormModal({ open, onOpenChange, branchId, consumo }: Props) {
  const { create, update } = useConsumoManualMutations();
  const isEdit = !!consumo;

  const [form, setForm] = useState({
    categoria_pl: '',
    monto_consumido: '',
    tipo: 'manual',
    periodo: getCurrentPeriodo(),
    observaciones: '',
  });

  useEffect(() => {
    if (consumo) {
      setForm({
        categoria_pl: consumo.categoria_pl,
        monto_consumido: String(consumo.monto_consumido),
        tipo: consumo.tipo || 'manual',
        periodo: consumo.periodo,
        observaciones: consumo.observaciones || '',
      });
    } else {
      setForm({
        categoria_pl: '',
        monto_consumido: '',
        tipo: 'manual',
        periodo: getCurrentPeriodo(),
        observaciones: '',
      });
    }
  }, [consumo, open]);

  const handleSubmit = async () => {
    if (!form.categoria_pl || !form.monto_consumido) return;

    const payload: ConsumoManualFormData = {
      branch_id: branchId,
      period: form.periodo,
      categoria_pl: form.categoria_pl,
      monto_consumido: parseFloat(form.monto_consumido),
      tipo: form.tipo,
      notes: form.observaciones || undefined,
    };

    if (isEdit) {
      await update.mutateAsync({ id: consumo!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Consumo' : 'Nuevo Consumo Manual'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Período</Label>
            <Input
              value={form.periodo}
              onChange={(e) => setForm({ ...form, periodo: e.target.value })}
              placeholder="YYYY-MM"
            />
          </div>

          <div className="grid gap-2">
            <Label>Categoría P&L *</Label>
            <Select
              value={form.categoria_pl}
              onValueChange={(v) => setForm({ ...form, categoria_pl: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIA_PL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_CONSUMO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Monto *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.monto_consumido}
              onChange={(e) => setForm({ ...form, monto_consumido: e.target.value })}
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
          <Button
            onClick={handleSubmit}
            disabled={
              !form.categoria_pl || !form.monto_consumido || create.isPending || update.isPending
            }
          >
            {isEdit ? 'Guardar' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
