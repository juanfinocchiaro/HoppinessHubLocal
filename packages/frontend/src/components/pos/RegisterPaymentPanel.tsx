/**
 * RegisterPaymentPanel - Panel para registrar un pago individual
 * Reemplaza PaymentModal: permite pagos progresivos uno a uno.
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { POSDialogContent } from './POSDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Banknote, CreditCard, QrCode, ArrowRightLeft, Smartphone } from 'lucide-react';
import type { MetodoPago, LocalPayment } from '@/types/pos';
import { cn } from '@/lib/utils';
import { useMercadoPagoConfig } from '@/hooks/useMercadoPagoConfig';
import { useParams } from 'react-router-dom';

const METODOS: {
  value: MetodoPago;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selectedStyle: string;
}[] = [
  {
    value: 'cash',
    label: 'Efectivo',
    icon: Banknote,
    selectedStyle: 'border-emerald-500 bg-emerald-500/10 text-emerald-700',
  },
  {
    value: 'debit_card',
    label: 'Débito',
    icon: CreditCard,
    selectedStyle: 'border-blue-500 bg-blue-500/10 text-blue-700',
  },
  {
    value: 'credit_card',
    label: 'Crédito',
    icon: CreditCard,
    selectedStyle: 'border-violet-500 bg-violet-500/10 text-violet-700',
  },
  {
    value: 'mercadopago_qr',
    label: 'QR MP',
    icon: QrCode,
    selectedStyle: 'border-sky-500 bg-sky-500/10 text-sky-700',
  },
  {
    value: 'transfer',
    label: 'Transferencia',
    icon: ArrowRightLeft,
    selectedStyle: 'border-indigo-500 bg-indigo-500/10 text-indigo-700',
  },
];

function getQuickAmounts(total: number): number[] {
  const bills = [1000, 2000, 5000, 10000, 20000];
  const results: number[] = [];
  for (const bill of bills) {
    const rounded = Math.ceil(total / bill) * bill;
    if (rounded > total && !results.includes(rounded)) {
      results.push(rounded);
    }
  }
  return results.slice(0, 4);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldoPendiente: number;
  onRegister: (payment: LocalPayment) => void;
  /** Triggers Point Smart payment flow instead of manual registration */
  onPointSmartPayment?: (amount: number) => void;
  /** If promos require minimum cash/digital, remaining amounts are enforced here */
  minCashRemaining?: number;
  minDigitalRemaining?: number;
}

