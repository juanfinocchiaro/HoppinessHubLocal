import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePagoFecha } from '@/services/financialService';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pagoId: string;
  currentDate: string;
}

export function EditarFechaPagoModal({ open, onOpenChange, pagoId, currentDate }: Props) {
  const [fecha, setFecha] = useState(currentDate);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => updatePagoFecha(pagoId, fecha),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['resumen-proveedor'] });
      qc.invalidateQueries({ queryKey: ['pagos-proveedor'] });
      toast.success('Fecha actualizada');
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Editar fecha del pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !fecha}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
