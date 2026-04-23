import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchInfo } from '@/services/rdoService';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, TrendingUp, Monitor, DollarSign } from 'lucide-react';
import { useVentasMensuales, useVentaMensualMutations } from '@/hooks/useVentasMensuales';
import { VentaMensualFormModal } from '@/components/finanzas/VentaMensualFormModal';
import { EmptyState } from '@/components/ui/states';
import { getCurrentPeriodo } from '@/types/compra';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePosEnabled } from '@/hooks/usePosEnabled';
import { usePosVentasAgregadas } from '@/hooks/usePosVentasAgregadas';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatPeriodo(p: string) {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

export default function VentasMensualesLocalPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenta, setEditingVenta] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; periodo: string } | null>(null);

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => fetchBranchInfo(branchId!),
    enabled: !!branchId,
  });

  const { data: ventas, isLoading } = useVentasMensuales(branchId!);
  const { remove } = useVentaMensualMutations();

  const openModal = (venta?: any) => {
    setEditingVenta(venta || null);
    setModalOpen(true);
  };

  const periodoForNew = editingVenta ? editingVenta.period : getCurrentPeriodo();
  const posEnabled = usePosEnabled(branchId || undefined);
  const currentPeriodo = getCurrentPeriodo();
  const { data: posVentas, isLoading: loadingPos } = usePosVentasAgregadas(
    branchId!,
    currentPeriodo,
    posEnabled,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas Mensuales"
        subtitle={
          branch
            ? `Venta total y efectivo por período â€” ${branch.name}`
            : 'Venta total y efectivo por período'
        }
      />

      {posEnabled && (
        <Alert>
          <Monitor className="w-4 h-4" />
          <AlertDescription>
            Con POS habilitado, las ventas se registran automáticamente desde el Punto de Venta. La
            carga manual está deshabilitada.
          </AlertDescription>
        </Alert>
      )}

      {posEnabled && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <DollarSign className="w-4 h-4" />
              Ventas POS â€” {currentPeriodo} (tiempo real)
            </div>
            {loadingPos ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Venta Total</div>
                  <div className="text-xl font-bold font-mono">
                    $ {(posVentas?.total ?? 0).toLocaleString('es-AR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Efectivo</div>
                  <div className="text-xl font-bold font-mono">
                    $ {(posVentas?.ft ?? 0).toLocaleString('es-AR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Digital</div>
                  <div className="text-xl font-bold font-mono">
                    $ {(posVentas?.fc ?? 0).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        {!posEnabled && (
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" /> Cargar ventas
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Venta Total</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Online</TableHead>
              <TableHead className="text-right">% Ef.</TableHead>
              <TableHead className="text-right">Canon (5%)</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !ventas?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <EmptyState
                    icon={TrendingUp}
                    title="Sin ventas cargadas"
                    description="Cargá las ventas del mes para este local"
                  />
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((v: any) => {
                const ventaTotal = Number(v.total_sales ?? 0);
                const efectivo = Number(v.cash ?? 0);
                const online = ventaTotal - efectivo;
                const pctEf = ventaTotal > 0 ? ((efectivo / ventaTotal) * 100).toFixed(1) : '-';
                const canonTotal = ventaTotal * 0.05;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{formatPeriodo(v.period)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      $ {ventaTotal.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      $ {efectivo.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      $ {online.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={parseFloat(pctEf) > 30 ? 'destructive' : 'secondary'}>
                        {pctEf}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      $ {canonTotal.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell>
                      {!posEnabled && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openModal(v)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: v.id, periodo: v.period })}
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

      {branchId && (
        <VentaMensualFormModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingVenta(null);
          }}
          branchId={branchId}
          branchName={branch?.name}
          periodo={periodoForNew}
          venta={editingVenta}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar registro de ventas"
        description={
          deleteTarget ? `¿Eliminar las ventas de ${formatPeriodo(deleteTarget.periodo)}?` : ''
        }
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
