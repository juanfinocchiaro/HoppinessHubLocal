import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, QrCode, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { LocalPayment, MetodoPago } from '@/types/pos';
import { cn } from '@/lib/utils';

const METODO_ICONS: Record<MetodoPago, React.ComponentType<{ className?: string }>> = {
  efectivo: Banknote,
  tarjeta_debito: CreditCard,
  tarjeta_credito: CreditCard,
  mercadopago_qr: QrCode,
  transferencia: ArrowRightLeft,
};

const METODO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  mercadopago_qr: 'QR MP',
  transferencia: 'Transf.',
};

const PAYMENT_STYLES: Record<MetodoPago, string> = {
  efectivo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
  tarjeta_debito: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
  tarjeta_credito: 'bg-violet-500/10 border-violet-500/20 text-violet-700',
  mercadopago_qr: 'bg-sky-500/10 border-sky-500/20 text-sky-700',
  transferencia: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
};

const PAYMENT_ICON_STYLES: Record<MetodoPago, string> = {
  efectivo: 'text-emerald-600',
  tarjeta_debito: 'text-blue-600',
  tarjeta_credito: 'text-violet-600',
  mercadopago_qr: 'text-sky-600',
  transferencia: 'text-indigo-600',
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
