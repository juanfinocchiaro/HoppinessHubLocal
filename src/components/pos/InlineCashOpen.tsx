import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCashRegisters, useOpenShift } from '@/hooks/useCashRegister';
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

export function InlineCashOpen({ branchId, onOpened }: { branchId: string; onOpened: () => void }) {
  const { user } = useAuth();
  const { data: registersData } = useCashRegisters(branchId);
  const openShift = useOpenShift(branchId);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const registers = (registersData?.active ?? []).filter((r) => r.register_type === 'ventas');

  useEffect(() => {
    if (registers.length > 0 && !selectedRegister) {
      setSelectedRegister(registers[0].id);
    }
  }, [registers, selectedRegister]);

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
      onOpened();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al abrir caja');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Banknote className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Caja cerrada</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Abrí la caja para empezar a tomar pedidos
        </p>
      </div>
      {registers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay cajas configuradas para esta sucursal.
        </p>
      ) : (
        <div className="w-full space-y-4 text-left">
          {registers.length > 1 && (
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
          )}
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
          <Button
            className="w-full"
            size="lg"
            onClick={handleOpen}
            disabled={isOpening || !selectedRegister}
          >
            <Banknote className="h-4 w-4 mr-2" />
            {isOpening ? 'Abriendo...' : 'Abrir Caja'}
          </Button>
        </div>
      )}
    </div>
  );
}
