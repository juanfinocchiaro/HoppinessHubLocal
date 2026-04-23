import { useState } from 'react';
import { format } from 'date-fns';
import { Lock, Printer } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useFiscalXReport, useGenerateZClosing } from '@/hooks/useFiscalReports';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { generateCierreZ, type FiscalZData } from '@/lib/escpos';
import { errMsg, fmtCurrency, Row } from './shared';
import type { FiscalBranchData } from '@/types/fiscal';

export function CierreZCard({
  branchId,
  branchData,
  lastZ,
}: {
  branchId: string;
  branchData: FiscalBranchData | null | undefined;
  lastZ: FiscalZData | null | undefined;
}) {
  const generateZ = useGenerateZClosing(branchId);
  const [previewData, setPreviewData] = useState<FiscalZData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existingZ, setExistingZ] = useState<FiscalZData | null>(null);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);
  const xReport = useFiscalXReport(branchId);

  const handleClick = async () => {
    try {
      const xData = await xReport.mutateAsync(undefined);
      if (xData.total_comprobantes === 0) {
        toast.info('No hay comprobantes emitidos hoy para generar Cierre Z');
        return;
      }
      setConfirmOpen(true);
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes('Ya existe')) {
        setExistingZ(lastZ ?? null);
      } else {
        toast.error(msg || 'Error al verificar');
      }
    }
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      const data = await generateZ.mutateAsync(undefined);
      setPreviewData(data);
      toast.success(`Cierre Z N° ${data.z_number} generado correctamente`);
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes('Ya existe')) {
        toast.error('Ya se generó el Cierre Z del día');
        setExistingZ(lastZ ?? null);
      } else {
        toast.error(msg || 'Error al generar Cierre Z');
      }
    }
  };

  const handlePrint = async (zData: FiscalZData) => {
    if (!branchData) return;
    const ticketPrinter = printConfig?.ticket_printer_id
      ? (printers ?? []).find(
          (p: BranchPrinter) => p.id === printConfig.ticket_printer_id && p.is_active,
        )
      : null;

    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada', {
        description: 'Andá a Configuración > Impresoras para configurarla.',
      });
      return;
    }

    try {
      const data = generateCierreZ(zData, branchData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Cierre Z impreso');
    } catch (e: unknown) {
      toast.error('Error de impresión: ' + errMsg(e));
    }
  };

  const nextZ = lastZ ? lastZ.z_number + 1 : 1;
  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-red-50 p-4">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-lg">CIERRE Z</CardTitle>
          <CardDescription className="text-center">
            Cierre definitivo del día fiscal
          </CardDescription>
          {(generateZ.isPending || xReport.isPending) && <Skeleton className="h-4 w-32" />}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cierre Z</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmar Cierre Z N° {String(nextZ).padStart(4, '0')} del {today}?
              <br />
              <br />
              <strong>Este cierre es definitivo y no puede modificarse.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
              Confirmar Cierre Z
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cierre Z N° {String(previewData?.z_number ?? 0).padStart(4, '0')}
            </DialogTitle>
            <DialogDescription>Cierre generado exitosamente</DialogDescription>
          </DialogHeader>
          {previewData && <ZReportPreview data={previewData} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)}>
              Cerrar
            </Button>
            <Button onClick={() => handlePrint(previewData!)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!existingZ} onOpenChange={() => setExistingZ(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cierre Z ya generado</DialogTitle>
            <DialogDescription>
              Ya se generó el Cierre Z del día. Podés reimprimirlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExistingZ(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                handlePrint(existingZ!);
                setExistingZ(null);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Reimprimir Z
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ZReportPreview({ data }: { data: FiscalZData }) {
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">
        CIERRE Z N° {String(data.z_number).padStart(4, '0')}
      </div>
      <hr />
      <div className="font-bold">Comprobantes: {data.total_invoices}</div>
      <Row label="Facturas B" value={data.total_invoices_b} />
      <Row label="Facturas C" value={data.total_invoices_c} />
      <Row label="NC B" value={data.total_credit_notes_b} />
      <Row label="NC C" value={data.total_credit_notes_c} />
      <hr />
      <div className="font-bold">Totales</div>
      <Row label="Subtotal neto" value={fmtCurrency(data.subtotal_net)} />
      <Row label="Total IVA" value={fmtCurrency(data.total_vat)} />
      <Row label="TOTAL VENTAS" value={fmtCurrency(data.total_sales)} bold />
      <hr />
      <Row label="Notas de Crédito" value={fmtCurrency(data.total_credit_notes_amount)} />
      <Row label="NETO" value={fmtCurrency(data.net_total)} bold />
      <hr />
      <div className="font-bold">Medios de Pago</div>
      <Row label="Efectivo" value={fmtCurrency(data.payment_cash)} />
      <Row label="Débito" value={fmtCurrency(data.payment_debit)} />
      <Row label="Crédito" value={fmtCurrency(data.payment_credit)} />
      <Row label="MP / QR" value={fmtCurrency(data.payment_qr)} />
      <Row label="Transferencia" value={fmtCurrency(data.payment_transfer)} />
    </div>
  );
}
