import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useFiscalXReport } from '@/hooks/useFiscalReports';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { generateInformeX, type FiscalXData } from '@/lib/escpos';
import { errMsg, fmtCurrency, Row } from './shared';
import type { FiscalBranchData } from '@/types/fiscal';

export function InformeXCard({
  branchId,
  branchData,
}: {
  branchId: string;
  branchData: FiscalBranchData | null | undefined;
}) {
  const xReport = useFiscalXReport(branchId);
  const [previewData, setPreviewData] = useState<FiscalXData | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleClick = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setDatePickerOpen(true);
  };

  const handleGenerate = async () => {
    setDatePickerOpen(false);
    try {
      const data = await xReport.mutateAsync(selectedDate);
      setPreviewData(data);
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Error al generar Informe X');
    }
  };

  const handlePrint = async () => {
    if (!previewData || !branchData) return;
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
      const data = generateInformeX(previewData, branchData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Informe X impreso');
    } catch (e: unknown) {
      toast.error('Error de impresión: ' + errMsg(e));
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-lg">INFORME X</CardTitle>
          <CardDescription className="text-center">
            Consulta en vivo — No cierra jornada
          </CardDescription>
          {xReport.isPending && <Skeleton className="h-4 w-32" />}
        </CardContent>
      </Card>

      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe X</DialogTitle>
            <DialogDescription>Seleccioná la fecha para generar el informe</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatePickerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={xReport.isPending}>
              {xReport.isPending ? 'Generando...' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informe X — Vista Previa</DialogTitle>
            <DialogDescription>Fecha: {selectedDate}</DialogDescription>
          </DialogHeader>
          {previewData && <XReportPreview data={previewData} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)}>
              Cerrar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function XReportPreview({ data }: { data: FiscalXData }) {
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">INFORME X</div>
      <div className="text-center text-muted-foreground">
        Fecha: {data.fecha} — Hora: {data.hora}
      </div>
      <hr />
      <div className="font-bold">Comprobantes</div>
      <Row label="Facturas B" value={data.facturas_b} />
      <Row label="Facturas C" value={data.facturas_c} />
      <Row label="NC B" value={data.notas_credito_b} />
      <Row label="NC C" value={data.notas_credito_c} />
      <hr />
      <div className="font-bold">IVA</div>
      <Row label="Gravado 21%" value={fmtCurrency(data.gravado_21)} />
      <Row label="IVA 21%" value={fmtCurrency(data.iva_21)} />
      <Row label="Gravado 10.5%" value={fmtCurrency(data.gravado_105)} />
      <Row label="IVA 10.5%" value={fmtCurrency(data.iva_105)} />
      <Row label="Exento" value={fmtCurrency(data.exento)} />
      <hr />
      <div className="font-bold">Totales</div>
      <Row label="Subtotal neto" value={fmtCurrency(data.subtotal_neto)} />
      <Row label="Total IVA" value={fmtCurrency(data.total_iva)} />
      <Row label="TOTAL VENTAS" value={fmtCurrency(data.total_ventas)} bold />
      <hr />
      <div className="font-bold">Medios de Pago</div>
      <Row label="Efectivo" value={fmtCurrency(data.pago_efectivo)} />
      <Row label="Débito" value={fmtCurrency(data.pago_debito)} />
      <Row label="Crédito" value={fmtCurrency(data.pago_credito)} />
      <Row label="MP / QR" value={fmtCurrency(data.pago_qr)} />
      <Row label="Transferencia" value={fmtCurrency(data.pago_transferencia)} />
      {data.ultimo_comprobante && (
        <>
          <hr />
          <div className="text-center text-muted-foreground">Último: {data.ultimo_comprobante}</div>
        </>
      )}
    </div>
  );
}
