import { useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import {
  useConsumosManuales,
  useConsumoManualMutations,
  CATEGORIA_PL_OPTIONS,
  TIPO_CONSUMO_OPTIONS,
} from '@/hooks/useConsumosManuales';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { ConsumoManualFormModal } from '@/components/finanzas/ConsumoManualFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
// Tables type not needed for renamed tables

type ConsumoManual = any;

export default function ConsumosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: consumos, isLoading } = useConsumosManuales(branchId!);
  const { softDelete } = useConsumoManualMutations();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConsumoManual | null>(null);
  const [deleting, setDeleting] = useState<ConsumoManual | null>(null);

  const filtered = consumos?.filter((c) => {
    const matchesSearch =
      c.categoria_pl.toLowerCase().includes(search.toLowerCase()) ||
      (c.observaciones || '').toLowerCase().includes(search.toLowerCase());
    const matchesFrom = !dateFrom || (c.created_at && c.created_at >= dateFrom);
    const matchesTo = !dateTo || (c.created_at && c.created_at <= dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const getCatLabel = (key: string) =>
    CATEGORIA_PL_OPTIONS.find((c) => c.value === key)?.label || key;
  const getTipoLabel = (key: string | null) =>
    TIPO_CONSUMO_OPTIONS.find((c) => c.value === key)?.label || key || 'Manual';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumos Manuales"
        subtitle="Consumos internos por categoría P&L"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Consumo
          </Button>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por categoría..."
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
              <TableHead>Período</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <EmptyState
                    icon={Package}
                    title="Sin consumos"
                    description="Registrá el primer consumo manual"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm font-mono">{row.periodo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCatLabel(row.categoria_pl)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{getTipoLabel(row.tipo)}</TableCell>
                  <TableCell className="text-right font-mono">
                    $ {Number(row.monto_consumido).toLocaleString('es-AR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {row.observaciones || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(row);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConsumoManualFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        branchId={branchId!}
        consumo={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar consumo"
        description={`¿Eliminar consumo de ${getCatLabel(deleting?.categoria_pl || '')}?`}
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
