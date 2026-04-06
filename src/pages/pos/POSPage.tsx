/**
 * POSPage - Punto de venta con modelo de cuenta progresiva
 * Items y pagos se mantienen en estado local hasta "Enviar a cocina".
 */
import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchName, fetchMenuCategoriasPrint, cancelPedido } from '@/services/posService';
import { ProductGrid } from '@/components/pos/ProductGrid';
import type { CartItem } from '@/types/pos';
import { AccountPanel } from '@/components/pos/AccountPanel';
import { ConfigForm } from '@/components/pos/OrderConfigPanel';
import { RegisterPaymentPanel } from '@/components/pos/RegisterPaymentPanel';
import { ModifiersModal } from '@/components/pos/ModifiersModal';
import { POSPortalProvider } from '@/components/pos/POSPortalContext';
import { useCreatePedido } from '@/hooks/pos/useOrders';
import { registerCodeUsage } from '@/hooks/useCodigosDescuento';
import { useKitchen } from '@/hooks/pos/useKitchen';
import { usePOSSessionState } from '@/hooks/pos/usePOSSessionState';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { useAuth } from '@/hooks/useAuth';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig, useEmitirFactura } from '@/hooks/useAfipConfig';
import { evaluateInvoicing, type SalesChannel, type OrderPayment } from '@/lib/invoicing-rules';
import type { FacturaPrintData, PaymentPrintData } from '@/lib/print-router';
import { toast } from 'sonner';
import { IVA } from '@/lib/constants';
import type { LocalPayment } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { ChefHat, PlusCircle, ShoppingBag } from 'lucide-react';
import { PendingOrdersBar } from '@/components/pos/PendingOrdersBar';
import { WebappOrdersPanel } from '@/components/pos/WebappOrdersPanel';
import { PointPaymentModal } from '@/components/pos/PointPaymentModal';
import { POSOnboarding } from '@/components/pos/POSOnboarding';
import { useMercadoPagoConfig } from '@/hooks/useMercadoPagoConfig';
import { InlineCashOpen } from '@/components/pos/InlineCashOpen';
import { calculatePOSTotals } from '@/utils/posCalculations';

export default function POSPage() {
  const { branchId } = useParams<{ branchId: string }>();

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Local no encontrado. Seleccioná un local desde el menú lateral.
      </div>
    );
  }

  return <POSPageContent branchId={branchId} />;
}

