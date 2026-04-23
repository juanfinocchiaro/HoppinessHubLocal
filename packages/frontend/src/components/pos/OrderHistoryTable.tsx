import { useState, useMemo, Fragment } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Printer,
  FileText,
  ChefHat,
  Truck,
  Wine,
  Ban,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { PaymentEditModal } from '@/components/pos/PaymentEditModal';
import type { PosOrder } from '@/hooks/pos/usePosOrderHistory';

export type ReprintType = 'ticket' | 'comanda' | 'vale' | 'delivery' | 'factura' | 'nota_credito';

interface Props {
  orders: PosOrder[];
  isLoading: boolean;
  branchId?: string;
  hasOpenShift?: boolean;
  onReprint?: (order: PosOrder, type: ReprintType) => void;
  onCancelOrder?: (order: PosOrder) => void;
  onChangeInvoice?: (order: PosOrder) => void;
  /** Set of category IDs that are print_type='vale' */
  valeCategoryIds?: Set<string>;
}

const METODO_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  mercadopago_qr: 'QR',
  transfer: 'Transf.',
};

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  entregado: 'default',
  listo: 'secondary',
  cancelado: 'destructive',
  pendiente: 'outline',
  en_preparacion: 'outline',
};

const CANAL_LABELS: Record<string, string> = {
  mostrador: 'Mostrador',
  apps: 'Apps',
};

const SERVICIO_LABELS: Record<string, string> = {
  takeaway: 'Takeaway',
  comer_aca: 'Comer acá',
  delivery: 'Delivery',
};

import { formatCurrency } from '@/lib/formatters';

function paymentSummary(pagos: PosOrder['order_payments']) {
  if (!pagos || pagos.length === 0) return '-';
  if (pagos.length === 1) return METODO_LABELS[pagos[0].method] || pagos[0].method;
  return 'Dividido';
}

type SortKey =
  | 'order_number'
  | 'created_at'
  | 'canal_venta'
  | 'service_type'
  | 'customer_name'
  | 'total'
  | 'status';
type SortDir = 'asc' | 'desc';

export function OrderHistoryTable({
  orders,
  isLoading,
  branchId,
  hasOpenShift,
  onReprint,
  onCancelOrder,
  onChangeInvoice,
  valeCategoryIds,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<PosOrder | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const isMobile = useIsMobile();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'total' || key === 'order_number' ? 'desc' : 'asc');
    }
  };

  const sortedOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      let va: any = (a as any)[sortKey];
      let vb: any = (b as any)[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [orders, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const SortableHead = ({
    col,
    children,
    className,
  }: {
    col: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className || ''}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay pedidos en este período con los filtros seleccionados
        </CardContent>
      </Card>
    );
  }

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <SortableHead col="order_number">#</SortableHead>
              <SortableHead col="created_at">Fecha</SortableHead>
              {!isMobile && <SortableHead col="canal_venta">Canal</SortableHead>}
              {!isMobile && <SortableHead col="service_type">Servicio</SortableHead>}
              {!isMobile && <SortableHead col="customer_name">Cliente</SortableHead>}
              {!isMobile && <TableHead className="text-center">Items</TableHead>}
              <SortableHead col="total" className="text-right">
                Total
              </SortableHead>
              {!isMobile && <TableHead>Pago</TableHead>}
              <SortableHead col="status" className="text-center">
                Estado
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const activeInvoice = order.issued_invoices?.find((f) => !f.anulada);
              const hasActiveInvoice = !!activeInvoice;
              return (
                <Fragment key={order.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggle(order.id)}
                  >
                    <TableCell className="px-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      <span className="flex items-center gap-1">
                        {order.order_number}
                        {hasActiveInvoice && <FileText className="w-3.5 h-3.5 text-primary" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.created_at
                        ? format(
                            new Date(order.created_at),
                            isMobile ? 'd/M HH:mm' : 'EEE d MMM HH:mm',
                            { locale: es },
                          )
                        : '-'}
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="text-sm">
                        {CANAL_LABELS[order.canal_venta || ''] || '-'}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell className="text-sm">
                        {SERVICIO_LABELS[order.service_type || ''] || '-'}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell className="text-sm truncate max-w-[120px]">
                        {order.customer_name || '-'}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell className="text-center tabular-nums">
                        {order.order_items?.length || 0}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(order.total)}
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="text-sm">
                        {paymentSummary(order.order_payments)}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge
                        variant={ESTADO_VARIANT[order.status] || 'outline'}
                        className="text-xs capitalize"
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${order.id}-detail`}>
                      <TableCell colSpan={isMobile ? 5 : 10} className="bg-muted/30 p-4">
                        <OrderDetail
                          order={order}
                          canEdit={!!hasOpenShift && !!branchId}
                          onEdit={() => setEditingOrder(order)}
                          onReprint={onReprint}
                          onCancelOrder={onCancelOrder}
                          onChangeInvoice={onChangeInvoice}
                          valeCategoryIds={valeCategoryIds}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        {editingOrder && branchId && (
          <PaymentEditModal
            open={!!editingOrder}
            onOpenChange={(v) => {
              if (!v) setEditingOrder(null);
            }}
            pedidoId={editingOrder.id}
            pedidoTotal={editingOrder.total}
            branchId={branchId}
            currentPayments={editingOrder.order_payments}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Reprint button with disabled state + tooltip ─── */
function ReprintButton({
  label,
  icon: Icon,
  enabled,
  disabledReason,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  disabledReason?: string;
  onClick: () => void;
}) {
  const btn = (
    <Button
      variant="outline"
      size="sm"
      className={`h-8 text-xs ${!enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onClick();
      }}
      disabled={!enabled}
    >
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Button>
  );

  if (!enabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{btn}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return btn;
}

