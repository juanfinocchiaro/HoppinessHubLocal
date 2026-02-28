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
  nombre: string;
  cantidad: number;
  notas: string | null;
  precio_unitario: number;
  subtotal: number;
  categoria_carta_id?: string | null;
}

interface PedidoPagoRow {
  metodo: string;
  monto: number;
  monto_recibido: number | null;
  vuelto: number | null;
  tarjeta_marca: string | null;
}

interface FacturaEmitidaRow {
  anulada: boolean | null;
  tipo_comprobante: string;
  punto_venta: number;
  numero_comprobante: number;
  cae: string | null;
  cae_vencimiento: string | null;
  fecha_emision: string;
  neto: number;
  iva: number;
  total: number;
  receptor_cuit: string | null;
  receptor_razon_social: string | null;
  receptor_condicion_iva: string | null;
}

interface PedidoRow {
  id: string;
  numero_pedido: number;
  tipo_servicio: string | null;
  canal_venta: string | null;
  canal_app: string | null;
  numero_llamador: number | null;
  cliente_nombre: string | null;
  referencia_app?: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  created_at: string;
  total: number;
  descuento: number | null;
  pedido_items: PedidoItemRow[];
  pedido_pagos: PedidoPagoRow[];
  facturas_emitidas: FacturaEmitidaRow[];
}

function formatMetodoPago(method?: string): string | undefined {
  switch (method) {
    case 'efectivo':
      return 'Efectivo';
    case 'tarjeta_debito':
      return 'Tarjeta debito';
    case 'tarjeta_credito':
      return 'Tarjeta credito';
    case 'mercadopago_qr':
      return 'QR Mercado Pago';
    case 'transferencia':
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

  const activeInvoice = (pedido.facturas_emitidas || []).find((f) => !f.anulada);
  const singlePayment = (pedido.pedido_pagos || []).length === 1 ? pedido.pedido_pagos[0] : null;

  const ticketData: TicketClienteData = {
    order: {
      numero_pedido: pedido.numero_pedido,
      tipo_servicio: pedido.tipo_servicio,
      canal_venta: pedido.canal_app || pedido.canal_venta,
      numero_llamador: pedido.numero_llamador,
      cliente_nombre: pedido.cliente_nombre,
      referencia_app: pedido.referencia_app ?? null,
      created_at: pedido.created_at,
      items: (pedido.pedido_items || []).map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        notas: i.notas,
        estacion: 'armado',
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
      total: pedido.total,
      descuento: pedido.descuento || 0,
    },
    branchName,
    metodo_pago:
      (pedido.pedido_pagos || []).length > 1
        ? `Mixto: ${(pedido.pedido_pagos || []).map((p) => formatMetodoPago(p.metodo) || p.metodo).join(' + ')}`
        : formatMetodoPago(singlePayment?.metodo),
    tarjeta_marca: singlePayment?.tarjeta_marca || undefined,
    monto_recibido:
      singlePayment?.metodo === 'efectivo' ? singlePayment.monto_recibido || undefined : undefined,
    vuelto: singlePayment?.metodo === 'efectivo' ? singlePayment.vuelto || 0 : undefined,
    factura: activeInvoice
      ? {
          tipo: (activeInvoice.tipo_comprobante === 'A' ? 'A' : 'B') as 'A' | 'B',
          codigo: activeInvoice.tipo_comprobante === 'A' ? '01' : '06',
          numero: `${String(activeInvoice.punto_venta).padStart(5, '0')}-${String(activeInvoice.numero_comprobante).padStart(8, '0')}`,
          fecha: activeInvoice.fecha_emision,
          emisor: {
            razon_social: afipConfig?.razon_social || '',
            cuit: afipConfig?.cuit || '',
            iibb: afipConfig?.iibb || afipConfig?.cuit || '',
            condicion_iva: afipConfig?.condicion_iva || 'Responsable Inscripto',
            domicilio: afipConfig?.direccion_fiscal || '',
            inicio_actividades: afipConfig?.inicio_actividades || '',
          },
          receptor: {
            nombre: activeInvoice.receptor_razon_social || pedido.cliente_nombre || undefined,
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
      numero_pedido: pedido.numero_pedido,
      tipo_servicio: pedido.tipo_servicio,
      canal_venta: pedido.canal_app || pedido.canal_venta,
      numero_llamador: pedido.numero_llamador,
      cliente_nombre: pedido.cliente_nombre,
      referencia_app: pedido.referencia_app ?? null,
      created_at: pedido.created_at,
      items: (pedido.pedido_items || []).map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        notas: i.notas,
        estacion: 'armado',
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
      total: pedido.total,
      cliente_telefono: pedido.cliente_telefono,
      cliente_direccion: pedido.cliente_direccion,
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