function POSPageContent({ branchId }: { branchId: string }) {
  const { user } = useAuth();
  const {
    cart,
    setCart,
    payments,
    setPayments,
    configConfirmed,
    setConfigConfirmed,
    orderConfig,
    setOrderConfig,
    resetAll,
  } = usePOSSessionState(branchId);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [modifiersItem, setModifiersItem] = useState<any | null>(null);
  const configRef = useRef<HTMLDivElement>(null);

  // Point Smart payment state
  const [pointPaymentOpen, setPointPaymentOpen] = useState(false);
  const [pointPedidoId, setPointPedidoId] = useState<string | null>(null);
  const [pointAmount, setPointAmount] = useState(0);
  const { data: mpConfig } = useMercadoPagoConfig(branchId);
  const hasPointSmart = !!mpConfig?.device_id && mpConfig.estado_conexion === 'conectado';

  const shiftStatus = useShiftStatus(branchId);
  const createPedido = useCreatePedido(branchId);
  const { data: kitchenPedidos } = useKitchen(branchId);

  // ARCA invoicing
  const { data: afipConfig } = useAfipConfig(branchId);
  const emitirFactura = useEmitirFactura();

  // Printing integration
  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const allPrinters = printersData ?? [];

  const { data: branchInfo } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchName(branchId),
    enabled: !!branchId,
  });

  const { data: menuCategorias } = useQuery({
    queryKey: ['menu-categorias-print', branchId],
    queryFn: fetchMenuCategoriasPrint,
  });

  // Cart management
  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const hasNoMods =
        !item.notes &&
        (!item.extras || item.extras.length === 0) &&
        (!item.removibles || item.removibles.length === 0) &&
        (!item.opcionales || item.opcionales.length === 0);
      if (hasNoMods) {
        const idx = prev.findIndex(
          (i) =>
            i.item_carta_id === item.item_carta_id &&
            !i.notes &&
            (!i.extras || i.extras.length === 0) &&
            (!i.removibles || i.removibles.length === 0) &&
            (!i.opcionales || i.opcionales.length === 0),
        );
        if (idx >= 0) {
          const copy = [...prev];
          const n = copy[idx].quantity + 1;
          copy[idx] = { ...copy[idx], quantity: n, subtotal: copy[idx].unit_price * n };
          return copy;
        }
      }
      return [...prev, { ...item, createdAt: Date.now() }];
    });
  }, []);

  const handleSelectItem = useCallback((item: any) => {
    setModifiersItem(item);
  }, []);

  const handleModifierConfirm = useCallback((cartItem: CartItem) => {
    setCart((prev) => [...prev, { ...cartItem, createdAt: Date.now() }]);
    setModifiersItem(null);
  }, []);

  const updateQty = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const n = Math.max(1, copy[index].quantity + delta);
      copy[index] = { ...copy[index], quantity: n, subtotal: copy[index].unit_price * n };
      return copy;
    });
  }, []);

  const setQty = useCallback((index: number, qty: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const n = Math.max(1, qty);
      copy[index] = { ...copy[index], quantity: n, subtotal: copy[index].unit_price * n };
      return copy;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateNotes = useCallback((index: number, notes: string) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes: notes || undefined };
      return copy;
    });
  }, []);

  // Payment management
  const registerPayment = useCallback((payment: LocalPayment) => {
    setPayments((prev) => [...prev, payment]);
  }, []);

  const removePayment = useCallback((paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  // Cancel = reset everything
  const cancelOrder = useCallback(() => {
    resetAll();
  }, [resetAll]);

  // Validate config before allowing payment registration
  const validateOrderConfig = (): string | null => {
    if (orderConfig.canalVenta === 'mostrador') {
      if (orderConfig.tipoServicio === 'comer_aca' && !orderConfig.numeroLlamador) {
        return 'Ingresá el número de llamador';
      }
      if (
        orderConfig.tipoServicio === 'takeaway' &&
        !orderConfig.clienteNombre?.trim() &&
        !orderConfig.numeroLlamador
      ) {
        return 'Ingresá el nombre del cliente o un número de llamador';
      }
      if (orderConfig.tipoServicio === 'delivery') {
        if (!orderConfig.clienteNombre?.trim() || !orderConfig.clienteTelefono?.trim()) {
          return 'Nombre y teléfono son requeridos';
        }
        if (!orderConfig.clienteDireccion?.trim()) return 'Ingresá la dirección de entrega';
      }
    }
    // Validate invoice fields â€” required only for Factura A
    if (orderConfig.tipoFactura === 'A') {
      if (!orderConfig.receptorCuit?.trim()) return 'Ingresá el CUIT del cliente';
      if (!orderConfig.receptorRazonSocial?.trim()) return 'Ingresá la razón social del cliente';
    }
    return null;
  };

  const handleOpenPayment = () => {
    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      configRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShowPaymentPanel(true);
  };

  // Point Smart: create order as pendiente_pago, then open PointPaymentModal
  const handlePointSmartPayment = async (amount: number) => {
    if (!branchId || cart.length === 0) return;

    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      const items = cart.map((c) => ({
        item_carta_id: c.item_carta_id,
        name: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        subtotal: c.subtotal,
        notes: c.notes,
        estacion: 'armado' as const,
        reference_price: c.reference_price,
        categoria_carta_id: c.categoria_carta_id,
      }));

      const pedido = await createPedido.mutateAsync({
        items,
        payments: [],
        orderConfig,
        estadoInicial: 'pendiente_pago',
      });

      setPointPedidoId(pedido.id);
      setPointAmount(amount);
      setPointPaymentOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al crear el pedido');
    }
  };

  const handlePointPaymentConfirmed = (_payment: {
    method: string;
    amount: number;
    mp_payment_id: string;
  }) => {
    toast.success('Pago confirmado', {
      description: `El pedido ya está en cocina`,
    });
    resetAll();
  };

  const handlePointPaymentCancelled = async () => {
    // Cancel the order that was created in pendiente_pago
    if (pointPedidoId) {
      try {
        await cancelPedido(pointPedidoId);
      } catch {
        // best-effort
      }
    }
    setPointPedidoId(null);
  };

  const formatMetodoPago = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'debit_card':
        return 'Tarjeta debito';
      case 'credit_card':
        return 'Tarjeta credito';
      case 'mercadopago_qr':
        return 'QR Mercado Pago';
      case 'transfer':
        return 'Transferencia';
      default:
        return 'Otro';
    }
  };

  const resolveInvoicingChannel = (): SalesChannel => {
    if (orderConfig.canalVenta === 'mostrador') return 'mostrador';
    if (orderConfig.canalVenta === 'apps') {
      if (orderConfig.canalApp === 'rappi') return 'rappi';
      if (orderConfig.canalApp === 'pedidos_ya') return 'pedidosya';
      if (orderConfig.canalApp === 'mp_delivery') return 'mp_delivery';
    }
    return 'delivery';
  };

  const willInvoice = afipConfig?.estado_conexion === 'conectado';
  const willPrint = !!(printConfig && menuCategorias && printing.bridgeStatus === 'connected');

  // Send to kitchen = persist everything to DB + print
  const handleSendToKitchen = async (onProgress?: (stage: string) => void) => {
    if (!branchId || cart.length === 0) return;

    onProgress?.('creating');
    const items = cart.map((c) => ({
      item_carta_id: c.item_carta_id,
      name: c.name,
      quantity: c.quantity,
      unit_price: c.unit_price,
      subtotal: c.subtotal,
      notes: c.notes,
      estacion: 'armado' as const,
      reference_price: c.reference_price,
      categoria_carta_id: c.categoria_carta_id,
      promo_descuento: c.promo_descuento,
    }));

    const pedido = await createPedido.mutateAsync({
      items,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        montoRecibido: p.method === 'cash' ? p.montoRecibido : undefined,
      })),
      orderConfig,
    });

    if (orderConfig.voucherCodigoId && orderConfig.voucherDescuento) {
      registerCodeUsage({
        codigoId: orderConfig.voucherCodigoId,
        userId: user?.id,
        pedidoId: pedido?.id,
        montoDescontado: orderConfig.voucherDescuento,
      }).catch(() => {});
    }

    let facturaData: FacturaPrintData | null = null;
    if (afipConfig?.estado_conexion === 'conectado') {
      onProgress?.('invoicing');
      try {
        const channel = resolveInvoicingChannel();
        const orderPayments: OrderPayment[] = payments.map((p) => ({
          method: p.method as OrderPayment['method'],
          amount: p.amount,
        }));

        const totalAmount = orderPayments.reduce((s, p) => s + p.amount, 0);

        const clienteQuiereFactura = !!(
          orderConfig.receptorCuit && orderConfig.receptorRazonSocial
        );
        const result = clienteQuiereFactura
          ? { shouldInvoice: true, invoiceableAmount: totalAmount, totalAmount }
          : evaluateInvoicing(orderPayments, channel, afipConfig.reglas_facturacion ?? null);

        if (result.shouldInvoice && result.invoiceableAmount > 0) {
          const tipoFactura = orderConfig.tipoFactura === 'A' ? 'A' : 'B';
          const condicionIvaReceptor =
            tipoFactura === 'A' ? 'IVA Responsable Inscripto' : 'Consumidor Final';

          const invoiceResult = await emitirFactura.mutateAsync({
            branch_id: branchId!,
            pedido_id: pedido?.id,
            tipo_factura: tipoFactura,
            receptor_cuit: orderConfig.receptorCuit || undefined,
            receptor_razon_social: orderConfig.receptorRazonSocial || undefined,
            receptor_condicion_iva: condicionIvaReceptor,
            items: [
              { descripcion: 'Venta POS', cantidad: 1, precio_unitario: result.invoiceableAmount },
            ],
            total: result.invoiceableAmount,
          });

          if (invoiceResult) {
            const pvStr = String(invoiceResult.punto_venta).padStart(5, '0');
            const numStr = String(invoiceResult.numero).padStart(8, '0');
            const neto = result.invoiceableAmount / IVA;
            const iva = result.invoiceableAmount - neto;
            const afipExtra = afipConfig as unknown as { iibb?: string; tax_status?: string };
            facturaData = {
              tipo: tipoFactura as 'A' | 'B',
              codigo: tipoFactura === 'A' ? '01' : '06',
              numero: `${pvStr}-${numStr}`,
              fecha: new Date().toLocaleDateString('es-AR'),
              emisor: {
                razon_social: afipConfig.business_name || '',
                cuit: afipConfig.cuit || '',
                iibb: afipExtra.iibb || afipConfig.cuit || '',
                condicion_iva: afipExtra.tax_status || 'Responsable Inscripto',
                domicilio: afipConfig.direccion_fiscal || '',
                inicio_actividades: afipConfig.inicio_actividades || '',
              },
              receptor: {
                nombre: orderConfig.receptorRazonSocial || orderConfig.clienteNombre || undefined,
                documento_tipo: orderConfig.receptorCuit ? 'CUIT' : 'DNI',
                documento_numero: orderConfig.receptorCuit || undefined,
                condicion_iva: condicionIvaReceptor,
              },
              neto_gravado: neto,
              iva,
              otros_tributos: 0,
              iva_contenido: iva,
              otros_imp_nacionales: 0,
              cae: invoiceResult.cae,
              cae_vto: invoiceResult.cae_vencimiento,
            };
          }
        }
      } catch (invoiceErr) {
        if (import.meta.env.DEV) console.error('Invoice error (non-blocking):', invoiceErr);
      }
    }

    if (printConfig && menuCategorias && printing.bridgeStatus === 'connected') {
      onProgress?.('printing');
      const ticketTrigger = printConfig.ticket_trigger || 'on_payment';
      const shouldPrintTicketNow = ticketTrigger !== 'on_ready';
      const effectivePrintConfig = shouldPrintTicketNow
        ? printConfig
        : { ...printConfig, ticket_enabled: false };
      const esSalon = orderConfig.tipoServicio === 'comer_aca';
      const printableOrder = {
        order_number: pedido.order_number ?? 0,
        service_type: orderConfig.tipoServicio ?? null,
        canal_venta:
          orderConfig.canalVenta === 'apps'
            ? orderConfig.canalApp
            : (orderConfig.canalVenta ?? null),
        caller_number: orderConfig.numeroLlamador
          ? parseInt(orderConfig.numeroLlamador, 10)
          : null,
        customer_name: orderConfig.clienteNombre ?? null,
        referencia_app: orderConfig.referenciaApp ?? null,
        created_at: new Date().toISOString(),
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          notes: c.notes,
          estacion: 'armado',
          categoria_carta_id: c.categoria_carta_id,
          unit_price: c.unit_price,
          subtotal: c.subtotal,
        })),
        total: totalToPay,
        descuento: descuentos,
        voucher_codigo: orderConfig.voucherCodigo,
        voucher_descuento: orderConfig.voucherDescuento,
        costo_delivery: costoEnvio > 0 ? costoEnvio : undefined,
        customer_phone: orderConfig.clienteTelefono ?? null,
        customer_address: orderConfig.clienteDireccion ?? null,
      };

      const singlePayment = payments.length === 1 ? payments[0] : null;
      const paymentData: PaymentPrintData = {
        metodo_pago:
          payments.length > 1
            ? `Mixto: ${payments.map((p) => formatMetodoPago(p.method)).join(' + ')}`
            : formatMetodoPago(singlePayment?.method),
        monto_recibido:
          singlePayment?.method === 'cash' ? singlePayment.montoRecibido : undefined,
        vuelto:
          singlePayment?.method === 'cash'
            ? Math.max(0, (singlePayment.montoRecibido || 0) - singlePayment.amount)
            : undefined,
      };

      try {
        await printing.printOrder(
          printableOrder,
          effectivePrintConfig,
          allPrinters,
          menuCategorias as {
            id: string;
            name: string;
            print_type: 'comanda' | 'vale' | 'no_imprimir';
          }[],
          branchInfo?.name ?? 'Hoppiness',
          esSalon,
          paymentData,
          facturaData,
          pedido?.id,
        );
      } catch (printErr) {
        if (import.meta.env.DEV) console.error('Print error (non-blocking):', printErr);
      }
    }
  };

  // Reopen config editing
  const handleEditConfig = useCallback(() => {
    setConfigConfirmed(false);
  }, []);

  const isAppsChannel = orderConfig.canalVenta === 'apps';
  const {
    costoEnvio,
    descuentos,
    totalToPay,
    totalPaid,
    minCashRemaining,
    minDigitalRemaining,
    saldo,
    canSend,
  } = calculatePOSTotals(cart, payments, orderConfig);

  // Show full-page "Abrir Caja" when cash register is closed
  if (!shiftStatus.loading && !shiftStatus.hasCashOpen) {
    return (
      <POSPortalProvider>
        <div className="flex flex-col h-[calc(100vh-6rem)]">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <InlineCashOpen branchId={branchId!} onOpened={() => shiftStatus.refetch()} />
            </div>
          </div>
        </div>
      </POSPortalProvider>
    );
  }

  return (
    <POSPortalProvider>
      <div className="flex flex-col h-[calc(100vh-6rem)] pb-16 lg:pb-0">
        {/* Pending orders bar â€” always visible */}
        <PendingOrdersBar
          pedidos={(kitchenPedidos ?? []).filter((p) => p.source !== 'webapp')}
          branchId={branchId!}
          shiftOpenedAt={shiftStatus.activeCashShift?.opened_at ?? null}
        />
        <WebappOrdersPanel branchId={branchId!} />
        {/* Main grid: menu + account */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(380px,1.1fr)] flex-1 min-h-0">
          {/* Menu column - Zona B */}
          <div className="min-h-[200px] lg:min-h-0 flex flex-col flex-1 overflow-hidden bg-slate-50 p-4">
            {!configConfirmed ? (
              /* Empty state while config not confirmed */
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Configurá el pedido</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Elegí canal y servicio para ver el menú
                  </p>
                </div>
              </div>
            ) : (
              <ProductGrid
                onAddItem={addItem}
                onSelectItem={handleSelectItem}
                cart={cart}
                branchId={branchId}
                disabled={!configConfirmed}
                promoChannel={
                  orderConfig.canalVenta === 'apps'
                    ? (orderConfig.canalApp ?? undefined)
                    : orderConfig.canalVenta === 'mostrador'
                      ? 'salon'
                      : undefined
                }
              />
            )}
          </div>

          {/* Account column - Zona C */}
          <div className="min-h-[200px] lg:min-h-0 flex flex-col bg-background border-l">
            {!configConfirmed ? (
              /* Config form inline in Zona C */
              <div ref={configRef} className="flex-1 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold mb-4">Nueva venta</h2>
                <ConfigForm
                  config={orderConfig}
                  onChange={setOrderConfig}
                  branchId={branchId}
                  onConfirm={() => {
                    const err = validateOrderConfig();
                    if (err) {
                      toast.error(err);
                      return;
                    }
                    setConfigConfirmed(true);
                  }}
                />
              </div>
            ) : (
              /* Account panel with order config header */
              <>
                <AccountPanel
                  items={cart}
                  payments={payments}
                  onUpdateQty={updateQty}
                  onSetQty={setQty}
                  onRemove={removeItem}
                  onUpdateNotes={updateNotes}
                  onCancelOrder={cancelOrder}
                  onRegisterPayment={handleOpenPayment}
                  onRemovePayment={removePayment}
                  onSendToKitchen={handleSendToKitchen}
                  onSendComplete={resetAll}
                  willInvoice={willInvoice}
                  willPrint={willPrint}
                  disabled={createPedido.isPending}
                  orderConfig={orderConfig}
                  onEditConfig={handleEditConfig}
                  onUpdateOrderConfig={(partial) =>
                    setOrderConfig((prev) => ({ ...prev, ...partial }))
                  }
                  branchId={branchId}
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile sticky footer */}
        {configConfirmed && cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background px-4 py-3 flex items-center justify-between gap-3 shadow-elevated">
            <div className="text-sm">
              <span className="text-muted-foreground">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
              <span className="ml-2 font-semibold text-foreground">
                $ {totalToPay.toLocaleString('es-AR')}
              </span>
              {!isAppsChannel && totalPaid > 0 && (
                <span className="ml-2 text-xs text-success">
                  pagado $ {totalPaid.toLocaleString('es-AR')}
                </span>
              )}
            </div>
            {canSend ? (
              <Button
                size="lg"
                onClick={() =>
                  handleSendToKitchen()
                    .then(resetAll)
                    .catch((e: any) => toast.error(e?.message ?? 'Error al registrar pedido'))
                }
                disabled={createPedido.isPending}
                className="shrink-0 bg-success hover:bg-success/90 text-white"
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            ) : !isAppsChannel ? (
              <Button
                size="lg"
                onClick={handleOpenPayment}
                disabled={createPedido.isPending || saldo <= 0}
                className="shrink-0"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Pagar
              </Button>
            ) : null}
          </div>
        )}

        {/* Register payment modal */}
        <RegisterPaymentPanel
          open={showPaymentPanel}
          onOpenChange={setShowPaymentPanel}
          saldoPendiente={saldo}
          onRegister={registerPayment}
          onPointSmartPayment={hasPointSmart ? handlePointSmartPayment : undefined}
          minCashRemaining={minCashRemaining}
          minDigitalRemaining={minDigitalRemaining}
        />

        {/* Point Smart payment modal */}
        {pointPedidoId && (
          <PointPaymentModal
            open={pointPaymentOpen}
            onOpenChange={setPointPaymentOpen}
            pedidoId={pointPedidoId}
            branchId={branchId!}
            amount={pointAmount}
            onConfirmed={handlePointPaymentConfirmed}
            onCancelled={handlePointPaymentCancelled}
          />
        )}

        <ModifiersModal
          open={!!modifiersItem}
          onOpenChange={(open) => {
            if (!open) setModifiersItem(null);
          }}
          item={modifiersItem}
          onConfirm={handleModifierConfirm}
        />

        <POSOnboarding />
      </div>
    </POSPortalProvider>
  );
}
