/**
 * AccountPanel - Panel de cuenta con items + pagos ordenados cronológicamente + saldo
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { POSAlertDialogContent } from './POSDialog';
import { ShoppingBag, X, ChefHat, PlusCircle, Tag } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import type { CartItem } from '@/types/pos';
import type { LocalPayment, OrderConfig } from '@/types/pos';
import { cn } from '@/lib/utils';
import { useValidateCode } from '@/hooks/useCodigosDescuento';
import { ConfigHeader } from './ConfigHeader';
import { SendDialogContent, type SendingStage } from './SendDialogContent';
import { ItemRow } from './AccountItemRow';
import { PaymentRow } from './AccountPaymentRow';

type TimelineEntry =
  | { type: 'item'; index: number; item: CartItem; ts: number }
  | { type: 'payment'; payment: LocalPayment; ts: number };

const APP_LABELS: Record<string, string> = {
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mp_delivery: 'MP Delivery',
};

interface AccountPanelProps {
  items: CartItem[];
  payments: LocalPayment[];
  onUpdateQty: (index: number, delta: number) => void;
  onSetQty?: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
  onUpdateNotes?: (index: number, notes: string) => void;
  onCancelOrder?: () => void;
  onRegisterPayment: () => void;
  onRemovePayment: (paymentId: string) => void;
  onSendToKitchen: (onProgress?: (stage: string) => void) => Promise<void>;
  onSendComplete: () => void;
  willInvoice: boolean;
  willPrint: boolean;
  disabled?: boolean;
  orderConfig?: OrderConfig;
  onEditConfig?: () => void;
  onUpdateOrderConfig?: (partial: Partial<OrderConfig>) => void;
  branchId?: string;
}

export function AccountPanel({
  items,
  payments,
  onUpdateQty,
  onSetQty,
  onRemove,
  onUpdateNotes,
  onCancelOrder,
  onRegisterPayment,
  onRemovePayment,
  onSendToKitchen,
  onSendComplete,
  willInvoice,
  willPrint,
  disabled,
  orderConfig,
  onEditConfig,
  onUpdateOrderConfig,
  branchId,
}: AccountPanelProps) {
  const subtotalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const promoDescTotal = items.reduce((s, i) => s + (i.promo_descuento ?? 0) * i.quantity, 0);
  const isApps = orderConfig?.canalVenta === 'apps';
  const isDelivery = orderConfig?.tipoServicio === 'delivery';
  const costoEnvio = isApps || isDelivery ? (orderConfig?.costoDelivery ?? 0) : 0;
  const descPlataforma = orderConfig?.descuentoPlataforma ?? 0;
  const descRestauranteRaw = orderConfig?.descuentoRestaurante ?? 0;
  const descRestaurante =
    orderConfig?.descuentoModo === 'porcentaje'
      ? Math.round((subtotalItems * descRestauranteRaw) / 100)
      : descRestauranteRaw;
  const voucherDesc = orderConfig?.voucherDescuento ?? 0;
  const totalDescuentos = descPlataforma + descRestaurante + voucherDesc + promoDescTotal;
  const totalItems = subtotalItems + costoEnvio - totalDescuentos;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const saldo = isApps ? 0 : totalItems - totalPaid;
  const canSend = isApps
    ? items.length > 0
    : Math.abs(totalItems - totalPaid) < 0.01 && items.length > 0;

  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const validateCode = useValidateCode(branchId, 'pos');

  // Send dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendPhase, setSendPhase] = useState<'confirm' | 'progress'>('confirm');
  const [currentStage, setCurrentStage] = useState<SendingStage | null>(null);
  const sendInFlightRef = useRef(false);

  const handleConfirmSend = useCallback(async () => {
    if (sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSendPhase('progress');
    try {
      await onSendToKitchen((stage) => setCurrentStage(stage as SendingStage));
      setCurrentStage('done');
      setTimeout(() => {
        setSendDialogOpen(false);
        setSendPhase('confirm');
        setCurrentStage(null);
        sendInFlightRef.current = false;
        onSendComplete();
      }, 800);
    } catch (e: any) {
      setSendDialogOpen(false);
      setSendPhase('confirm');
      setCurrentStage(null);
      sendInFlightRef.current = false;
      const { toast } = await import('sonner');
      toast.error(e?.message ?? 'Error al registrar pedido');
    }
  }, [onSendToKitchen, onSendComplete]);

  // Build chronological timeline
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    items.forEach((item, index) => {
      entries.push({ type: 'item', index, item, ts: item.createdAt ?? 0 });
    });
    payments.forEach((payment) => {
      entries.push({ type: 'payment', payment, ts: payment.createdAt });
    });
    entries.sort((a, b) => a.ts - b.ts);
    return entries;
  }, [items, payments]);

  // Determine send button state
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  let sendLabel = 'Agrega productos';
  let sendDisabled = true;
  if (isApps && items.length > 0) {
    sendLabel = 'Enviar a cocina';
    sendDisabled = false;
  } else if (items.length > 0 && payments.length === 0) {
    sendLabel = `Cobra $ ${totalItems.toLocaleString('es-AR')} para enviar`;
    sendDisabled = true;
  } else if (items.length > 0 && saldo > 0) {
    sendLabel = `Faltan $ ${saldo.toLocaleString('es-AR')} por cobrar`;
    sendDisabled = true;
  } else if (canSend) {
    sendLabel = 'Enviar a cocina';
    sendDisabled = false;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Config summary header */}
      {orderConfig && <ConfigHeader config={orderConfig} onEdit={onEditConfig} />}

      {/* Header */}
      <div className="px-3 py-2 border-b font-medium flex items-center justify-between">
        <span className="text-sm">Cuenta</span>
        {onCancelOrder && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {items.length > 0 || payments.length > 0 ? 'Cancelar' : 'Nueva venta'}
              </Button>
            </AlertDialogTrigger>
            <POSAlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {items.length > 0 || payments.length > 0
                    ? '¿Cancelar pedido?'
                    : '¿Volver a la pantalla inicial?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {items.length > 0 || payments.length > 0
                    ? 'Se eliminarán todos los productos y pagos registrados. Esta acción no se puede deshacer.'
                    : 'Se descartará la configuración actual y volverás a la pantalla inicial del POS.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancelOrder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {items.length > 0 || payments.length > 0
                    ? 'Sí, cancelar pedido'
                    : 'Sí, reiniciar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </POSAlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Scrollable content: chronological timeline */}
      <ScrollArea className="flex-1 min-h-0">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Agregá productos para empezar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Elegí items del menú y sumalos al pedido
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {timeline.map((entry) => {
              if (entry.type === 'item') {
                return (
                  <ItemRow
                    key={`item-${entry.index}-${entry.item.item_carta_id}`}
                    item={entry.item}
                    index={entry.index}
                    editingNoteIdx={editingNoteIdx}
                    setEditingNoteIdx={setEditingNoteIdx}
                    onUpdateQty={onUpdateQty}
                    onRemove={onRemove}
                    onUpdateNotes={onUpdateNotes}
                  />
                );
              }
              return (
                <PaymentRow
                  key={`pay-${entry.payment.id}`}
                  payment={entry.payment}
                  onRemovePayment={onRemovePayment}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer: summary + actions */}
      <div className="p-3 border-t space-y-2">
        {items.length > 0 && (
          <>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {costoEnvio > 0 || totalDescuentos > 0 || isApps || onUpdateOrderConfig
                    ? 'Subtotal'
                    : 'Total pedido'}
                </span>
                <span className="font-medium tabular-nums">
                  $ {subtotalItems.toLocaleString('es-AR')}
                </span>
              </div>

              {promoDescTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-success text-xs flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Desc. promoción
                  </span>
                  <span className="text-success font-medium tabular-nums text-xs">
                    - $ {promoDescTotal.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {/* Editable delivery amounts for apps */}
              {isApps && onUpdateOrderConfig && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs shrink-0">Envío</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.costoDelivery ?? 0}
                      onChange={(e) =>
                        onUpdateOrderConfig({
                          costoDelivery: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-600 text-xs shrink-0">Desc. plataforma</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.descuentoPlataforma ?? 0}
                      onChange={(e) =>
                        onUpdateOrderConfig({
                          descuentoPlataforma: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-600 text-xs shrink-0">Desc. restaurante</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.descuentoRestaurante ?? 0}
                      onChange={(e) =>
                        onUpdateOrderConfig({
                          descuentoRestaurante: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                </>
              )}

              {/* Static delivery cost for non-apps */}
              {!isApps && costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="font-medium tabular-nums">
                    $ {costoEnvio.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              {/* Editable discount for non-apps with $ / % toggle */}
              {!isApps && onUpdateOrderConfig && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-600 text-xs shrink-0">Desc. restaurante</span>
                    <div className="flex items-center gap-1">
                      <div className="flex rounded-md border overflow-hidden h-7">
                        <button
                          type="button"
                          className={cn(
                            'px-2 text-xs font-medium transition-colors',
                            (orderConfig?.descuentoModo ?? 'pesos') === 'pesos'
                              ? 'bg-orange-600 text-white'
                              : 'bg-transparent text-muted-foreground hover:bg-muted',
                          )}
                          onClick={() => onUpdateOrderConfig({ descuentoModo: 'pesos' })}
                        >
                          $
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'px-2 text-xs font-medium transition-colors',
                            orderConfig?.descuentoModo === 'porcentaje'
                              ? 'bg-orange-600 text-white'
                              : 'bg-transparent text-muted-foreground hover:bg-muted',
                          )}
                          onClick={() => onUpdateOrderConfig({ descuentoModo: 'porcentaje' })}
                        >
                          %
                        </button>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={orderConfig?.descuentoModo === 'porcentaje' ? 100 : undefined}
                        step={orderConfig?.descuentoModo === 'porcentaje' ? 5 : 100}
                        value={orderConfig?.descuentoRestaurante ?? 0}
                        onChange={(e) =>
                          onUpdateOrderConfig({
                            descuentoRestaurante: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="h-7 w-20 text-xs text-right tabular-nums"
                      />
                    </div>
                  </div>
                  {orderConfig?.descuentoModo === 'porcentaje' && descRestaurante > 0 && (
                    <div className="flex justify-end">
                      <span className="text-orange-600 text-xs tabular-nums">
                        - $ {descRestaurante.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Voucher input */}
              {!isApps &&
                onUpdateOrderConfig &&
                (orderConfig?.voucherCodigo ? (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5">
                    <Tag className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-green-800">
                        {orderConfig.voucherCodigo} — ${voucherDesc.toLocaleString('es-AR')} off
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-green-600 hover:text-red-600"
                      onClick={() =>
                        onUpdateOrderConfig({
                          voucherCodigoId: undefined,
                          voucherCodigo: undefined,
                          voucherDescuento: undefined,
                        })
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <Input
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                        placeholder="Voucher"
                        className="h-7 text-xs font-mono flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && voucherInput.trim()) {
                            validateCode.mutate(
                              { codigo: voucherInput.trim(), subtotal: subtotalItems },
                              {
                                onSuccess: (result) => {
                                  onUpdateOrderConfig({
                                    voucherCodigoId: result.code.id,
                                    voucherCodigo: result.code.code,
                                    voucherDescuento: result.descuento,
                                  });
                                  setVoucherInput('');
                                },
                              },
                            );
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={validateCode.isPending || !voucherInput.trim()}
                        onClick={() => {
                          validateCode.mutate(
                            { codigo: voucherInput.trim(), subtotal: subtotalItems },
                            {
                              onSuccess: (result) => {
                                onUpdateOrderConfig({
                                  voucherCodigoId: result.code.id,
                                  voucherCodigo: result.code.code,
                                  voucherDescuento: result.descuento,
                                });
                                setVoucherInput('');
                              },
                            },
                          );
                        }}
                      >
                        {validateCode.isPending ? <DotsLoader /> : <Tag className="w-3 h-3" />}
                      </Button>
                    </div>
                    {validateCode.isError && (
                      <p className="text-[11px] text-destructive">
                        {(validateCode.error as Error).message}
                      </p>
                    )}
                  </div>
                ))}

              {(costoEnvio > 0 || totalDescuentos > 0 || isApps || onUpdateOrderConfig) && (
                <div className="flex justify-between pt-0.5 border-t">
                  <span className="text-muted-foreground font-medium">Total pedido</span>
                  <span className="font-semibold tabular-nums">
                    $ {totalItems.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {/* For apps: show "Cobrado por [App]" indicator */}
              {isApps && (
                <div className="rounded-lg px-3 py-2 flex justify-between items-center text-sm font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  <span>Cobrado por {APP_LABELS[orderConfig?.canalApp ?? ''] ?? 'App'}</span>
                  <span className="tabular-nums">$ {totalItems.toLocaleString('es-AR')}</span>
                </div>
              )}

              {/* For non-apps: show paid amount and saldo */}
              {!isApps && payments.length > 0 && (
                <div className="flex justify-between text-success">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">
                    - $ {totalPaid.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
            {!isApps && payments.length > 0 && (
              <div
                className={cn(
                  'rounded-lg px-3 py-2 flex justify-between items-center text-sm font-bold',
                  saldo > 0
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                )}
              >
                <span>{saldo > 0 ? 'Falta cobrar' : 'Cobrado'}</span>
                <span className="tabular-nums">$ {saldo.toLocaleString('es-AR')}</span>
              </div>
            )}
          </>
        )}

        {!isApps && items.length > 0 && saldo > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onRegisterPayment}
            disabled={disabled}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar pago
          </Button>
        )}

        <DialogPrimitive.Root
          open={sendDialogOpen}
          onOpenChange={(open) => {
            if (!open && sendPhase === 'progress') return;
            setSendDialogOpen(open);
            if (!open) {
              setSendPhase('confirm');
              setCurrentStage(null);
            }
          }}
        >
          <DialogPrimitive.Trigger asChild>
            <Button
              className={cn(
                'w-full hidden lg:flex h-14 text-base',
                canSend ? 'bg-success hover:bg-success/90 text-white' : '',
              )}
              size="lg"
              disabled={sendDisabled || disabled}
            >
              <ChefHat className="h-5 w-5 mr-2" />
              <div className="flex flex-col items-start leading-tight">
                <span>{sendLabel}</span>
                {canSend && (
                  <span className="text-xs font-normal opacity-80">
                    {totalQty} items · $ {totalItems.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </Button>
          </DialogPrimitive.Trigger>
          {canSend && (
            <SendDialogContent
              phase={sendPhase}
              currentStage={currentStage}
              willInvoice={willInvoice}
              willPrint={willPrint}
              totalQty={totalQty}
              totalItems={totalItems}
              onCancel={() => setSendDialogOpen(false)}
              onConfirm={handleConfirmSend}
            />
          )}
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}
