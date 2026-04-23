import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Download,
  FileUp,
  FileText,
  Loader2,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { useFacturas, useFacturaMutations } from '@/hooks/useCompras';
import { useUploadFacturaPdf } from '@/hooks/useProveedorDocumentos';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { CompraFormModal } from '@/components/finanzas/CompraFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { FacturaProveedor } from '@/types/compra';

/** Parse YYYY-MM-DD as local date to avoid UTC→local shift */
function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

export default function ComprasPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: facturas, isLoading } = useFacturas(branchId!);
  const { softDelete } = useFacturaMutations();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<FacturaProveedor | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const uploadPdf = useUploadFacturaPdf();
  const [uploadingFacturaId, setUploadingFacturaId] = useState<string | null>(null);

  const filtered = facturas?.filter((f: any) => {
    const matchesSearch =
      f.suppliers?.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.invoice_number?.includes(search);
    const matchesFrom = !dateFrom || (f.invoice_date && f.invoice_date >= dateFrom);
    const matchesTo = !dateTo || (f.invoice_date && f.invoice_date <= dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const estadoBadge = (estado: string | null) => {
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'vencido') return <Badge variant="destructive">Vencido</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        subtitle="Registrá compras con o sin comprobante"
        actions={
          <div className="flex gap-2">
            {filtered && filtered.length > 0 && (
              <Button
                variant="outline"
                onClick={() =>
                  exportToExcel(
                    filtered.map((f: any) => ({
                      fecha: f.invoice_date ? formatLocalDate(f.invoice_date) : '-',
                      proveedor: f.suppliers?.business_name || '-',
                      numero: f.invoice_number || '-',
                      total: f.total || 0,
                      estado: f.estado || '-',
                      vencimiento: f.due_date ? formatLocalDate(f.due_date) : '-',
                    })),
                    {
                      fecha: 'Fecha',
                      proveedor: 'Proveedor',
                      numero: 'Nº Factura',
                      total: 'Total',
                      estado: 'Estado',
                      vencimiento: 'Vencimiento',
                    },
                    { filename: 'compras' },
                  )
                }
              >
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nueva Compra
            </Button>
          </div>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por proveedor o nº factura..."
        filters={
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Nº Factura</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState
                    icon={ShoppingCart}
                    title="Sin compras"
                    description="Registrá tu primera compra"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => {
                const isCanon = row.invoice_number?.startsWith('CANON-');
                return (
                  <>
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                      <TableCell>
                        {expanded === row.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatLocalDate(row.invoice_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to={`/milocal/${branchId}/finanzas/proveedores/${row.proveedor_id}`}
                          className="text-primary hover:underline whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.suppliers?.business_name}
                        </Link>
                        {isCanon && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Automática
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono whitespace-nowrap">
                        {row.invoice_type ? `${row.invoice_type}-` : ''}
                        {row.invoice_number}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        $ {Number(row.total).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell>{estadoBadge(row.payment_status)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.due_date ? formatLocalDate(row.due_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(row as any).factura_pdf_url ? (
                            <Button variant="ghost" size="icon" asChild>
                              <a
                                href={(row as any).factura_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver PDF"
                              >
                                <FileText className="w-4 h-4 text-red-500" />
                              </a>
                            </Button>
                          ) : !isCanon ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Adjuntar PDF"
                              disabled={uploadPdf.isPending && uploadingFacturaId === row.id}
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'application/pdf';
                                input.onchange = (ev) => {
                                  const file = (ev.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    setUploadingFacturaId(row.id);
                                    uploadPdf.mutate(
                                      { facturaId: row.id, file },
                                      {
                                        onSettled: () => setUploadingFacturaId(null),
                                      },
                                    );
                                  }
                                };
                                input.click();
                              }}
                            >
                              {uploadPdf.isPending && uploadingFacturaId === row.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileUp className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          ) : null}
                          {!isCanon && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === row.id && row.invoice_items?.length > 0 && (
                      <TableRow key={`${row.id}-items`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead>Ud.</TableHead>
                                <TableHead className="text-right">P.Neto</TableHead>
                                <TableHead className="text-right">IVA</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.invoice_items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">
                                    {item.supplies?.name || item.service_concepts?.name || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {Number(item.quantity)}
                                  </TableCell>
                                  <TableCell className="text-sm">{item.unidad || '-'}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    $ {Number(item.precio_unitario).toLocaleString('es-AR')}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-muted-foreground">
                                    {item.alicuota_iva != null ? `${item.alicuota_iva}%` : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    $ {Number(item.subtotal).toLocaleString('es-AR')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CompraFormModal open={modalOpen} onOpenChange={setModalOpen} branchId={branchId!} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar factura"
        description="¿Estás seguro de eliminar esta factura?"
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await softDelete.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
