import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { DollarSign, ShoppingBag, TrendingUp, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToExcel } from '@/lib/exportExcel';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cancelPedido, fetchValeCategoryIds } from '@/services/posService';
import { invokeEmitirNotaCredito } from '@/services/fiscalService';
import {
  usePosOrderHistory, DEFAULT_FILTERS,
  type OrderFilters, type PosOrder, type PosOrderFactura,
} from '@/hooks/pos/usePosOrderHistory';
import { OrderHistoryFilters } from '@/components/pos/OrderHistoryFilters';
import { OrderHistoryTable, type ReprintType } from '@/components/pos/OrderHistoryTable';
import { OrderHeatmapChart } from '@/components/pos/OrderHeatmapChart';
import { CancelOrderDialog } from '@/components/pos/CancelOrderDialog';
import { ChangeInvoiceModal, type ChangeInvoiceData } from '@/components/pos/ChangeInvoiceModal';
import { SalesAnalysisTab } from '@/components/pos/SalesAnalysisTab';
import FiscalReportsPage from '@/pages/local/FiscalReportsPage';
import { useAfipConfig, useEmitirFactura } from '@/hooks/useAfipConfig';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import {
  generateTicketCliente, generateTicketAnulacion, generateComandaCompleta,
  generateVale, generateComandaDelivery, generateArcaQrBitmap, generateInvoicedSalesSummary,
  type TicketClienteData, type AnulacionTicketData, type InvoicedSalesSummaryData,
} from '@/lib/escpos';
import { useFiscalBranchData } from '@/hooks/useFiscalReports';
import { toast } from 'sonner';

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '30', label: 'Últimos 30 días' },
];

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

interface PosHistoryViewProps {
  branchId: string;
  branchName: string;
  daysBack: string;
  setDaysBack: (v: string) => void;
}

