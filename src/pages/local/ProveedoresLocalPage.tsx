import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  MapPin,
  Package,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { useProveedores, useProveedorMutations } from '@/hooks/useProveedores';
import { ProveedorFormModal } from '@/components/finanzas/ProveedorFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { fetchSaldosProveedores } from '@/services/proveedoresService';
import { useAuth } from '@/hooks/useAuth';
import { useCondicionesByBranch } from '@/hooks/useProveedorCondiciones';
import { CondicionesLocalModal } from '@/components/finanzas/CondicionesLocalModal';

function useSaldosProveedores(branchId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saldos-proveedores', branchId],
    queryFn: async () => {
      const data = await fetchSaldosProveedores(branchId);
      const map: Record<string, { pendiente: number; vencido: number; facturas: number }> = {};
      data.forEach((r: any) => {
        map[r.proveedor_id] = {
          pendiente: Number(r.total_pendiente ?? 0),
          vencido: Number(r.monto_vencido ?? 0),
          facturas: Number(r.facturas_pendientes ?? 0),
        };
      });
      return map;
    },
    enabled: !!user && !!branchId,
  });
}

export default function ProveedoresLocalPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { data: proveedores, isLoading } = useProveedores(branchId);
  const { data: saldos } = useSaldosProveedores(branchId!);
  const { data: condicionesMap } = useCondicionesByBranch(branchId);
  const { softDelete } = useProveedorMutations();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [condicionesTarget, setCondicionesTarget] = useState<{ id: string; name: string } | null>(
    null,
  );

  const filtered = proveedores?.filter(
    (p) => p.razon_social.toLowerCase().includes(search.toLowerCase()) || p.cuit?.includes(search),
  );

  const isLocalProvider = (p: any) => p.ambito === 'local' && p.branch_id === branchId;

  // Totals
  const totalPendiente =
    filtered?.reduce((sum, p) => sum + (saldos?.[p.id]?.pendiente ?? 0), 0) ?? 0;
  const totalVencido = filtered?.reduce((sum, p) => sum + (saldos?.[p.id]?.vencido ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Proveedores" subtitle="Proveedores disponibles para tu local" />

      {/* Summary cards */}
      {totalPendiente > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3 min-w-[200px]">
            <div>
              <p className="text-xs text-muted-foreground">Deuda Total</p>
              <p className="text-lg font-mono font-semibold">
                $ {totalPendiente.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
          {totalVencido > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 min-w-[200px]">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-xs text-destructive">Monto Vencido</p>
                <p className="text-lg font-mono font-semibold text-destructive">
                  $ {totalVencido.toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar proveedor..."
        />
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Cta. Cte.</TableHead>
              <TableHead className="w-16" />
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
                    title="Sin proveedores"
                    description="No hay proveedores disponibles"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const saldo = saldos?.[row.id];
                const pendiente = saldo?.pendiente ?? 0;
                const vencido = saldo?.vencido ?? 0;
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/milocal/${branchId}/finanzas/proveedores/${row.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{row.razon_social}</p>
                      {row.cuit && <p className="text-xs text-muted-foreground">{row.cuit}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.ambito === 'marca' ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {row.ambito === 'marca' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {row.ambito === 'marca' ? 'Marca' : 'Local'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {row.contacto && <p>{row.contacto}</p>}
                        {row.telefono && <p className="text-muted-foreground">{row.telefono}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {pendiente > 0 ? (
                        <div>
                          <span className="font-mono font-semibold">
                            $ {pendiente.toLocaleString('es-AR')}
                          </span>
                          {vencido > 0 && (
                            <p className="text-xs text-destructive font-mono">
                              $ {vencido.toLocaleString('es-AR')} vencido
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const cond = condicionesMap?.[row.id];
                        if (!cond)
                          return (
                            <span className="text-muted-foreground text-xs">Sin configurar</span>
                          );
                        return (
                          <div className="flex items-center gap-1">
                            <Badge variant={cond.permite_cuenta_corriente ? 'default' : 'outline'}>
                              {cond.permite_cuenta_corriente
                                ? `CC ${cond.dias_pago_habitual ?? ''}d`
                                : 'Contado'}
                            </Badge>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Configurar condiciones"
                          onClick={() =>
                            setCondicionesTarget({ id: row.id, name: row.razon_social })
                          }
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        {isLocalProvider(row) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditing(row)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeleting(row)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProveedorFormModal open={showNew} onOpenChange={setShowNew} defaultBranchId={branchId} />
      {editing && (
        <ProveedorFormModal
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          proveedor={editing}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar proveedor"
        description={`¿Estás seguro de eliminar a "${deleting?.razon_social}"? Las facturas asociadas no se eliminarán.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await softDelete.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
      {condicionesTarget && (
        <CondicionesLocalModal
          open={!!condicionesTarget}
          onOpenChange={() => setCondicionesTarget(null)}
          proveedorId={condicionesTarget.id}
          proveedorName={condicionesTarget.name}
          branchId={branchId!}
        />
      )}
    </div>
  );
}
