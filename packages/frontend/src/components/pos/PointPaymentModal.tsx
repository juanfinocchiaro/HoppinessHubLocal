import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { POSDialogContent } from './POSDialog';
import { Button } from '@/components/ui/button';
import {
  invokeMpPointPayment,
  subscribeToPedidoPagos,
  removeSupabaseChannel,
} from '@/services/posService';
import { Loader2, CheckCircle, XCircle, Smartphone, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PaymentStage = 'sending' | 'waiting' | 'confirmed' | 'rejected' | 'error' | 'cancelled';

interface ConfirmedPayment {
  method: string;
  amount: number;
  mp_payment_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  branchId: string;
  amount: number;
  ticketNumber?: string;
  onConfirmed: (payment: ConfirmedPayment) => void;
  onCancelled?: () => void;
}

const TIMEOUT_MS = 5 * 60 * 1000;

const METODO_LABELS: Record<string, string> = {
  debit_card: 'Tarjeta Débito',
  credit_card: 'Tarjeta Crédito',
  tarjeta_debito: 'Tarjeta Débito',
  tarjeta_credito: 'Tarjeta Crédito',
  mercadopago_qr: 'QR MercadoPago',
  cash: 'Efectivo',
  efectivo: 'Efectivo',
  transfer: 'Transferencia',
  transferencia: 'Transferencia',
};

export function PointPaymentModal({
  open,
  onOpenChange,
  pedidoId,
  branchId,
  amount,
  ticketNumber,
  onConfirmed,
  onCancelled,
}: Props) {
  const [stage, setStage] = useState<PaymentStage>('sending');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<ConfirmedPayment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canForceCancel, setCanForceCancel] = useState(false);

  const createPaymentIntent = useCallback(
    async (forceCancel = false) => {
      setStage('sending');
      setErrorMsg(null);
      setConfirmedPayment(null);
      setCanForceCancel(false);

      try {
        const { data, error } = await invokeMpPointPayment({
          branch_id: branchId,
          pedido_id: pedidoId,
          amount,
          ticket_number: ticketNumber,
          force_cancel_pending: forceCancel,
        });

        if (error) {
          let msg = error.message || 'Error al enviar cobro';
          try {
            if ((error as any).context) {
              const body = await (error as any).context.json();
              if (body?.error) msg = body.error;
              if (body?.can_force_cancel) setCanForceCancel(true);
            }
          } catch {
            /* ignore */
          }
          setErrorMsg(msg);
          setStage('error');
          return;
        }

        if (data?.error) {
          setErrorMsg(data.error);
          if (data.can_force_cancel) setCanForceCancel(true);
          setStage('error');
          return;
        }

        setPaymentIntentId(data.payment_intent_id);
        setStage('waiting');
      } catch (err: any) {
        setErrorMsg(err?.message ?? 'Error al comunicarse con el Point Smart');
        setStage('error');
      }
    },
    [branchId, pedidoId, amount, ticketNumber],
  );

  // Create intent when modal opens
  useEffect(() => {
    if (open && pedidoId) {
      createPaymentIntent();
    }
    return () => {
      setPaymentIntentId(null);
      setConfirmedPayment(null);
      setStage('sending');
      setCanForceCancel(false);
    };
  }, [open, pedidoId]);

  // Subscribe to realtime changes on pedido_pagos for this order
  useEffect(() => {
    if (!open || !pedidoId || !paymentIntentId || stage !== 'waiting') return;

    let disposed = false;

    const channel = subscribeToPedidoPagos(pedidoId, (row) => {
      if (row.conciliado === true && row.mp_payment_id) {
        const payment: ConfirmedPayment = {
          method: row.method as string,
          amount: Number(row.amount),
          mp_payment_id: String(row.mp_payment_id),
        };
        setConfirmedPayment(payment);
        setStage('confirmed');
      }
    });

    const pollPaymentStatus = async () => {
      try {
        const { data, error } = await invokeMpPointPayment({
          branch_id: branchId,
          pedido_id: pedidoId,
          amount: 0,
          check_order_id: paymentIntentId,
        });

        if (disposed || error || !data) return;

        if (data.reconciled && data.payment?.mp_payment_id) {
          const payment: ConfirmedPayment = {
            method: String(data.payment.method),
            amount: Number(data.payment.amount),
            mp_payment_id: String(data.payment.mp_payment_id),
          };
          setConfirmedPayment(payment);
          setStage('confirmed');
          return;
        }

        if (data.status === 'rejected' || data.status === 'cancelled') {
          setErrorMsg('El pago fue rechazado o cancelado en el Point Smart.');
          setStage('rejected');
        }
      } catch {
        // keep waiting, realtime/webhook may still arrive
      }
    };

    pollPaymentStatus();
    const poller = setInterval(pollPaymentStatus, 4000);

    const timer = setTimeout(() => {
      if (stage === 'waiting') {
        setStage('error');
        setErrorMsg('Tiempo de espera agotado. El cliente no completó el pago.');
      }
    }, TIMEOUT_MS);

    return () => {
      disposed = true;
      removeSupabaseChannel(channel);
      clearInterval(poller);
      clearTimeout(timer);
    };
  }, [open, pedidoId, paymentIntentId, stage, branchId]);

  // Auto-close and notify on confirmation
  useEffect(() => {
    if (stage === 'confirmed' && confirmedPayment) {
      const timer = setTimeout(() => {
        onConfirmed(confirmedPayment);
        onOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage, confirmedPayment]);

  const handleCancel = async () => {
    // Cancel the order via API if we have the ID
    if (paymentIntentId) {
      try {
        const { data } = await invokeMpPointPayment({
          branch_id: branchId,
          pedido_id: pedidoId,
          amount: 0,
          cancel_order_id: paymentIntentId,
        });

        if (data?.manual_cancel_required) {
          setStage('error');
          setErrorMsg(data.error ?? 'Cancelá manualmente el cobro en el Point Smart y luego reintentá.');
          return;
        }
      } catch {
        setStage('error');
        setErrorMsg('No se pudo cancelar el cobro desde el Point Smart.');
        return;
      }
    }

    setStage('cancelled');
    toast.info('Cobro cancelado');
    onCancelled?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && stage !== 'sending') onOpenChange(false);
      }}
    >
      <POSDialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobro con Point Smart</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-3xl font-bold text-primary">$ {amount.toLocaleString('es-AR')}</p>

          {stage === 'sending' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground">Enviando al Point Smart...</p>
            </>
          )}

          {stage === 'waiting' && (
            <>
              <div className="relative">
                <Smartphone className="h-16 w-16 text-blue-500" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
                </span>
              </div>
              <p className="text-sm font-medium">Esperando pago en el Point Smart...</p>
              <p className="text-xs text-muted-foreground text-center">
                El cliente puede pagar con tarjeta, QR o contactless.
                <br />
                El cobro se confirma automáticamente.
              </p>
            </>
          )}

          {stage === 'confirmed' && confirmedPayment && (
            <>
              <CheckCircle className="h-16 w-16 text-emerald-500" />
              <p className="text-lg font-semibold text-emerald-700">Pago confirmado</p>
              <p className="text-sm text-muted-foreground">
                {METODO_LABELS[confirmedPayment.method] ?? confirmedPayment.method}
                {' · '}$ {confirmedPayment.amount.toLocaleString('es-AR')}
              </p>
            </>
          )}

          {stage === 'rejected' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-lg font-semibold text-red-700">Pago rechazado</p>
              <p className="text-sm text-muted-foreground">El cliente puede intentar de nuevo.</p>
            </>
          )}

          {stage === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-amber-500" />
              <p className="text-sm font-medium text-amber-700 text-center">
                {errorMsg ?? 'Ocurrió un error'}
              </p>
            </>
          )}
        </div>

        <DialogFooter className={cn('gap-2 flex-wrap', stage === 'confirmed' && 'hidden')}>
          {(stage === 'error' || stage === 'rejected') && (
            <>
              <Button variant="outline" onClick={() => createPaymentIntent(false)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              {canForceCancel && (
                <Button
                  variant="outline"
                  className="text-amber-700 border-amber-300"
                  onClick={() => createPaymentIntent(true)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Forzar cancelación y reintentar
                </Button>
              )}
            </>
          )}
          {stage !== 'confirmed' && (
            <Button
              variant={stage === 'error' ? 'default' : 'outline'}
              onClick={handleCancel}
              disabled={stage === 'sending'}
            >
              Cancelar cobro
            </Button>
          )}
        </DialogFooter>
      </POSDialogContent>
    </Dialog>
  );
}
