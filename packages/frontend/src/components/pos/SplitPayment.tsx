/**
 * SplitPayment - Pago dividido (Fase 4)
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Split, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { MetodoPago } from '@/types/pos';

export interface PaymentLine {
  id: string;
  method: MetodoPago;
  amount: number;
  montoRecibido?: number;
}

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit_card', label: 'Tarjeta Débito' },
  { value: 'credit_card', label: 'Tarjeta Crédito' },
  { value: 'mercadopago_qr', label: 'Mercado Pago QR' },
  { value: 'transfer', label: 'Transferencia' },
];

interface SplitPaymentProps {
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payments: PaymentLine[]) => void;
}

export function SplitPayment({ total, open, onOpenChange, onConfirm }: SplitPaymentProps) {
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: total },
  ]);

  useEffect(() => {
    if (open) {
      setPayments([{ id: crypto.randomUUID(), method: 'cash', amount: total }]);
    }
  }, [open, total]);

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = total - totalPaid;
  const isValid = Math.abs(remaining) < 0.02;

  const addPayment = () => {
    setPayments([
      ...payments,
      {
        id: crypto.randomUUID(),
        method: 'cash',
        amount: remaining > 0 ? Math.round(remaining * 100) / 100 : 0,
      },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, updates: Partial<PaymentLine>) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleQuickSplit = (ways: number) => {
    const amountPerWay = Math.floor((total / ways) * 100) / 100;
    const lastAmount = total - amountPerWay * (ways - 1);
    setPayments(
      Array.from({ length: ways }, (_, i) => ({
        id: crypto.randomUUID(),
        method: 'cash' as MetodoPago,
        amount: i === ways - 1 ? lastAmount : amountPerWay,
      })),
    );
  };

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(payments);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Dividir pago
          </DialogTitle>
          <DialogDescription>
            Total a cobrar: <strong>{formatCurrency(total)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pb-2">
          <span className="text-sm text-muted-foreground self-center">División rápida:</span>
          {[2, 3].map((n) => (
            <Button key={n} variant="outline" size="sm" onClick={() => handleQuickSplit(n)}>
              {n} partes
            </Button>
          ))}
        </div>

        <div className="space-y-3 max-h-[280px] overflow-y-auto">
          {payments.map((payment, index) => (
            <Card key={payment.id} className="relative">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
                  >
                    {index + 1}
                  </Badge>
                  <Select
                    value={payment.method}
                    onValueChange={(v) => updatePayment(payment.id, { method: v as MetodoPago })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payment.amount || ''}
                    onChange={(e) =>
                      updatePayment(payment.id, { amount: parseFloat(e.target.value) || 0 })
                    }
                    className="text-right font-mono flex-1 w-24"
                    placeholder="0"
                  />
                  {payments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(payment.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={addPayment}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar medio de pago
        </Button>

        <div
          className={cn(
            'rounded-lg p-4 space-y-2',
            isValid
              ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800'
              : 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
          )}
        >
          <div className="flex justify-between text-sm">
            <span>Total a cobrar:</span>
            <span className="font-medium">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total ingresado:</span>
            <span className="font-medium">{formatCurrency(totalPaid)}</span>
          </div>
          <div
            className={cn(
              'flex justify-between font-bold pt-2 border-t',
              remaining > 0 ? 'text-amber-700' : remaining < 0 ? 'text-red-600' : 'text-green-700',
            )}
          >
            <span>{remaining > 0 ? 'Falta:' : remaining < 0 ? 'Vuelto:' : 'Correcto:'}</span>
            <span className="flex items-center gap-1">
              {isValid && <Check className="w-4 h-4" />}
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar pagos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
