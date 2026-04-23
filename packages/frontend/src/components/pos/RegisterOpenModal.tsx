/**
 * RegisterOpenModal - Apertura de turno de caja (cash_register_shifts)
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCashRegisters, useOpenShift } from '@/hooks/useCashRegister';

interface RegisterOpenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onOpened: () => void;
}

export function RegisterOpenModal({
  open,
  onOpenChange,
  branchId,
  onOpened,
}: RegisterOpenModalProps) {
  const { user } = useAuth();
  const { data: registersData } = useCashRegisters(branchId);
  const openShift = useOpenShift(branchId);

  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const registers = (registersData?.active ?? []).filter((r) => r.register_type === 'ventas');

  useEffect(() => {
    if (open && registers.length > 0 && !selectedRegister) {
      setSelectedRegister(registers[0].id);
    }
  }, [open, registers, selectedRegister]);

  const handleOpen = async () => {
    if (!user || !selectedRegister) return;
    setIsOpening(true);
    try {
      await openShift.mutateAsync({
        registerId: selectedRegister,
        userId: user.id,
        openingAmount: parseFloat(openingAmount) || 0,
      });
      setOpeningAmount('');
      onOpenChange(false);
      onOpened();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al abrir caja');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Abrir Caja
          </DialogTitle>
          <DialogDescription>
            Elegí la caja e ingresá el monto inicial de efectivo.
          </DialogDescription>
        </DialogHeader>
        {registers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay cajas configuradas para esta sucursal.
          </p>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caja</Label>
              <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {registers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Efectivo inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleOpen}
            disabled={isOpening || !selectedRegister || registers.length === 0}
          >
            {isOpening ? 'Abriendo...' : 'Abrir Caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
