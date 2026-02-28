import { useState } from 'react';
import { fetchPedidoWithDetails, searchFacturasEmitidas } from '@/services/fiscalService';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import type { TicketClienteData } from '@/lib/escpos';
import { errMsg, fmtCurrency } from './shared';
import type { FiscalBranchData, FacturaEmitidaWithPedido } from '@/types/fiscal';

export function ReimprimirCard({
  branchId,
  branchData,
}: {
  branchId: string;
  branchData: FiscalBranchData | null | undefined;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'number' | 'recent' | 'date'>('recent');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [results, setResults] = useState<FacturaEmitidaWithPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing2, setPrinting2] = useState<string | null>(null);

  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleReprint = async (factura: FacturaEmitidaWithPedido) => {
    setPrinting2(factura.id);
    try {
      const { pedido, items, pagos } = await fetchPedidoWithDetails(factura.pedido_id!);
      const pago = pagos[0];

      const { generateTicketCliente, generateArcaQrBitmap } = await import('@/lib/escpos');

      const tipoComprobante = factura.tipo_comprobante || '';
      const isNC = tipoComprobante.includes('NC') || tipoComprobante.includes('Nota de Crédito');
      const tipoLetra = tipoComprobante.includes('B')
        ? 'B'
        : tipoComprobante.includes('C')
          ? 'C'
          : 'A';

      const facturaData = {
        tipo: tipoLetra as 'A' | 'B' | 'C',
        codigo:
          tipoLetra === 'B'
            ? isNC
              ? '008'
              : '006'
            : tipoLetra === 'C'
              ? isNC
                ? '013'
                : '011'
              : isNC
                ? '003'
                : '001',
        numero: `${String(factura.punto_venta).padStart(5, '0')}-${String(factura.numero_comprobante).padStart(8, '0')}`,
        fecha: format(new Date(factura.created_at), 'dd/MM/yyyy'),
        emisor: {
          razon_social: branchData?.razon_social || '',
          cuit: branchData?.cuit || '',
          iibb: branchData?.iibb || '',
          condicion_iva: branchData?.condicion_iva || 'Responsable Inscripto',
          inicio_actividades: branchData?.inicio_actividades || '',
          direccion_fiscal: branchData?.direccion_fiscal || '',
          punto_venta: factura.punto_venta,
        },
        cae: factura.cae || '',
        cae_vto: factura.cae_vencimiento || '',
        qr_base64: '',
        detalle_iva: [] as { alicuota: number; base: number; importe: number }[],
        subtotal_neto: factura.total || 0,
        total_iva: 0,
        total: factura.total || 0,
      };

      try {
        facturaData.qr_base64 = await generateArcaQrBitmap(
          facturaData as unknown as NonNullable<TicketClienteData['factura']>,
        );
      } catch {
        /* QR optional */
      }

      const ticketData = {
        order: {
          numero_pedido: pedido.numero_pedido,
          tipo_servicio: pedido.tipo_servicio,
          numero_llamador: pedido.numero_llamador,
          canal_venta: pedido.canal_venta,
          cliente_nombre: pedido.cliente_nombre,
          referencia_app: (pedido as unknown as Record<string, unknown>).referencia_app as
            | string
            | null,
          created_at: pedido.created_at!,
          items: (items || []).map((it: Tables<'pedido_items'>) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
            notas: it.notas,
            estacion: it.estacion,
            precio_unitario: it.precio_unitario,
            subtotal: it.subtotal,
          })),
          total: pedido.total,
          descuento: pedido.descuento,
          descuento_porcentaje: (pedido as unknown as Record<string, unknown>)
            .descuento_porcentaje as number | undefined,
        },
        branchName: branchData?.name || branchData?.razon_social || '',
        metodo_pago: pago?.metodo || undefined,
        factura: facturaData as unknown as TicketClienteData['factura'],
      };

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

      const base64 = generateTicketCliente(
        ticketData as unknown as TicketClienteData,
        ticketPrinter.paper_width,
      );
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, base64);
      toast.success('Comprobante reimpreso');
    } catch (e: unknown) {
      toast.error('Error al reimprimir: ' + errMsg(e));
    } finally {
      setPrinting2(null);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchFacturasEmitidas(branchId, {
        mode: searchMode,
        searchNumber,
        searchDate,
      });
      setResults((data as unknown as FacturaEmitidaWithPedido[]) || []);
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => {
          setDialogOpen(true);
          handleSearch();
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-green-50 p-4">
            <Printer className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-lg">REIMPRIMIR</CardTitle>
          <CardDescription className="text-center">
            Buscar y reimprimir comprobantes
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reimprimir Comprobante</DialogTitle>
          </DialogHeader>
          <Tabs
            value={searchMode}
            onValueChange={(v) => {
              setSearchMode(v as 'number' | 'recent' | 'date');
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="recent" className="flex-1">
                Ãšltimos 10
              </TabsTrigger>
              <TabsTrigger value="number" className="flex-1">
                Por número
              </TabsTrigger>
              <TabsTrigger value="date" className="flex-1">
                Por fecha
              </TabsTrigger>
            </TabsList>
            <TabsContent value="number" className="mt-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Número de comprobante"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  Buscar
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="date" className="mt-3">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  Buscar
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="recent" className="mt-3">
              <Button
                onClick={handleSearch}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Actualizar
              </Button>
            </TabsContent>
          </Tabs>

          <div className="space-y-2 mt-3">
            {loading && <Skeleton className="h-20 w-full" />}
            {!loading && results.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Sin resultados</p>
            )}
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {r.tipo_comprobante} {String(r.punto_venta).padStart(5, '0')}-
                    {String(r.numero_comprobante).padStart(8, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')} â€” Pedido #
                    {r.pedidos?.numero_pedido}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fmtCurrency(r.total)}</span>
                  <Badge variant={r.anulada ? 'destructive' : 'secondary'} className="text-xs">
                    {r.anulada ? 'Anulada' : 'CAE ' + (r.cae?.slice(-6) || '')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={printing2 === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReprint(r);
                    }}
                    title="Reimprimir comprobante"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
