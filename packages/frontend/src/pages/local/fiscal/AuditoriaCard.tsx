import { useState } from 'react';
import { Search, Printer, Calendar, Hash } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useFiscalAuditReport, useZClosings } from '@/hooks/useFiscalReports';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { generateInformeAuditoria, type FiscalAuditData } from '@/lib/escpos';
import { errMsg, fmtCurrency, Row } from './shared';
import type { FiscalBranchData } from '@/types/fiscal';

export function AuditoriaCard({
  branchId,
  branchData,
}: {
  branchId: string;
  branchData: FiscalBranchData | null | undefined;
}) {
  const auditReport = useFiscalAuditReport(branchId);
  const { data: zClosings } = useZClosings(branchId);
  const [mode, setMode] = useState<'date' | 'z'>('date');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromZ, setFromZ] = useState('');
  const [toZ, setToZ] = useState('');
  const [previewData, setPreviewData] = useState<FiscalAuditData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleOpen = () => {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    setFromDate(thirtyDaysAgo);
    setToDate(today);
    if (zClosings?.length) {
      setFromZ(String(zClosings[zClosings.length - 1]?.z_number || 1));
      setToZ(String(zClosings[0]?.z_number || 1));
    }
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    try {
      const data = await auditReport.mutateAsync({
        mode,
        fromDate: mode === 'date' ? fromDate : undefined,
        toDate: mode === 'date' ? toDate : undefined,
        fromZ: mode === 'z' ? parseInt(fromZ) : undefined,
        toZ: mode === 'z' ? parseInt(toZ) : undefined,
      });
      setPreviewData(data);
      setDialogOpen(false);
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Error al generar informe de auditoría');
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
      const printData = generateInformeAuditoria(
        previewData,
        branchData,
        ticketPrinter.paper_width,
      );
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, printData);
      toast.success('Informe de auditoría impreso');
    } catch (e: unknown) {
      toast.error('Error de impresión: ' + errMsg(e));
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleOpen}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-amber-50 p-4">
            <Search className="h-10 w-10 text-amber-600" />
          </div>
          <CardTitle className="text-lg">AUDITORÍA</CardTitle>
          <CardDescription className="text-center">
            Consolidado de Cierres Z por período
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informe de Auditoría</DialogTitle>
            <DialogDescription>Seleccioná el rango para el informe</DialogDescription>
          </DialogHeader>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'date' | 'z')}>
            <TabsList className="w-full">
              <TabsTrigger value="date" className="flex-1 gap-1.5">
                <Calendar className="h-4 w-4" /> Por fecha
              </TabsTrigger>
              <TabsTrigger value="z" className="flex-1 gap-1.5">
                <Hash className="h-4 w-4" /> Por N° de Z
              </TabsTrigger>
            </TabsList>
            <TabsContent value="date" className="space-y-3 mt-3">
              <div>
                <Label>Desde</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </TabsContent>
            <TabsContent value="z" className="space-y-3 mt-3">
              <div>
                <Label>Desde Z N°</Label>
                <Input
                  type="number"
                  value={fromZ}
                  onChange={(e) => setFromZ(e.target.value)}
                  min={1}
                />
              </div>
              <div>
                <Label>Hasta Z N°</Label>
                <Input type="number" value={toZ} onChange={(e) => setToZ(e.target.value)} min={1} />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={auditReport.isPending}>
              {auditReport.isPending ? 'Generando...' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informe de Auditoría</DialogTitle>
          </DialogHeader>
          {previewData && <AuditPreview data={previewData} />}
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

function AuditPreview({ data }: { data: FiscalAuditData }) {
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">INFORME DE AUDITORÍA</div>
      <div className="text-center text-muted-foreground">
        Z {data.desde_z} a Z {data.hasta_z} — {data.cantidad_jornadas} jornadas
      </div>
      <hr />
      <div className="font-bold">Resumen por Jornada</div>
      {data.jornadas?.map((j, i) => (
        <Row
          key={i}
          label={`${j.fecha} | Z ${String(j.z_number).padStart(4, '0')}`}
          value={fmtCurrency(j.total_sales)}
        />
      ))}
      <hr />
      <div className="font-bold">Totales del Período</div>
      <Row label="Total comprobantes" value={data.total_comprobantes} />
      <Row label="Ventas brutas" value={fmtCurrency(data.total_ventas_brutas)} />
      <Row label="Notas de crédito" value={fmtCurrency(data.total_nc)} />
      <Row label="Total neto" value={fmtCurrency(data.total_neto)} bold />
      <Row label="IVA 21%" value={fmtCurrency(data.total_iva_21)} />
      <Row label="IVA 10.5%" value={fmtCurrency(data.total_iva_105)} />
    </div>
  );
}