export function RegisterPaymentPanel({
  open,
  onOpenChange,
  saldoPendiente,
  onRegister,
  onPointSmartPayment,
  minCashRemaining = 0,
  minDigitalRemaining = 0,
}: Props) {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: mpConfig } = useMercadoPagoConfig(branchId);
  const hasPointSmart = !!mpConfig?.device_id && mpConfig.connection_status === 'conectado';

  const [metodo, setMetodo] = useState<MetodoPago>('cash');
  const [monto, setMonto] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');

  const esEfectivo = metodo === 'cash';
  const montoNum = parseFloat(monto) || 0;
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = esEfectivo ? Math.max(0, recibidoNum - montoNum) : 0;

  const maxCash = Math.max(0, saldoPendiente - minDigitalRemaining);
  const maxNonCash = Math.max(0, saldoPendiente - minCashRemaining);
  const maxForMetodo = esEfectivo ? maxCash : maxNonCash;

  const canConfirm =
    montoNum > 0 &&
    montoNum <= saldoPendiente &&
    montoNum <= maxForMetodo &&
    (!esEfectivo || recibidoNum >= montoNum);

  // Sync state when dialog opens or saldoPendiente changes
  useEffect(() => {
    if (open) {
      const preferCash = maxNonCash <= 0 && maxCash > 0;
      const preferNonCash = maxCash <= 0 && maxNonCash > 0;
      const defaultMetodo: MetodoPago = preferNonCash
        ? 'debit_card'
        : preferCash
          ? 'cash'
          : 'cash';
      const defaultMax = defaultMetodo === 'cash' ? maxCash : maxNonCash;
      setMetodo(defaultMetodo);
      setMonto(String(defaultMax));
      setMontoRecibido(defaultMetodo === 'cash' ? String(defaultMax) : '');
    }
  }, [open, saldoPendiente, maxCash, maxNonCash]);

  // When switching payment method, auto-fill or clear received amount
  const handleMetodoChange = (m: MetodoPago) => {
    const nextIsCash = m === 'cash';
    const nextMax = nextIsCash ? maxCash : maxNonCash;
    setMetodo(m);
    setMonto(String(nextMax));
    if (m === 'cash') {
      setMontoRecibido(String(nextMax));
    } else {
      setMontoRecibido('');
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onRegister({
      id: crypto.randomUUID(),
      method: metodo,
      amount: montoNum,
      montoRecibido: esEfectivo ? recibidoNum : undefined,
      vuelto: esEfectivo ? vuelto : undefined,
      createdAt: Date.now(),
    });
    setMetodo('cash');
    setMonto('');
    setMontoRecibido('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <POSDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Saldo pendiente */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Saldo pendiente</p>
            <p className="text-2xl font-bold text-primary">
              $ {saldoPendiente.toLocaleString('es-AR')}
            </p>
          </div>
          {(minCashRemaining > 0 || minDigitalRemaining > 0) && (
            <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Restricciones por promociones</p>
              {minCashRemaining > 0 && (
                <p>
                  Debe quedar mínimo{' '}
                  <span className="font-bold text-green-700">
                    $ {minCashRemaining.toLocaleString('es-AR')}
                  </span>{' '}
                  para pagar en <span className="font-medium">efectivo</span>.
                </p>
              )}
              {minDigitalRemaining > 0 && (
                <p>
                  Debe quedar mínimo{' '}
                  <span className="font-bold text-blue-700">
                    $ {minDigitalRemaining.toLocaleString('es-AR')}
                  </span>{' '}
                  para pagar en <span className="font-medium">digital</span>.
                </p>
              )}
            </div>
          )}

          {/* Método */}
          <div>
            <Label className="mb-2 block">Método de pago</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {METODOS.map((m) => {
                const Icon = m.icon;
                const isSelected = metodo === m.value;
                const isCash = m.value === 'cash';
                const allowed = (isCash ? maxCash : maxNonCash) > 0;
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={!allowed}
                    onClick={() => handleMetodoChange(m.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors min-h-[72px]',
                      !allowed
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                          ? m.selectedStyle
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto */}
          <div>
            <Label>Monto a cobrar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-7"
              />
            </div>
            {montoNum > saldoPendiente && (
              <p className="text-xs text-destructive mt-1">No puede superar el saldo pendiente</p>
            )}
            {montoNum > maxForMetodo && (
              <p className="text-xs text-destructive mt-1">
                Con promociones, el máximo para este método es ${' '}
                {maxForMetodo.toLocaleString('es-AR')}
              </p>
            )}
          </div>

          {/* Efectivo: recibido + vuelto */}
          {esEfectivo && (
            <>
              <div>
                <Label>Monto recibido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Exacto', value: montoNum },
                  ...getQuickAmounts(montoNum).map((v) => ({
                    label: `$ ${v.toLocaleString('es-AR')}`,
                    value: v,
                  })),
                ].map((btn) => (
                  <Button
                    key={btn.label}
                    type="button"
                    variant={recibidoNum === btn.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMontoRecibido(String(btn.value))}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
              {recibidoNum > 0 && recibidoNum >= montoNum && (
                <div className="text-lg font-semibold">
                  Vuelto: $ {vuelto.toLocaleString('es-AR')}
                </div>
              )}
            </>
          )}
        </div>
        {/* Point Smart shortcut */}
        {hasPointSmart && onPointSmartPayment && !esEfectivo && (
          <button
            type="button"
            disabled={maxNonCash <= 0}
            onClick={() => {
              if (maxNonCash <= 0) return;
              onOpenChange(false);
              onPointSmartPayment(Math.min(saldoPendiente, maxNonCash));
            }}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 transition-colors text-left',
              maxNonCash <= 0
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-blue-100 hover:border-blue-400',
            )}
          >
            <Smartphone className="h-8 w-8 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Cobrar con Point Smart</p>
              <p className="text-xs text-blue-600">
                El Point Smart cobra tarjeta, QR o contactless. Se concilia automáticamente.
              </p>
            </div>
          </button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Registrar · $ {montoNum.toLocaleString('es-AR')}
          </Button>
        </DialogFooter>
      </POSDialogContent>
    </Dialog>
  );
}
