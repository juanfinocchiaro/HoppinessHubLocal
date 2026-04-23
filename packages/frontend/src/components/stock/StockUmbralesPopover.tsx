import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUpdateUmbrales } from '@/hooks/pos/useStock';

interface StockUmbralesPopoverProps {
  branchId: string;
  insumoId: string;
  insumoNombre: string;
  minActual: number | null;
  critActual: number | null;
  children: React.ReactNode;
}

export function StockUmbralesPopover({
  branchId,
  insumoId,
  insumoNombre,
  minActual,
  critActual,
  children,
}: StockUmbralesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(minActual?.toString() ?? '');
  const [crit, setCrit] = useState(critActual?.toString() ?? '');
  const update = useUpdateUmbrales(branchId);

  const handleSave = () => {
    update.mutate(
      {
        insumo_id: insumoId,
        stock_minimo_local: min ? parseFloat(min) : null,
        stock_critico_local: crit ? parseFloat(crit) : null,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">{insumoNombre}</p>
          <div>
            <Label className="text-xs">Stock mínimo</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Stock crítico</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={crit}
              onChange={(e) => setCrit(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
