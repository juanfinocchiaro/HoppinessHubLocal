/**
 * QuickExpenseModal - Egresos con categoría, RDO y verificación PIN
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Receipt, Banknote, CreditCard } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import { fetchUserActiveRoles } from '@/services/posService';
import { useAuth } from '@/hooks/useAuth';
import { useAddExpenseMovement } from '@/hooks/useCashRegister';
import { SupervisorPinDialog } from '@/components/pos/SupervisorPinDialog';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';
import { CATEGORIA_GASTO_OPTIONS } from '@/types/compra';
import { type OperatorInfo } from '@/hooks/useOperatorVerification';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';

interface QuickExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  shiftId?: string;
  pinThreshold?: number;
  registerLabel?: string;
}

export function QuickExpenseModal({
  open,
  onOpenChange,
  branchId,
  shiftId,
  pinThreshold = 50000,
  registerLabel,
}: QuickExpenseModalProps) {
  const { user } = useAuth();
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [categoriaGasto, setCategoriaGasto] = useState('');
  const [rdoCategoryCode, setRdoCategoryCode] = useState('');
  const [notes, setNotes] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const addExpense = useAddExpenseMovement(branchId);

  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const data = await fetchUserActiveRoles(user.id);
      const roles = data.flatMap((r) => [r.brand_role, r.local_role].filter(Boolean));
      setIsSupervisor(
        roles.some((r) =>
          ['encargado', 'franquiciado', 'admin', 'coordinador'].includes(r as string),
        ),
      );
    }
    checkRole();
  }, [user]);

  useEffect(() => {
    if (open) {
      setConcept('');
      setAmount('');
      setPaymentMethod('cash');
      setCategoriaGasto('');
      setRdoCategoryCode('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!concept || !amount) return;
    const amountNum = parseFloat(amount);
    const needsPin = !isSupervisor && amountNum >= pinThreshold;
    if (needsPin) {
      setShowPinDialog(true);
    } else {
      createExpense(undefined);
    }
  };

  const createExpense = async (_authorizedBy?: string) => {
    if (!user || !shiftId) return;
    const amountNum = parseFloat(amount);
    const isCash = paymentMethod === 'cash';

    if (isCash) {
      try {
        await addExpense.mutateAsync({
          shiftId,
          amount: amountNum,
          concept: concept,
          paymentMethod: 'efectivo',
          userId: user.id,
          categoriaGasto: categoriaGasto || undefined,
          rdoCategoryCode: rdoCategoryCode || undefined,
          observaciones: notes || undefined,
          estadoAprobacion:
            !isSupervisor && amountNum >= pinThreshold ? 'pendiente_aprobacion' : 'aprobado',
        });
        toast.success('Gasto registrado correctamente');
        onOpenChange(false);
      } catch (e: any) {
        toast.error(e?.message || 'Error al registrar el gasto');
      }
    } else {
      toast.info('Gastos por transferencia se registran fuera del sistema de caja');
      onOpenChange(false);
    }
  };

  const handlePinSuccess = (supervisor: OperatorInfo) => {
    setShowPinDialog(false);
    createExpense(supervisor.userId);
  };

  const amountNum = parseFloat(amount) || 0;
  const needsPin = !isSupervisor && amountNum >= pinThreshold;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Gasto
            </DialogTitle>
            <DialogDescription>
              {registerLabel
                ? `Se descontará de ${registerLabel}`
                : paymentMethod === 'cash'
                  ? 'Se descontará del efectivo de caja'
                  : 'Quedará pendiente de transferencia'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                placeholder="Ej: Reparación aire acondicionado"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
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
              <Label>Categoría</Label>
              <Select value={categoriaGasto} onValueChange={setCategoriaGasto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIA_GASTO_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría RDO (opcional)</Label>
              <p className="text-xs text-muted-foreground">Para el Estado de Resultados</p>
              <RdoCategorySelector value={rdoCategoryCode} onChange={setRdoCategoryCode} />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as 'cash' | 'transfer')}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="cash" id="expense-cash" className="peer sr-only" />
                  <Label
                    htmlFor="expense-cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Banknote className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Efectivo</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="transfer" id="expense-transfer" className="peer sr-only" />
                  <Label
                    htmlFor="expense-transfer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CreditCard className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Transferencia</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Detalles adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {needsPin && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border text-foreground text-sm">
                Monto mayor a {formatCurrency(pinThreshold)} requiere PIN de encargado
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addExpense.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!concept || !amount || addExpense.isPending}>
              {addExpense.isPending && <DotsLoader />}
              {needsPin ? 'Solicitar Autorización' : 'Registrar Gasto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        branchId={branchId}
        onSuccess={handlePinSuccess}
        title="Autorizar Gasto"
        description={`Gasto de ${formatCurrency(parseFloat(amount) || 0)} requiere autorización`}
      />
    </>
  );
}
