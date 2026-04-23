import { printRawBase64 } from '@/lib/qz-print';
import {
  fetchPedidoForTicket,
  fetchPedidoForDeliveryTicket,
  logCompletedPrintJob,
} from '@/services/printingService';
import {
  generateTicketCliente,
  generateTicketDelivery,
  generateArcaQrBitmap,
  type TicketClienteData,
  type DeliveryTicketData,
} from '@/lib/escpos';
import type { BranchPrinter } from '@/hooks/useBranchPrinters';
import type { PrintConfig } from '@/hooks/usePrintConfig';

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err)
    return String((err as Record<string, unknown>).message);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

interface AfipLike {
  razon_social?: string | null;
  cuit?: string | null;
  direccion_fiscal?: string | null;
  inicio_actividades?: string | null;
  iibb?: string | null;
  condicion_iva?: string | null;
}

interface PedidoItemRow {
  name: string;
  quantity: number;
  notes: string | null;
  unit_price: number;
  subtotal: number;
  categoria_carta_id?: string | null;
}

interface PedidoPagoRow {
  method: string;
  amount: number;
  received_amount: number | null;
  vuelto: number | null;
  tarjeta_marca: string | null;
}

interface FacturaEmitidaRow {
  anulada: boolean | null;
  receipt_type: string;
  point_of_sale: number;
  receipt_number: number;
  cae: string | null;
  cae_vencimiento: string | null;
  issue_date: string;
  neto: number;
  iva: number;
  total: number;
  receptor_cuit: string | null;
  receptor_razon_social: string | null;
  receptor_condicion_iva: string | null;
}

interface PedidoRow {
  id: string;
  order_number: number;
  service_type: string | null;
  canal_venta: string | null;
  canal_app: string | null;
  caller_number: number | null;
  customer_name: string | null;
  referencia_app?: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  created_at: string;
  total: number;
  descuento: number | null;
  order_items: PedidoItemRow[];
  order_payments: PedidoPagoRow[];
  issued_invoices: FacturaEmitidaRow[];
}

function formatMetodoPago(method?: string): string | undefined {
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
      return undefined;
  }
}

