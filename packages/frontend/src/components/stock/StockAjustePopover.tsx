import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAjusteInline } from '@/hooks/pos/useStock';

const MOTIVOS = [
  { value: 'Conteo físico', label: 'Conteo físico' },
  { value: 'Merma/rotura', label: 'Merma / rotura' },
  { value: 'Recepción', label: 'Recepción' },
  { value: 'Otro', label: 'Otro' },
];

interface StockAjustePopoverProps {
  branchId: string;
  insumoId: string;
  insumoNombre: string;
  cantidadActual: number;
  unidad: string;
  children: React.ReactNode;
}

export function StockAjustePopover({
  branchId,
  insumoId,
  insumoNombre,
  cantidadActual,
  unidad,
  children,
}: StockAjustePopoverProps) {
  const [open, setOpen] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [motivo, setMotivo] = useState('Conteo físico');
  const [nota, setNota] = useState('');
  const ajuste = useAjusteInline(branchId);

  const handleSave = () => {
    const val = parseFloat(nuevaCantidad);
    if (isNaN(val) || val < 0) return;
    ajuste.mutate(
      { insumo_id: insumoId, cantidad_nueva: val, motivo, nota },
      {
        onSuccess: () => {
          setOpen(false);
          setNuevaCantidad('');
          setNota('');
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">{insumoNombre}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Actual:</span>
            <span className="font-mono font-medium">
              {cantidadActual} {unidad}
            </span>
          </div>

          <div>
            <Label className="text-xs">Nuevo stock</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              placeholder="0"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">Motivo</Label>
            <RadioGroup value={motivo} onValueChange={setMotivo} className="mt-1 space-y-1">
              {MOTIVOS.map((m) => (
                <div key={m.value} className="flex items-center gap-2">
                  <RadioGroupItem value={m.value} id={`mot-${m.value}`} />
                  <Label htmlFor={`mot-${m.value}`} className="text-xs font-normal">
                    {m.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs">Nota (opcional)</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
              placeholder="Detalle adicional..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={ajuste.isPending || !nuevaCantidad}>
              Guardar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
