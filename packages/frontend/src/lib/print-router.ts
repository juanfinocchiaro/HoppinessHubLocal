/**
 * Print Router - Genera print jobs según categoría y canal de venta
 */
import type { BranchPrinter } from '@/hooks/useBranchPrinters';
import type { PrintConfig } from '@/hooks/usePrintConfig';
import {
  generateTicketCliente,
  generateComandaCompleta,
  generateComandaDelivery,
  generateVale,
  generateArcaQrBitmap,
  generateTrackingQrBitmap,
  type PrintableOrder,
  type PrintableItem,
  type TicketClienteData,
} from '@/lib/escpos';

interface MenuCategoria {
  id: string;
  name: string;
  print_type: 'comanda' | 'vale' | 'no_imprimir';
}

interface OrderItemWithCategoria extends PrintableItem {
  categoria_carta_id?: string | null;
  precio_unitario?: number;
  subtotal?: number;
}

export interface PrintJob {
  type: 'ticket' | 'vale' | 'comanda';
  printerId: string;
  dataBase64: string;
  label: string;
}

/**
 * Datos de pago para incluir en el ticket del cliente.
 */
export interface PaymentPrintData {
  metodo_pago?: string;
  tarjeta_marca?: string;
  monto_recibido?: number;
  vuelto?: number;
}

/**
 * Datos de factura ya emitida para integrar en el ticket.
 */
export interface FacturaPrintData {
  tipo: 'A' | 'B' | 'C';
  codigo: string;
  numero: string;
  fecha: string;
  emisor: {
    razon_social: string;
    cuit: string;
    iibb: string;
    condicion_iva: string;
    domicilio: string;
    inicio_actividades: string;
  };
  receptor: {
    nombre?: string;
    documento_tipo?: string;
    documento_numero?: string;
    condicion_iva: string;
  };
  neto_gravado: number;
  iva: number;
  otros_tributos: number;
  iva_contenido: number;
  otros_imp_nacionales: number;
  cae: string;
  cae_vto: string;
  qr_bitmap_b64?: string;
}

/**
 * Genera todos los print jobs para una venta.
 */
export async function buildPrintJobs(
  order: PrintableOrder & {
    items: OrderItemWithCategoria[];
    total?: number;
    descuento?: number;
    customer_phone?: string | null;
    customer_address?: string | null;
  },
  config: PrintConfig & {
    comanda_printer_id?: string | null;
    vale_printer_id?: string | null;
    salon_vales_enabled?: boolean;
  },
  printers: BranchPrinter[],
  categorias: MenuCategoria[],
  branchName: string,
  esSalon: boolean,
  payment?: PaymentPrintData,
  factura?: FacturaPrintData | null,
  trackingToken?: string,
): Promise<PrintJob[]> {
  const jobs: PrintJob[] = [];

  const findPrinter = (id: string | null | undefined) =>
    id ? printers.find((p) => p.id === id && p.is_active) : undefined;

  const getTipoImpresion = (item: OrderItemWithCategoria): 'comanda' | 'vale' | 'no_imprimir' => {
    if (!item.categoria_carta_id) return 'comanda';
    const cat = categorias.find((c) => c.id === item.categoria_carta_id);
    return cat?.print_type || 'comanda';
  };

  // 1. TICKET CLIENTE
  if (config.ticket_enabled && config.ticket_printer_id) {
    const printer = findPrinter(config.ticket_printer_id);
    if (printer) {
      let facturaWithQr = factura || null;
      if (factura) {
        try {
          const qr = await generateArcaQrBitmap(factura);
          facturaWithQr = { ...factura, qr_bitmap_b64: qr };
        } catch {
          facturaWithQr = factura;
        }
      }
      const ticketData: TicketClienteData = {
        order,
        branchName,
        metodo_pago: payment?.metodo_pago,
        tarjeta_marca: payment?.tarjeta_marca,
        monto_recibido: payment?.monto_recibido,
        vuelto: payment?.vuelto,
        factura: facturaWithQr,
      };
      const data = generateTicketCliente(ticketData, printer.paper_width);
      jobs.push({
        type: 'ticket',
        printerId: printer.id,
        dataBase64: data,
        label: factura ? `Factura ${factura.tipo}` : 'Ticket cliente',
      });
    }
  }

  // 2. VALES (solo salón)
  if (esSalon && config.salon_vales_enabled !== false && config.vale_printer_id) {
    const printer = findPrinter(config.vale_printer_id);
    if (printer) {
      for (const item of order.items) {
        if (getTipoImpresion(item) === 'vale') {
          for (let i = 0; i < item.quantity; i++) {
            const data = generateVale(
              item.name || 'Producto',
              order.order_number,
              order.created_at,
              order.canal_venta,
              order.caller_number,
              printer.paper_width,
            );
            jobs.push({
              type: 'vale' as const,
              printerId: printer.id,
              dataBase64: data,
              label: `Vale: ${item.name}`,
            });
          }
        }
      }
    }
  }

  // 3. COMANDA DE COCINA
  if (config.comanda_printer_id) {
    const printer = findPrinter(config.comanda_printer_id);
    if (printer) {
      let comandaItems: PrintableItem[];

      if (esSalon) {
        // Salón: bebidas en vale, cocina solo comanda.
        comandaItems = order.items.filter((item) => getTipoImpresion(item) === 'comanda');
      } else {
        // Delivery/takeaway/apps: todo junto salvo no_imprimir.
        comandaItems = order.items.filter((item) => getTipoImpresion(item) !== 'no_imprimir');
      }

      if (comandaItems.length > 0) {
        const comandaOrder = { ...order, items: comandaItems };
        const isDelivery =
          order.service_type === 'delivery' ||
          order.canal_venta === 'rappi' ||
          order.canal_venta === 'pedidos_ya' ||
          order.canal_venta === 'mp_delivery' ||
          order.canal_venta === 'masdelivery';

        let trackingQrBitmap: string | undefined;
        if (isDelivery && trackingToken) {
          try {
            trackingQrBitmap = await generateTrackingQrBitmap(trackingToken);
          } catch {
            /* QR generation failed — print without it */
          }
        }

        const data = isDelivery
          ? generateComandaDelivery(comandaOrder, branchName, printer.paper_width, trackingQrBitmap)
          : generateComandaCompleta(comandaOrder, branchName, printer.paper_width);
        jobs.push({
          type: 'comanda',
          printerId: printer.id,
          dataBase64: data,
          label: isDelivery ? 'Comanda delivery' : 'Comanda cocina',
        });
      }
    }
  }

  return jobs;
}
