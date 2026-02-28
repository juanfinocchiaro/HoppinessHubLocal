/**
 * ManualIncomeModal - Ingresos manuales a caja (Fase 5)
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import { useAuth } from '@/hooks/useAuth';
import { useAddMovement } from '@/hooks/useCashRegister';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';

interface ManualIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  shiftId?: string;
}

type IncomeType = 'cuenta_corriente' | 'devolucion_vuelto' | 'otro';

export function ManualIncomeModal({
  open,
  onOpenChange,
  branchId,
  shiftId,
}: ManualIncomeModalProps) {
  const { user } = useAuth();
  const [incomeType, setIncomeType] = useState<IncomeType>('cuenta_corriente');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const addMovement = useAddMovement(branchId);

  useEffect(() => {
    if (open) {
      setIncomeType('cuenta_corriente');
      setConcept('');
      setAmount('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !shiftId || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    let fullConcept = concept;
    if (!fullConcept) {
      switch (incomeType) {
        case 'cuenta_corriente':
          fullConcept = 'Cobro cuenta corriente';
          break;
        case 'devolucion_vuelto':
          fullConcept = 'Devolución de vuelto';
          break;
        default:
          fullConcept = 'Ingreso manual';
      }
    }

    try {
      await addMovement.mutateAsync({
        shiftId,
        type: 'income',
        amount: amountNum,
        concept: fullConcept + (notes ? ` - ${notes}` : ''),
        paymentMethod: 'efectivo',
        userId: user.id,
      });
      toast.success('Ingreso registrado correctamente');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Error al registrar el ingreso');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Registrar Ingreso
          </DialogTitle>
          <DialogDescription>Ingreso de efectivo que no proviene de una venta</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de ingreso</Label>
            <RadioGroup
              value={incomeType}
              onValueChange={(v) => setIncomeType(v as IncomeType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cuenta_corriente" id="tipo-cc" />
                <Label htmlFor="tipo-cc" className="cursor-pointer">
                  Cobro cuenta corriente
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="devolucion_vuelto" id="tipo-dv" />
                <Label htmlFor="tipo-dv" className="cursor-pointer">
                  Devolución de vuelto
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="otro" id="tipo-otro" />
                <Label htmlFor="tipo-otro" className="cursor-pointer">
                  Otro ingreso
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept">Concepto {incomeType !== 'otro' && '(opcional)'}</Label>
            <Input
              id="concept"
              placeholder={
                incomeType === 'cuenta_corriente'
                  ? 'Ej: Pago de Juan Pérez'
                  : incomeType === 'devolucion_vuelto'
                    ? 'Ej: Cliente devolvió $500'
                    : 'Describir el ingreso...'
              }
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-amount">Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="income-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
            {amount && <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(amount) || 0)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-notes">Notas (opcional)</Label>
            <Textarea
              id="income-notes"
              placeholder="Detalles adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMovement.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!amount || addMovement.isPending}>
            {addMovement.isPending && <DotsLoader />}
            Registrar Ingreso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
