import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, QrCode, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { LocalPayment, MetodoPago } from '@/types/pos';
import { cn } from '@/lib/utils';

const METODO_ICONS: Record<MetodoPago, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  debit_card: CreditCard,
  credit_card: CreditCard,
  mercadopago_qr: QrCode,
  transfer: ArrowRightLeft,
};

const METODO_LABELS: Record<MetodoPago, string> = {
  cash: 'Efectivo',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  mercadopago_qr: 'QR MP',
  transfer: 'Transf.',
};

const PAYMENT_STYLES: Record<MetodoPago, string> = {
  cash: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
  debit_card: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
  credit_card: 'bg-violet-500/10 border-violet-500/20 text-violet-700',
  mercadopago_qr: 'bg-sky-500/10 border-sky-500/20 text-sky-700',
  transfer: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
};

const PAYMENT_ICON_STYLES: Record<MetodoPago, string> = {
  cash: 'text-emerald-600',
  debit_card: 'text-blue-600',
  credit_card: 'text-violet-600',
  mercadopago_qr: 'text-sky-600',
  transfer: 'text-indigo-600',
};

export function PaymentRow({
  payment,
  onRemovePayment,
}: {
  payment: LocalPayment;
  onRemovePayment: (id: string) => void;
}) {
  const Icon = METODO_ICONS[payment.method];
  const style = PAYMENT_STYLES[payment.method];
  const iconStyle = PAYMENT_ICON_STYLES[payment.method];
  return (
    <div className={cn('flex items-center justify-between p-2 rounded-lg border', style)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconStyle)} />
        <span className="text-sm font-medium">{METODO_LABELS[payment.method]}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          $ {payment.amount.toLocaleString('es-AR')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onRemovePayment(payment.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
