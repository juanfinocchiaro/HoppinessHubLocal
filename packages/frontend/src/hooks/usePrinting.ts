/**
 * usePrinting - Hook de impresión directa via Print Bridge
 *
 * Envía datos ESC/POS a impresoras térmicas vía Print Bridge (HTTP localhost:3001).
 * Print Bridge abre conexión TCP directa a la impresora en la red local.
 */
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  insertPrintJob,
  updatePrintJobStatus,
  logCompletedPrintJob,
  fetchPedidoForTracking,
  fetchBranchCoords,
  insertDeliveryTracking,
} from '@/services/printingService';
import { toast } from 'sonner';
import { printRawBase64, detectPrintBridge } from '@/lib/qz-print';
import {
  generateComandaCompleta,
  generateComandaEstacion,
  generateComandaDelivery,
  generateTicketCliente,
  generateTestPage,
  generateArcaQrBitmap,
  type PrintableOrder,
  type PrintableItem,
  type TicketClienteData,
} from '@/lib/escpos';
import type { BranchPrinter } from '@/hooks/useBranchPrinters';
import type { PrintConfig } from '@/hooks/usePrintConfig';
import { buildPrintJobs, type FacturaPrintData, type PaymentPrintData } from '@/lib/print-router';

export type PrintBridgeStatus = 'checking' | 'connected' | 'not_available';

interface PrintJobInput {
  branchId: string;
  printer: BranchPrinter;
  jobType: string;
  pedidoId?: string;
  dataBase64: string;
}

async function sendToPrinter(printer: BranchPrinter, dataBase64: string): Promise<boolean> {
  if (!printer.ip_address) {
    throw new Error('La impresora no tiene IP configurada');
  }

  try {
    await printRawBase64(printer.ip_address, printer.port, dataBase64);
    return true;
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.includes('Print Bridge no disponible') || msg.includes('Failed to fetch')) {
      throw new Error(
        'Sistema de impresión no detectado. Andá a Configuración > Impresoras para instalarlo.',
      );
    }
    throw new Error(
      `No se pudo conectar a ${printer.ip_address}:${printer.port} â€” ${msg || 'verificá que la impresora esté encendida y en la misma red.'}`,
    );
  }
}

