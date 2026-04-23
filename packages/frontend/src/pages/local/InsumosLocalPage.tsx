import { useState } from 'react';
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
import { Package, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { useInsumos, useInsumoMutations } from '@/hooks/useInsumos';
import { InsumoFormModal } from '@/components/finanzas/InsumoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Insumo } from '@/types/financial';

export default function InsumosLocalPage() {
  const { data: insumos, isLoading } = useInsumos();
  const { softDelete: deleteInsumo } = useInsumoMutations();
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);

  const filtered = insumos?.filter((i: any) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Insumos" subtitle="Catálogo de insumos disponibles para tu local" />

      <div className="flex items-center justify-between mb-4">
        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar insumo..."
        />
        <Button
          onClick={() => {
            setEditingInsumo(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Insumo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Último Precio</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                    title="Sin insumos"
                    description="No hay insumos en el catálogo"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => {
                const isObligatorio = row.nivel_control === 'obligatorio';
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      {row.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {row.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {isObligatorio ? (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="w-3 h-3" /> Marca
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Local</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.supply_categories?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.base_unit}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.reference_price
                        ? `$${Number(row.reference_price).toLocaleString('es-AR')}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {!isObligatorio && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingInsumo(row);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingInsumo(row)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InsumoFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingInsumo(null);
        }}
        insumo={editingInsumo}
        context="local"
      />

      <ConfirmDialog
        open={!!deletingInsumo}
        onOpenChange={() => setDeletingInsumo(null)}
        title="Eliminar insumo"
        description={`¿Eliminar "${deletingInsumo?.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletingInsumo) await deleteInsumo.mutateAsync(deletingInsumo.id);
          setDeletingInsumo(null);
        }}
      />
    </div>
  );
}
