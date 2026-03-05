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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useProveedores, useProveedorMutations } from '@/hooks/useProveedores';
import { ProveedorFormModal } from '@/components/finanzas/ProveedorFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Proveedor } from '@/types/financial';

export default function ProveedoresPage() {
  const { data: proveedores, isLoading, error: _error } = useProveedores('__marca_only__');
  const { softDelete } = useProveedorMutations();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [deleting, setDeleting] = useState<Proveedor | null>(null);

  const filtered = proveedores?.filter(
    (p) =>
      p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      p.cuit?.includes(search) ||
      p.contacto?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        subtitle="Proveedores asignados a items obligatorios de la marca"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
          </Button>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por razón social, CUIT o contacto..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40">
                  <EmptyState
                    icon={Package}
                    title="Sin proveedores"
                    description="Agregá tu primer proveedor para empezar"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.razon_social}</p>
                    {row.cuit && <p className="text-xs text-muted-foreground">{row.cuit}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {row.contacto && <p>{row.contacto}</p>}
                      {row.telefono && <p className="text-muted-foreground">{row.telefono}</p>}
                    </div>
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

      <ProveedorFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        proveedor={editing}
        context="brand"
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar proveedor"
        description={`¿Estás seguro de eliminar a "${deleting?.business_name}"?`}
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
