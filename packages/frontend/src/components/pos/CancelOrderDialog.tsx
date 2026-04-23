import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PosOrder } from '@/hooks/pos/usePosOrderHistory';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PosOrder;
  onConfirm: () => Promise<void>;
}

import { formatCurrency } from '@/lib/formatters';

export function CancelOrderDialog({ open, onOpenChange, order, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const hasInvoice = order.issued_invoices?.length > 0;
  const factura = order.issued_invoices?.[0];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Anular pedido #{order.order_number}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Estás por anular el pedido <strong>#{order.order_number}</strong> por un total de{' '}
                <strong>{formatCurrency(order.total)}</strong>.
              </p>

              {hasInvoice && factura && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-destructive text-sm">
                    Este pedido tiene factura emitida
                  </p>
                  <p className="text-sm">
                    Se generará automáticamente una{' '}
                    <Badge variant="outline" className="text-xs">
                      Nota de Crédito
                    </Badge>{' '}
                    para anular la factura{' '}
                    <strong>
                      {factura.receipt_type} {String(factura.point_of_sale).padStart(5, '0')}-
                      {String(factura.receipt_number).padStart(8, '0')}
                    </strong>
                    .
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <DotsLoader />}
            {hasInvoice ? 'Anular y emitir NC' : 'Anular pedido'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
