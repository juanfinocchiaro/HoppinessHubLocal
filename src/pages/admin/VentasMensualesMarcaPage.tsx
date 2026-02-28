import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveBranches, fetchVentasMensualesMarca } from '@/services/adminService';
import { PageHeader } from '@/components/ui/page-header';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { VentaMensualFormModal } from '@/components/finanzas/VentaMensualFormModal';
import { EmptyState } from '@/components/ui/states';
import { getCurrentPeriodo } from '@/types/compra';
import { useVentaMensualMutations } from '@/hooks/useVentasMensuales';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatPeriodo(p: string) {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function getPeriodoOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

export default function VentasMensualesMarcaPage() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingVenta, setEditingVenta] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; branchName: string } | null>(null);
  const { remove } = useVentaMensualMutations();

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-all'],
    queryFn: fetchActiveBranches,
    enabled: !!user,
  });

  const { data: ventas, isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas-mensuales-marca', periodo],
    queryFn: () => fetchVentasMensualesMarca(periodo),
    enabled: !!user && !!periodo,
  });

  // Modelo: venta_total = total, efectivo = parte en cash, online = venta_total - efectivo
  const rows =
    branches?.map((branch) => {
      const venta = ventas?.find((v) => v.branch_id === branch.id);
      const ventaTotal = Number(venta?.venta_total ?? 0);
      const efectivo = Number(venta?.efectivo ?? 0);
      const online = ventaTotal - efectivo;
      const pctEf = ventaTotal > 0 ? ((efectivo / ventaTotal) * 100).toFixed(1) : '-';
      const canonEfectivo = efectivo * 0.05;
      const canonOnline = online * 0.05;
      const canonTotal = canonEfectivo + canonOnline;
      return {
        branch,
        venta,
        ventaTotal,
        efectivo,
        online,
        pctEf,
        canonEfectivo,
        canonOnline,
        canonTotal,
      };
    }) || [];

  const totVenta = rows.reduce((s, r) => s + (r.venta ? r.ventaTotal : 0), 0);
  const totEfectivo = rows.reduce((s, r) => s + (r.venta ? r.efectivo : 0), 0);
  const totOnline = totVenta - totEfectivo;
  const totCanon = totVenta * 0.05;
  const cargados = rows.filter((r) => r.venta).length;

  const openModal = (branchId: string, venta?: any) => {
    setEditingBranchId(branchId);
    setEditingVenta(venta || null);
    setModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ventas Mensuales por Local"
        subtitle="Venta total y efectivo por período"
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-48">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getPeriodoOptions().map((p) => (
                <SelectItem key={p} value={p}>
                  {formatPeriodo(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            Cargados:{' '}
            <strong>
              {cargados}/{rows.length}
            </strong>
          </span>
          <span className="text-muted-foreground">
            Venta: <strong className="font-mono">$ {totVenta.toLocaleString('es-AR')}</strong>
          </span>
          <span className="text-muted-foreground">
            Online: <strong className="font-mono">$ {totOnline.toLocaleString('es-AR')}</strong>
          </span>
          <span className="text-muted-foreground">
            Canon: <strong className="font-mono">$ {totCanon.toLocaleString('es-AR')}</strong>
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Venta Total</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Online</TableHead>
              <TableHead className="text-right">% Ef.</TableHead>
              <TableHead className="text-right">Canon</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingBranches || loadingVentas ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState
                    icon={TrendingUp}
                    title="Sin locales"
                    description="No hay sucursales activas"
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ branch, venta, ventaTotal, efectivo, online, pctEf, canonTotal }) => (
                <>
                  <TableRow key={branch.id}>
                    <TableCell>
                      {venta && (
                        <button
                          onClick={() => setExpanded(expanded === branch.id ? null : branch.id)}
                        >
                          {expanded === branch.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {venta ? `$ ${ventaTotal.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {venta ? `$ ${efectivo.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {venta ? `$ ${online.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {venta ? (
                        <Badge variant={parseFloat(pctEf) > 30 ? 'destructive' : 'secondary'}>
                          {pctEf}%
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {venta ? `$ ${canonTotal.toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell>
                      {venta ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModal(branch.id, venta)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteTarget({ id: venta.id, branchName: branch.name })
                            }
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => openModal(branch.id)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Cargar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === branch.id && venta && (
                    <TableRow key={`${branch.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/30">
                        <div className="p-3 space-y-3 text-sm">
                          <div>
                            <p className="font-medium mb-1">Desglose de Canon</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 ml-2">
                              <p>Canon 4,5% Uso de Marca</p>
                              <p className="font-mono text-right">
                                ${' '}
                                {(ventaTotal * 0.045).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                              <p>Canon 0,5% Mkt y Publicidad</p>
                              <p className="font-mono text-right">
                                ${' '}
                                {(ventaTotal * 0.005).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                              <p className="font-semibold border-t pt-1">Total Canon</p>
                              <p className="font-mono font-semibold text-right border-t pt-1">
                                ${' '}
                                {(ventaTotal * 0.05).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Forma de Pago</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 ml-2">
                              <p className="font-semibold text-green-700">
                                💵 Pagar en efectivo{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                  (5% del efectivo)
                                </span>
                              </p>
                              <p className="font-mono font-semibold text-green-700 text-right">
                                ${' '}
                                {(efectivo * 0.05).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                              <p className="font-semibold text-blue-700">
                                🏦 Pagar por transferencia{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                  (5% del online)
                                </span>
                              </p>
                              <p className="font-mono font-semibold text-blue-700 text-right">
                                ${' '}
                                {(online * 0.05).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                          {venta.observaciones && (
                            <p className="text-muted-foreground">Obs: {venta.observaciones}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Cargado: {new Date(venta.created_at).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.some((r) => r.venta) && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Venta Total</p>
                <p className="text-lg font-bold font-mono">$ {totVenta.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Efectivo</p>
                <p className="text-lg font-bold font-mono">
                  $ {totEfectivo.toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Venta Online</p>
                <p className="text-lg font-bold font-mono">$ {totOnline.toLocaleString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Canon Total (5%)</p>
                <p className="text-lg font-bold font-mono">$ {totCanon.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editingBranchId && (
        <VentaMensualFormModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setEditingBranchId(null);
              setEditingVenta(null);
            }
          }}
          branchId={editingBranchId}
          branchName={branches?.find((b) => b.id === editingBranchId)?.name}
          periodo={periodo}
          venta={editingVenta}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar registro de ventas"
        description={`¿Estás seguro de eliminar las ventas de ${deleteTarget?.branchName} para ${formatPeriodo(periodo)}?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