export async function printReadyTicketByPedidoId(params: {
  branchId: string;
  pedidoId: string;
  branchName: string;
  printConfig: PrintConfig | null | undefined;
  printers: BranchPrinter[];
  afipConfig?: AfipLike | null;
}): Promise<void> {
  const { branchId, pedidoId, branchName, printConfig, printers, afipConfig } = params;
  if (!printConfig?.ticket_enabled || !printConfig.ticket_printer_id) return;

  const printer = printers.find((p) => p.id === printConfig.ticket_printer_id && p.is_active);
  if (!printer?.ip_address) {
    throw new Error('No hay impresora de ticket activa/configurada para on_ready');
  }

  const data = await fetchPedidoForTicket(pedidoId);
  const pedido = data as unknown as PedidoRow;

  const activeInvoice = (pedido.issued_invoices || []).find((f) => !f.anulada);
  const singlePayment = (pedido.order_payments || []).length === 1 ? pedido.order_payments[0] : null;

  const ticketData: TicketClienteData = {
    order: {
      order_number: pedido.order_number,
      service_type: pedido.service_type,
      canal_venta: pedido.canal_app || pedido.canal_venta,
      caller_number: pedido.caller_number,
      customer_name: pedido.customer_name,
      referencia_app: pedido.referencia_app ?? null,
      created_at: pedido.created_at,
      items: (pedido.order_items || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        notes: i.notes,
        estacion: 'armado',
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
      total: pedido.total,
      descuento: pedido.descuento || 0,
    },
    branchName,
    metodo_pago:
      (pedido.order_payments || []).length > 1
        ? `Mixto: ${(pedido.order_payments || []).map((p) => formatMetodoPago(p.method) || p.method).join(' + ')}`
        : formatMetodoPago(singlePayment?.method),
    tarjeta_marca: singlePayment?.tarjeta_marca || undefined,
    monto_recibido:
      singlePayment?.method === 'cash' ? singlePayment.received_amount || undefined : undefined,
    vuelto: singlePayment?.method === 'cash' ? singlePayment.vuelto || 0 : undefined,
    factura: activeInvoice
      ? {
          tipo: (activeInvoice.receipt_type === 'A' ? 'A' : 'B') as 'A' | 'B',
          codigo: activeInvoice.receipt_type === 'A' ? '01' : '06',
          numero: `${String(activeInvoice.point_of_sale).padStart(5, '0')}-${String(activeInvoice.receipt_number).padStart(8, '0')}`,
          fecha: activeInvoice.issue_date,
          emisor: {
            razon_social: afipConfig?.razon_social || '',
            cuit: afipConfig?.cuit || '',
            iibb: afipConfig?.iibb || afipConfig?.cuit || '',
            condicion_iva: afipConfig?.condicion_iva || 'Responsable Inscripto',
            domicilio: afipConfig?.direccion_fiscal || '',
            inicio_actividades: afipConfig?.inicio_actividades || '',
          },
          receptor: {
            nombre: activeInvoice.receptor_razon_social || pedido.customer_name || undefined,
            documento_tipo: activeInvoice.receptor_cuit ? 'CUIT' : 'DNI',
            documento_numero: activeInvoice.receptor_cuit || undefined,
            condicion_iva: activeInvoice.receptor_condicion_iva || 'Consumidor Final',
          },
          neto_gravado: activeInvoice.neto || 0,
          iva: activeInvoice.iva || 0,
          otros_tributos: 0,
          iva_contenido: activeInvoice.iva || 0,
          otros_imp_nacionales: 0,
          cae: activeInvoice.cae || '',
          cae_vto: activeInvoice.cae_vencimiento || '',
        }
      : null,
  };

  if (ticketData.factura) {
    try {
      const qr = await generateArcaQrBitmap(ticketData.factura);
      ticketData.factura = { ...ticketData.factura, qr_bitmap_b64: qr };
    } catch {
      /* fallback sin QR */
    }
  }

  const base64 = generateTicketCliente(ticketData, printer.paper_width);

  try {
    await printRawBase64(printer.ip_address, printer.port, base64);
    await logCompletedPrintJob({
      branch_id: branchId,
      printer_id: printer.id,
      pedido_id: pedidoId,
      job_type: 'ticket',
      payload: { data_base64: base64 },
      status: 'completed',
    });
  } catch (err) {
    console.error('[ready-ticket] printReadyTicketByPedidoId error:', err);
    const msg = extractErrorMessage(err);
    await logCompletedPrintJob({
      branch_id: branchId,
      printer_id: printer.id,
      pedido_id: pedidoId,
      job_type: 'ticket',
      payload: { data_base64: base64 },
      status: 'error',
      error_message: msg,
    });
    throw new Error(msg);
  }
}

/**
 * Prints a delivery ticket when an order is marked as "listo".
 * Triggered for delivery propio and app delivery orders.
 */
export async function printDeliveryTicketByPedidoId(params: {
  branchId: string;
  pedidoId: string;
  branchName: string;
  printConfig: PrintConfig | null | undefined;
  printers: BranchPrinter[];
}): Promise<void> {
  const { branchId, pedidoId, branchName, printConfig, printers } = params;

  const printerId = printConfig?.ticket_printer_id || printConfig?.comanda_printer_id;
  if (!printerId) return;

  const printer = printers.find((p) => p.id === printerId && p.is_active);
  if (!printer?.ip_address) return;

  const data = await fetchPedidoForDeliveryTicket(pedidoId);
  const pedido = data as unknown as PedidoRow;

  const deliveryData: DeliveryTicketData = {
    order: {
      order_number: pedido.order_number,
      service_type: pedido.service_type,
      canal_venta: pedido.canal_app || pedido.canal_venta,
      caller_number: pedido.caller_number,
      customer_name: pedido.customer_name,
      referencia_app: pedido.referencia_app ?? null,
      created_at: pedido.created_at,
      items: (pedido.order_items || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        notes: i.notes,
        estacion: 'armado',
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
      total: pedido.total,
      customer_phone: pedido.customer_phone,
      customer_address: pedido.customer_address,
    },
    branchName,
  };

  let base64: string;
  try {
    base64 = generateTicketDelivery(deliveryData, printer.paper_width);
  } catch (err) {
    console.error('[ready-ticket] generateTicketDelivery error:', err);
    throw new Error(`Error generando ticket delivery: ${extractErrorMessage(err)}`);
  }

  try {
    await printRawBase64(printer.ip_address, printer.port, base64);
    await logCompletedPrintJob({
      branch_id: branchId,
      printer_id: printer.id,
      pedido_id: pedidoId,
      job_type: 'delivery',
      payload: { data_base64: base64 },
      status: 'completed',
    });
  } catch (err) {
    console.error('[ready-ticket] printDeliveryTicketByPedidoId error:', err);
    const msg = extractErrorMessage(err);
    await logCompletedPrintJob({
      branch_id: branchId,
      printer_id: printer.id,
      pedido_id: pedidoId,
      job_type: 'delivery',
      payload: { data_base64: base64 },
      status: 'error',
      error_message: msg,
    });
    throw new Error(msg);
  }
}
