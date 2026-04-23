/**
 * PaymentModal - Modal de cobro con métodos de pago visuales y resumen colapsable
 */
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Split,
  Banknote,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import type { MetodoPago } from '@/types/pos';
import type { CartItem } from '@/types/pos';
import { SplitPayment, type PaymentLine } from '@/components/pos/SplitPayment';
import { cn } from '@/lib/utils';

/** Calculate quick cash amounts based on common Argentine bills */
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

const METODOS: {
  value: MetodoPago;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'debit_card', label: 'Débito', icon: CreditCard },
  { value: 'credit_card', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'QR MP', icon: QrCode },
  { value: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
];

export type PaymentPayload =
  | { type: 'single'; method: MetodoPago; montoRecibido?: number }
  | { type: 'split'; payments: PaymentLine[] };

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payload: PaymentPayload) => void;
  loading?: boolean;
  cartItems?: CartItem[];
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  loading = false,
  cartItems = [],
}: PaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('cash');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const totalToPay = total;
  const esEfectivo = metodo === 'cash';
  const montoNum = parseFloat(montoRecibido) || 0;
  const vuelto = esEfectivo ? Math.max(0, montoNum - totalToPay) : 0;

  // Promo discount calculation
  const promoDiscount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.reference_price && item.reference_price > item.unit_price) {
        return sum + (item.reference_price - item.unit_price) * item.quantity;
      }
      return sum;
    }, 0);
  }, [cartItems]);
  const hasPromoItems = promoDiscount > 0;
  const subtotalReferencia = hasPromoItems ? total + promoDiscount : total;

  // Warning: promo items with non-cash payment
  const showPromoWarning = hasPromoItems && !esEfectivo;

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const summaryPreview =
    cartItems.length > 0
      ? cartItems
          .slice(0, 3)
          .map((i) => i.name)
          .join(', ') + (cartItems.length > 3 ? '...' : '')
      : '';

  const handleConfirmSingle = () => {
    onConfirm({
      type: 'single',
      method: metodo,
      montoRecibido: esEfectivo ? montoNum : undefined,
    });
  };

  const handleConfirmSplit = (payments: PaymentLine[]) => {
    onConfirm({
      type: 'split',
      payments,
    });
  };

  const canConfirmSingle = !esEfectivo || montoNum >= totalToPay;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Collapsible order summary */}
            {cartItems.length > 0 && (
              <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                  <span>
                    {totalItems} item{totalItems !== 1 ? 's' : ''} · {summaryPreview}
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1.5 border rounded-lg p-3 bg-muted/30">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground mr-1">×{item.quantity}</span>
                          )}
                          {item.name}
                        </span>
                        <span className="text-muted-foreground font-medium">
                          $ {item.subtotal.toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Promo discount desglose */}
            {hasPromoItems && (
              <div className="text-sm space-y-1 border rounded-lg p-3 bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (precio ref.):</span>
                  <span>$ {subtotalReferencia.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Desc. promo:</span>
                  <span>-$ {promoDiscount.toLocaleString('es-AR')}</span>
                </div>
              </div>
            )}

            <div className="text-2xl font-bold text-primary">
              Total: $ {totalToPay.toLocaleString('es-AR')}
            </div>

            {/* Payment method buttons */}
            <div>
              <Label className="mb-2 block">Método de pago</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {METODOS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = metodo === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMetodo(m.value)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors min-h-[72px]',
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
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

            {esEfectivo && (
              <>
                <div>
                  <Label>Monto recibido</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Exacto', value: totalToPay },
                    ...getQuickAmounts(totalToPay).map((v) => ({
                      label: `$ ${v.toLocaleString('es-AR')}`,
                      value: v,
                    })),
                  ].map((btn) => (
                    <Button
                      key={btn.label}
                      type="button"
                      variant={montoNum === btn.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMontoRecibido(String(btn.value))}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
                {montoNum > 0 && (
                  <div className="text-lg font-semibold">
                    Vuelto: $ {vuelto.toLocaleString('es-AR')}
                  </div>
                )}
              </>
            )}

            {/* Promo cash-only warning */}
            {showPromoWarning && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Hay productos de <strong>promo efectivo</strong> en el pedido. ¿Continuar con{' '}
                  {METODOS.find((m) => m.value === metodo)?.label}?
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplit(true)} disabled={loading}>
              <Split className="w-4 h-4 mr-2" />
              Dividir pago
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSingle} disabled={!canConfirmSingle || loading}>
              {loading && <DotsLoader />}
              Confirmar cobro · $ {totalToPay.toLocaleString('es-AR')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SplitPayment
        total={totalToPay}
        open={showSplit}
        onOpenChange={setShowSplit}
        onConfirm={(payments) => {
          setShowSplit(false);
          handleConfirmSplit(payments);
        }}
      />
    </>
  );
}