export function PosHistoryView({ branchId, branchName, daysBack, setDaysBack }: PosHistoryViewProps) {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const { orders, totals, isLoading } = usePosOrderHistory(branchId, parseInt(daysBack), filters);
  const queryClient = useQueryClient();
  const [cancellingOrder, setCancellingOrder] = useState<PosOrder | null>(null);
  const [changingInvoiceOrder, setChangingInvoiceOrder] = useState<PosOrder | null>(null);

  const { data: afipConfig } = useAfipConfig(branchId);
  const { data: fiscalBranch } = useFiscalBranchData(branchId);
  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const allPrinters = printersData ?? [];
  const emitirFactura = useEmitirFactura();

  const formatMetodoPago = (method?: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'debit_card': return 'Tarjeta debito';
      case 'credit_card': return 'Tarjeta credito';
      case 'mercadopago_qr': return 'QR Mercado Pago';
      case 'transfer': return 'Transferencia';
      default: return undefined;
    }
  };

  const mapFiscalDocType = (tipoComprobante: string) => {
    switch (tipoComprobante) {
      case 'A': return { tipo: 'A' as const, codigo: '01', esNC: false };
      case 'B': return { tipo: 'B' as const, codigo: '06', esNC: false };
      case 'C': return { tipo: 'C' as const, codigo: '11', esNC: false };
      case 'NC_A': return { tipo: 'A' as const, codigo: '03', esNC: true };
      case 'NC_B': return { tipo: 'B' as const, codigo: '08', esNC: true };
      case 'NC_C': return { tipo: 'C' as const, codigo: '13', esNC: true };
      default: return { tipo: 'B' as const, codigo: '06', esNC: false };
    }
  };

  const buildPrintableOrder = (order: PosOrder) => ({
    order_number: order.order_number,
    service_type: order.service_type,
    caller_number: order.caller_number ?? null,
    canal_venta: order.canal_venta,
    customer_name: order.customer_name,
    referencia_app: (order as unknown as Record<string, unknown>).referencia_app as string | null ?? null,
    created_at: order.created_at,
    items: order.order_items.map((i) => ({
      name: i.name, quantity: i.quantity, notes: i.notas ?? i.notes ?? null, estacion: 'armado' as const,
      unit_price: i.unit_price, subtotal: i.subtotal, categoria_carta_id: i.categoria_carta_id,
    })),
    total: order.total, descuento: order.descuento || 0,
    customer_phone: order.customer_phone, customer_address: order.customer_address,
  });

  const printFiscalDocument = useCallback(
    async (order: PosOrder, factura: PosOrderFactura, successMessage: string) => {
      if (printing.bridgeStatus !== 'connected') throw new Error('Sistema de impresión no disponible');
      const ticketPrinter = printConfig?.ticket_printer_id ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active) : null;
      if (!ticketPrinter) throw new Error('No hay impresora de tickets configurada');

      const printableOrder = buildPrintableOrder(order);
      const afipExtra = afipConfig as unknown as { iibb?: string; tax_status?: string } | null;
      const payment = order.order_payments?.[0];
      const fiscalType = mapFiscalDocType(factura.receipt_type);

      const ticketData: TicketClienteData = {
        order: printableOrder, branchName, metodo_pago: formatMetodoPago(payment?.method),
        factura: {
          tipo: fiscalType.tipo, codigo: fiscalType.codigo,
          numero: `${String(factura.point_of_sale).padStart(5, '0')}-${String(factura.receipt_number).padStart(8, '0')}`,
          fecha: factura.issue_date,
          emisor: {
            razon_social: afipConfig?.business_name || '', cuit: afipConfig?.cuit || '',
            iibb: afipExtra?.iibb || afipConfig?.cuit || '', condicion_iva: afipExtra?.tax_status || 'Responsable Inscripto',
            domicilio: afipConfig?.direccion_fiscal || '', inicio_actividades: afipConfig?.inicio_actividades || '',
          },
          receptor: {
            nombre: factura.receptor_razon_social || order.customer_name || undefined,
            documento_tipo: factura.receptor_cuit ? 'CUIT' : 'DNI',
            documento_numero: factura.receptor_cuit || undefined,
            condicion_iva: factura.receptor_condicion_iva || 'Consumidor Final',
          },
          neto_gravado: factura.neto || 0, iva: factura.iva || 0, otros_tributos: 0,
          iva_contenido: factura.iva || 0, otros_imp_nacionales: 0,
          cae: factura.cae || '', cae_vto: factura.cae_vencimiento || '',
        },
      };
      if (ticketData.factura) {
        try { const qr = await generateArcaQrBitmap(ticketData.factura); ticketData.factura = { ...ticketData.factura, qr_bitmap_b64: qr }; }
        catch { /* fallback sin QR */ }
      }
      const data = generateTicketCliente(ticketData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success(successMessage);
    },
    [afipConfig, allPrinters, branchName, printConfig?.ticket_printer_id, printing.bridgeStatus],
  );

  const { data: valeCategoryIds } = useQuery({
    queryKey: ['vale-category-ids'],
    queryFn: fetchValeCategoryIds,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateOrders = () => { queryClient.invalidateQueries({ queryKey: ['pos-order-history', branchId] }); };

  const handleCancelOrder = useCallback(async () => {
    if (!cancellingOrder) return;
    const order = cancellingOrder;
    const activeInvoice = order.issued_invoices?.find((f) => !f.anulada);
    try {
      if (activeInvoice) {
        const data = await invokeEmitirNotaCredito(activeInvoice.id, branchId);
        toast.success(`Nota de crédito ${data.tipo} emitida: N° ${data.numero}`);
        const ncDoc: PosOrderFactura = { ...activeInvoice, receipt_type: data.tipo || 'NC_B', point_of_sale: data.punto_venta ?? activeInvoice.point_of_sale, receipt_number: data.numero ?? 0, cae: data.cae ?? null, cae_vencimiento: data.cae_vencimiento ?? null, issue_date: new Date().toISOString().slice(0, 10), total: data.total ?? activeInvoice.total, anulada: false, linked_invoice_id: activeInvoice.id };
        try { await printFiscalDocument(order, ncDoc, 'Nota de Crédito impresa'); }
        catch (printError) { toast.error('NC emitida pero no se pudo imprimir', { description: printError instanceof Error ? printError.message : 'Error desconocido' }); }
      }
      await cancelPedido(order.id);
      try {
        if (printing.bridgeStatus === 'connected') {
          const ticketPrinter = printConfig?.ticket_printer_id ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active) : null;
          if (ticketPrinter) {
            const printableOrder = buildPrintableOrder(order);
            const payment = order.order_payments?.[0];
            const anulacionData: AnulacionTicketData = { order: printableOrder, branchName, metodo_pago: formatMetodoPago(payment?.method) };
            const ticketBytes = generateTicketAnulacion(anulacionData, ticketPrinter.paper_width);
            const { printRawBase64 } = await import('@/lib/qz-print');
            await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, ticketBytes);
          }
        }
      } catch (printErr) { toast.error('Pedido anulado pero no se pudo imprimir ticket', { description: printErr instanceof Error ? printErr.message : 'Error desconocido' }); }
      toast.success(`Pedido #${order.order_number} anulado`);
      invalidateOrders();
      setCancellingOrder(null);
    } catch (err) { toast.error('Error al anular pedido', { description: err instanceof Error ? err.message : 'Error desconocido' }); }
  }, [cancellingOrder, branchId, printFiscalDocument, printing.bridgeStatus, printConfig?.ticket_printer_id, allPrinters, branchName]);

  const handleChangeInvoice = useCallback(async (data: ChangeInvoiceData) => {
    if (!changingInvoiceOrder) return;
    const order = changingInvoiceOrder;
    const activeInvoice = order.issued_invoices?.find((f) => !f.anulada);
    if (!activeInvoice) { toast.error('No hay factura activa para cambiar'); return; }
    try {
      const ncData = await invokeEmitirNotaCredito(activeInvoice.id, branchId);
      toast.success(`NC ${ncData.tipo} emitida: N° ${ncData.numero}`);
      const items = order.order_items.map((i) => ({ descripcion: i.name, cantidad: i.quantity, precio_unitario: i.unit_price }));
      await emitirFactura.mutateAsync({ branch_id: branchId, pedido_id: order.id, tipo_factura: data.tipo_factura, receptor_cuit: data.receptor_cuit || undefined, receptor_razon_social: data.receptor_razon_social || undefined, receptor_condicion_iva: data.receptor_condicion_iva || undefined, items, total: order.total });
      invalidateOrders();
      setChangingInvoiceOrder(null);
    } catch (err) { toast.error('Error al cambiar facturación', { description: err instanceof Error ? err.message : 'Error desconocido' }); }
  }, [changingInvoiceOrder, branchId, emitirFactura]);

  const handleReprint = useCallback(async (order: PosOrder, type: ReprintType) => {
    if (printing.bridgeStatus !== 'connected') { toast.error('Sistema de impresión no disponible'); return; }
    const ticketPrinter = printConfig?.ticket_printer_id ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active) : null;
    if (!ticketPrinter) { toast.error('No hay impresora de tickets configurada'); return; }
    const printableOrder = buildPrintableOrder(order);
    try {
      switch (type) {
        case 'ticket': { const d = generateTicketCliente({ order: printableOrder, branchName }, ticketPrinter.paper_width); const { printRawBase64 } = await import('@/lib/qz-print'); await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, d); toast.success('Ticket impreso'); break; }
        case 'comanda': { const d = generateComandaCompleta(printableOrder, branchName, ticketPrinter.paper_width); const cp = printConfig?.comanda_printer_id ? allPrinters.find((p) => p.id === printConfig.comanda_printer_id && p.is_active) : ticketPrinter; const { printRawBase64 } = await import('@/lib/qz-print'); await printRawBase64((cp || ticketPrinter).ip_address!, (cp || ticketPrinter).port, d); toast.success('Comanda impresa'); break; }
        case 'vale': { const vp = printConfig?.vale_printer_id ? allPrinters.find((p) => p.id === printConfig.vale_printer_id && p.is_active) : ticketPrinter; const printer = vp || ticketPrinter; const { printRawBase64 } = await import('@/lib/qz-print'); const valeCatIds = valeCategoryIds || new Set<string>(); const valeItems = printableOrder.items.filter((item) => item.categoria_carta_id && valeCatIds.has(item.categoria_carta_id)); if (valeItems.length === 0) { toast.info('Este pedido no tiene items de tipo vale (bebidas)'); break; } for (const item of valeItems) { for (let i = 0; i < item.quantity; i++) { const d = generateVale(item.name || 'Producto', printableOrder.order_number, printableOrder.created_at, printableOrder.canal_venta || undefined, undefined, printer.paper_width); await printRawBase64(printer.ip_address!, printer.port, d); } } toast.success(`${valeItems.length} vale(s) impresos`); break; }
        case 'delivery': { const d = generateComandaDelivery(printableOrder, branchName, ticketPrinter.paper_width); const { printRawBase64 } = await import('@/lib/qz-print'); await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, d); toast.success('Ticket delivery impreso'); break; }
        case 'factura': { const f = order.issued_invoices?.filter((x) => !x.anulada && !x.receipt_type.startsWith('NC_')).sort((a, b) => b.receipt_number - a.receipt_number)[0]; if (!f) { toast.error('Este pedido no tiene factura para reimprimir'); return; } await printFiscalDocument(order, f, 'Factura reimpresa'); break; }
        case 'nota_credito': { const nc = order.issued_invoices?.filter((x) => x.receipt_type.startsWith('NC_')).sort((a, b) => b.receipt_number - a.receipt_number)[0]; if (!nc) { toast.error('Este pedido no tiene nota de crédito para reimprimir'); return; } await printFiscalDocument(order, nc, 'Nota de Crédito reimpresa'); break; }
      }
    } catch (err) { toast.error('Error al reimprimir', { description: err instanceof Error ? err.message : 'Error desconocido' }); }
  }, [printConfig, allPrinters, branchName, valeCategoryIds, printFiscalDocument, printing.bridgeStatus]);

  const handleExport = () => {
    if (!orders.length) return;
    exportToExcel(
      orders.map((o) => ({ numero: o.order_number, fecha: o.created_at ? format(new Date(o.created_at), 'dd/MM/yy HH:mm') : '', canal: o.canal_venta || '', servicio: o.service_type || '', cliente: o.customer_name || '', items: o.order_items?.length || 0, total: o.total, pago: o.order_payments?.map((p) => p.method).join(', ') || '', estado: o.status })),
      { numero: '#', fecha: 'Fecha', canal: 'Canal', servicio: 'Servicio', cliente: 'Cliente', items: 'Items', total: 'Total', pago: 'Pago', estado: 'Estado' },
      { filename: `pedidos-${branchName || 'local'}` },
    );
  };

  const handlePrintInvoicedSummary = async () => {
    if (!fiscalBranch || printing.bridgeStatus !== 'connected') { toast.error('Impresión no disponible'); return; }
    const ticketPrinter = printConfig?.ticket_printer_id ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active) : null;
    if (!ticketPrinter) { toast.error('No hay impresora de tickets configurada'); return; }
    const invoicedOrders = orders.filter((o) => o.issued_invoices?.some((f) => !f.anulada && f.cae && !f.receipt_type.startsWith('NC_')));
    if (invoicedOrders.length === 0) { toast.info('No hay ventas facturadas en el período'); return; }
    const ventas = invoicedOrders.flatMap((o) => (o.issued_invoices || []).filter((f) => !f.anulada && f.cae && !f.receipt_type.startsWith('NC_')).map((f) => ({ fecha: f.issue_date, tipo: f.receipt_type, numero: `${String(f.point_of_sale).padStart(5, '0')}-${String(f.receipt_number).padStart(8, '0')}`, total: f.total, cae: f.cae || '' }))).sort((a, b) => a.numero.localeCompare(b.numero));
    const summaryData: InvoicedSalesSummaryData = { fecha_desde: orders[orders.length - 1]?.created_at || '', fecha_hasta: orders[0]?.created_at || '', ventas, total: ventas.reduce((s, v) => s + v.total, 0) };
    try {
      const data = generateInvoicedSalesSummary(summaryData, fiscalBranch, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Resumen de ventas facturadas impreso');
    } catch (e) { toast.error('Error al imprimir: ' + (e instanceof Error ? e.message : 'desconocido')); }
  };

  const changingInvoiceFactura = changingInvoiceOrder?.issued_invoices?.find((f) => !f.anulada);

  return (
    <>
      <Tabs defaultValue="pedidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="heatmap">Mapa de calor</TabsTrigger>
          <TabsTrigger value="fiscal">Reportes Fiscales</TabsTrigger>
        </TabsList>
        <TabsContent value="pedidos" className="space-y-4">
          <OrderHistoryFilters daysBack={daysBack} onDaysBackChange={setDaysBack} filters={filters} onFiltersChange={setFilters} onExport={handleExport} hasData={orders.length > 0} />
          {!isLoading && (
            <div className="flex flex-wrap gap-4 text-sm items-center">
              <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary" /><span className="font-medium">{fmtCurrency(totals.totalVendido)}</span></div>
              <div className="flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-muted-foreground" /><span>{totals.cantidad} pedidos</span></div>
              <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-muted-foreground" /><span>Ticket prom: {fmtCurrency(totals.ticketPromedio)}</span></div>
              <div className="ml-auto"><Button variant="outline" size="sm" onClick={handlePrintInvoicedSummary} disabled={printing.bridgeStatus !== 'connected'} title="Imprimir resumen de ventas facturadas para inspección ARCA"><Printer className="w-4 h-4 mr-1" /> Resumen facturado</Button></div>
            </div>
          )}
          <OrderHistoryTable orders={orders} isLoading={isLoading} branchId={branchId} hasOpenShift onReprint={handleReprint} onCancelOrder={(order) => setCancellingOrder(order)} onChangeInvoice={(order) => setChangingInvoiceOrder(order)} valeCategoryIds={valeCategoryIds} />
        </TabsContent>
        <TabsContent value="analisis" className="space-y-4"><SalesAnalysisTab branchId={branchId} daysBack={daysBack} onDaysBackChange={setDaysBack} /></TabsContent>
        <TabsContent value="heatmap" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Select value={daysBack} onValueChange={setDaysBack}><SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger><SelectContent>{RANGE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select>
          </div>
          <OrderHeatmapChart branchId={branchId} daysBack={parseInt(daysBack)} />
        </TabsContent>
        <TabsContent value="fiscal" className="space-y-4"><FiscalReportsPage /></TabsContent>
      </Tabs>
      {cancellingOrder && <CancelOrderDialog open={!!cancellingOrder} onOpenChange={(v) => { if (!v) setCancellingOrder(null); }} order={cancellingOrder} onConfirm={handleCancelOrder} />}
      {changingInvoiceOrder && changingInvoiceFactura && <ChangeInvoiceModal open={!!changingInvoiceOrder} onOpenChange={(v) => { if (!v) setChangingInvoiceOrder(null); }} facturaOriginal={changingInvoiceFactura} pedidoId={changingInvoiceOrder.id} branchId={branchId} onConfirm={handleChangeInvoice} />}
    </>
  );
}