function OrderDetail({
  order,
  canEdit,
  onEdit,
  onReprint,
  onCancelOrder,
  onChangeInvoice,
  valeCategoryIds,
}: {
  order: PosOrder;
  canEdit?: boolean;
  onEdit?: () => void;
  onReprint?: (order: PosOrder, type: ReprintType) => void;
  onCancelOrder?: (order: PosOrder) => void;
  onChangeInvoice?: (order: PosOrder) => void;
  valeCategoryIds?: Set<string>;
}) {
  const activeInvoice = order.issued_invoices?.find((f) => !f.anulada);
  const activeFactura = order.issued_invoices?.find(
    (f) => !f.anulada && !f.receipt_type.startsWith('NC_'),
  );
  const cancelledInvoices = order.issued_invoices?.filter((f) => f.anulada) || [];
  const creditNotes =
    order.issued_invoices?.filter((f) => f.receipt_type.startsWith('NC_')) || [];
  const lastCreditNote = creditNotes.length > 0 ? creditNotes[creditNotes.length - 1] : null;

  const hasActiveInvoice = !!activeInvoice;
  const hasActiveFactura = !!activeFactura;
  const hasCreditNote = !!lastCreditNote;
  const isDelivery = order.service_type === 'delivery';
  const isCancelled = order.status === 'cancelado';

  // Check if order has vale items
  const hasValeItems =
    valeCategoryIds && valeCategoryIds.size > 0
      ? order.order_items?.some(
          (item) => item.categoria_carta_id && valeCategoryIds.has(item.categoria_carta_id),
        )
      : true; // If no category data, show enabled by default

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Items */}
        <div>
          <p className="font-medium mb-1">Items</p>
          <ul className="space-y-0.5">
            {order.order_items?.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          {order.descuento && order.descuento > 0 && (
            <div className="flex justify-between mt-1 text-destructive">
              <span>Descuento</span>
              <span>-{formatCurrency(order.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between mt-1 font-medium border-t pt-1">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Payments + Invoice Info */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium">Pagos</p>
            {canEdit && onEdit && !isCancelled && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                Editar pago
              </Button>
            )}
          </div>
          <ul className="space-y-0.5">
            {order.order_payments?.map((pago) => (
              <li key={pago.id} className="flex justify-between">
                <span>{METODO_LABELS[pago.method] || pago.method}</span>
                <span className="tabular-nums">{formatCurrency(pago.amount)}</span>
              </li>
            ))}
          </ul>

          {/* Active invoice info */}
          {activeInvoice && (
            <div className="mt-3 pt-2 border-t space-y-1">
              <p className="font-medium flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                {activeInvoice.receipt_type.startsWith('NC_')
                  ? 'Nota de Crédito'
                  : 'Factura'}{' '}
                {activeInvoice.receipt_type} — N°{' '}
                {String(activeInvoice.point_of_sale).padStart(5, '0')}-
                {String(activeInvoice.receipt_number).padStart(8, '0')}
              </p>
              {activeInvoice.cae && (
                <p className="text-muted-foreground text-xs">CAE: {activeInvoice.cae}</p>
              )}
              <p className="font-medium">{formatCurrency(activeInvoice.total)}</p>
            </div>
          )}

          {/* Cancelled invoices / Credit Notes */}
          {cancelledInvoices.length > 0 && (
            <div className="mt-2 space-y-1">
              {cancelledInvoices.map((f) => (
                <div key={f.id} className="text-xs text-muted-foreground line-through">
                  Factura {f.receipt_type} {String(f.point_of_sale).padStart(5, '0')}-
                  {String(f.receipt_number).padStart(8, '0')} (anulada)
                </div>
              ))}
            </div>
          )}
          {creditNotes.length > 0 && (
            <div className="mt-1 space-y-1">
              {creditNotes.map((nc) => (
                <div key={nc.id} className="text-xs text-orange-600 dark:text-orange-400">
                  {nc.receipt_type.replace('_', ' ')} {String(nc.point_of_sale).padStart(5, '0')}-
                  {String(nc.receipt_number).padStart(8, '0')}
                  {nc.cae && ` — CAE: ${nc.cae}`}
                </div>
              ))}
            </div>
          )}

          {isMobileView() && (
            <div className="mt-2 text-muted-foreground space-y-0.5">
              {order.canal_venta && (
                <p>Canal: {CANAL_LABELS[order.canal_venta] || order.canal_venta}</p>
              )}
              {order.service_type && (
                <p>Servicio: {SERVICIO_LABELS[order.service_type] || order.service_type}</p>
              )}
              {order.customer_name && <p>Cliente: {order.customer_name}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ─── Reprint Section ─── */}
      {onReprint && (
        <div className="pt-3 border-t">
          <p className="font-medium mb-2 flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
            <Printer className="h-3.5 w-3.5" />
            Reimprimir
          </p>
          <div className="flex flex-wrap gap-2">
            <ReprintButton
              label="Ticket cliente"
              icon={FileText}
              enabled={true}
              onClick={() => onReprint(order, 'ticket')}
            />
            <ReprintButton
              label="Factura"
              icon={FileText}
              enabled={hasActiveFactura}
              disabledReason="Sin factura emitida"
              onClick={() => onReprint(order, 'factura')}
            />
            <ReprintButton
              label="Nota de Crédito"
              icon={FileText}
              enabled={hasCreditNote}
              disabledReason="Sin nota de crédito emitida"
              onClick={() => onReprint(order, 'nota_credito')}
            />
            <ReprintButton
              label="Comanda"
              icon={ChefHat}
              enabled={true}
              onClick={() => onReprint(order, 'comanda')}
            />
            <ReprintButton
              label="Vales"
              icon={Wine}
              enabled={hasValeItems}
              disabledReason="Sin items de tipo vale"
              onClick={() => onReprint(order, 'vale')}
            />
            <ReprintButton
              label="Delivery"
              icon={Truck}
              enabled={isDelivery}
              disabledReason="Solo para pedidos delivery"
              onClick={() => onReprint(order, 'delivery')}
            />
          </div>
        </div>
      )}

      {/* ─── Actions Section ─── */}
      {!isCancelled && (onCancelOrder || onChangeInvoice) && (
        <div className="pt-3 border-t">
          <p className="font-medium mb-2 flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
            Acciones
          </p>
          <div className="flex flex-wrap gap-2">
            {onChangeInvoice && hasActiveInvoice && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeInvoice(order);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Cambiar facturación
              </Button>
            )}
            {onCancelOrder && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelOrder(order);
                }}
              >
                <Ban className="h-3 w-3 mr-1" />
                Anular pedido
              </Button>
            )}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="pt-3 border-t">
          <Badge variant="destructive" className="text-xs">
            Pedido anulado
          </Badge>
        </div>
      )}
    </div>
  );
}

function isMobileView() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}
