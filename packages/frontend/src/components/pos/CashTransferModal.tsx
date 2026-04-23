/**
 * CashTransferModal - Atomic transfer between cash registers
 * Used for Alivio → Fuerte and Fuerte → final withdrawal
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTransferBetweenRegisters, CashRegisterShift } from '@/hooks/useCashRegister';

interface CashTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  sourceShift: CashRegisterShift | null;
  destShift: CashRegisterShift | null;
  maxAmount: number;
  title: string;
  description: string;
  conceptPrefix: string;
}

export function CashTransferModal({
  open,
  onOpenChange,
  branchId,
  sourceShift,
  destShift,
  maxAmount,
  title,
  description,
  conceptPrefix,
}: CashTransferModalProps) {
  const { user } = useAuth();
  const transfer = useTransferBetweenRegisters(branchId);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const parsedAmount = parseFloat(amount) || 0;

  const handleConfirm = async () => {
    if (!user || !sourceShift || parsedAmount <= 0 || parsedAmount > maxAmount) return;

    try {
      await transfer.mutateAsync({
        sourceShiftId: sourceShift.id,
        destShiftId: destShift?.id ?? null,
        amount: parsedAmount,
        concept: `${conceptPrefix}${notes ? ` - ${notes}` : ''}`,
        userId: user.id,
      });

      toast.success(`Retiro registrado: $ ${parsedAmount.toLocaleString('es-AR')}`);
      setAmount('');
      setNotes('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Error al registrar retiro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className="text-2xl font-bold">$ {maxAmount.toLocaleString('es-AR')}</p>
          </div>
          <div>
            <Label>Monto</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          {parsedAmount > maxAmount && (
            <p className="text-xs text-destructive">Supera el disponible</p>
          )}
          <div>
            <Label>Notas (opcional)</Label>
            <Input
              placeholder="Ej: Retiro semanal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={parsedAmount <= 0 || parsedAmount > maxAmount || transfer.isPending}
          >
            Confirmar Retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use CashTransferModal instead */
export const RetiroAlivioModal = CashTransferModal;