export function usePrinting(branchId: string) {
  const [bridgeStatus, setBridgeStatus] = useState<PrintBridgeStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    detectPrintBridge()
      .then((result) => {
        if (!cancelled) setBridgeStatus(result.available ? 'connected' : 'not_available');
      })
      .catch(() => {
        if (!cancelled) setBridgeStatus('not_available');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const printMutation = useMutation({
    mutationFn: async ({ printer, jobType, pedidoId, dataBase64 }: PrintJobInput) => {
      const jobRecord = await insertPrintJob({
        branch_id: branchId,
        printer_id: printer.id,
        job_type: jobType,
        pedido_id: pedidoId || null,
        payload: { data_base64: dataBase64 },
        status: 'printing',
      });

      try {
        const success = await sendToPrinter(printer, dataBase64);
        if (!success) throw new Error('No se pudo imprimir');
        if (jobRecord?.id) {
          await updatePrintJobStatus(jobRecord.id, 'completed');
        }
      } catch (err) {
        if (jobRecord?.id) {
          const errMsg = err instanceof Error ? err.message : 'Unknown';
          await updatePrintJobStatus(jobRecord.id, 'error', errMsg);
        }
        throw err;
      }
    },
    onSuccess: () => {
      toast.success('Impreso correctamente');
    },
    onError: (err, variables) => {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      const printerName = variables?.printer?.name || 'Impresora';
      const printerIp = variables?.printer?.ip_address || '';

      if (msg.includes('Sistema de impresión')) {
        toast.error('Sistema de impresión no detectado', {
          description: 'Andá a Configuración > Impresoras para instalar el sistema de impresión.',
          duration: 10000,
        });
      } else {
        toast.error(`Error al imprimir en ${printerName}`, {
          description: printerIp
            ? `No se pudo conectar a ${printerIp}. Verificá que esté encendida y en la misma red.`
            : msg,
          duration: 8000,
        });
      }
    },
  });

  const printComandaCompleta = (
    order: PrintableOrder,
    branchName: string,
    printer: BranchPrinter,
  ) => {
    const data = generateComandaCompleta(order, branchName, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'comanda_completa',
      pedidoId: undefined,
      dataBase64: data,
    });
  };

  const printComandaEstacion = (
    order: PrintableOrder,
    stationName: string,
    stationItems: PrintableItem[],
    branchName: string,
    printer: BranchPrinter,
  ) => {
    const data = generateComandaEstacion(
      order,
      stationName,
      stationItems,
      branchName,
      printer.paper_width,
    );
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'comanda_estacion',
      dataBase64: data,
    });
  };

  const printTicket = async (ticketData: TicketClienteData, printer: BranchPrinter) => {
    let finalData = ticketData;
    if (ticketData.factura && !ticketData.factura.qr_bitmap_b64) {
      try {
        const qr = await generateArcaQrBitmap(ticketData.factura);
        finalData = { ...ticketData, factura: { ...ticketData.factura, qr_bitmap_b64: qr } };
      } catch {
        /* fallback sin QR */
      }
    }
    const data = generateTicketCliente(finalData, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'ticket',
      dataBase64: data,
    });
  };

  const printDelivery = (
    order: PrintableOrder & { cliente_telefono?: string | null; cliente_direccion?: string | null },
    branchName: string,
    printer: BranchPrinter,
  ) => {
    const data = generateComandaDelivery(order, branchName, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'delivery',
      dataBase64: data,
    });
  };

  const printTest = (printer: BranchPrinter, branchName: string) => {
    const data = generateTestPage(printer.name, branchName, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'test',
      dataBase64: data,
    });
  };

  const printOrder = async (
    order: PrintableOrder & {
      items: (PrintableItem & {
        categoria_carta_id?: string | null;
        precio_unitario?: number;
        subtotal?: number;
      })[];
      total?: number;
      descuento?: number;
    },
    config: PrintConfig,
    allPrinters: BranchPrinter[],
    categorias: {
      id: string;
      name: string;
      print_type: 'comanda' | 'vale' | 'no_imprimir';
    }[],
    branchName: string,
    esSalon: boolean,
    payment?: PaymentPrintData,
    factura?: FacturaPrintData | null,
    pedidoId?: string,
  ) => {
    // Create delivery_tracking row for canal propio delivery orders
    let trackingToken: string | undefined;
    const isCanalPropio =
      !order.canal_venta || order.canal_venta === 'mostrador' || order.canal_venta === 'webapp';
    if (pedidoId && order.service_type === 'delivery' && isCanalPropio) {
      try {
        const pedido = await fetchPedidoForTracking(pedidoId);
        if (!pedido?.branch_id) throw new Error('Pedido not found for tracking');

        const branch = await fetchBranchCoords(pedido.branch_id);

        const tracking = await insertDeliveryTracking({
          pedido_id: pedidoId,
          dest_lat: pedido?.delivery_lat ?? null,
          dest_lng: pedido?.delivery_lng ?? null,
          store_lat: branch?.latitude ?? null,
          store_lng: branch?.longitude ?? null,
        });

        if (tracking) {
          trackingToken = tracking.tracking_token;
        }
      } catch (err) {
        console.error('Failed to create delivery tracking:', err);
      }
    }

    const jobs = await buildPrintJobs(
      order,
      config,
      allPrinters,
      categorias,
      branchName,
      esSalon,
      payment,
      factura,
      trackingToken,
    );

    for (const job of jobs) {
      const printer = allPrinters.find((p) => p.id === job.printerId);
      if (printer) {
        try {
          await sendToPrinter(printer, job.dataBase64);
          await logCompletedPrintJob({
            branch_id: branchId,
            printer_id: printer.id,
            pedido_id: pedidoId || null,
            job_type: job.type,
            payload: { data_base64: job.dataBase64 },
            status: 'completed',
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          toast.error(`Error al imprimir ${job.label}`, { description: msg });
          await logCompletedPrintJob({
            branch_id: branchId,
            printer_id: printer.id,
            pedido_id: pedidoId || null,
            job_type: job.type,
            payload: { data_base64: job.dataBase64 },
            status: 'error',
            error_message: msg,
          });
        }
      }
    }
  };

  return {
    printComandaCompleta,
    printComandaEstacion,
    printTicket,
    printDelivery,
    printTest,
    printOrder,
    isPrinting: printMutation.isPending,
    bridgeStatus,
  };
}
