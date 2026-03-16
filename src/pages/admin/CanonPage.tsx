import { useState, useMemo } from 'react';
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
import {
  Landmark,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Store,
} from 'lucide-react';
import { useCanonLiquidaciones, usePagosCanonFromProveedores } from '@/hooks/useCanonLiquidaciones';
import { VerificarPagoModal } from '@/components/finanzas/VerificarPagoModal';
import { EmptyState } from '@/components/ui/states';

function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

function formatPeriodo(p: string) {
  const [y, m] = p.split('-');
  const meses = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${meses[parseInt(m) - 1]} ${y}`;
}

function estadoBadge(estado: string | null) {
  if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
  if (estado === 'parcial' || estado === 'pagado_parcial')
    return <Badge variant="secondary">Parcial</Badge>;
  return <Badge variant="destructive">Pendiente</Badge>;
}

function PagosDetalleRow({ branchId, periodo }: { branchId: string; periodo: string }) {
  const { data: pagos, isLoading } = usePagosCanonFromProveedores(branchId, periodo);
  const [verificando, setVerificando] = useState<any>(null);

  if (isLoading)
    return (
      <div className="p-2">
        <Skeleton className="h-5 w-full" />
      </div>
    );
  if (!pagos?.length)
    return (
      <p className="text-sm text-muted-foreground p-3 text-center">
        El local aún no registró pagos para esta liquidación
      </p>
    );

  const pendientes = pagos.filter((p: any) => !p.is_verified);
  const verificados = pagos.filter((p: any) => p.is_verified);

  return (
    <div className="space-y-3">
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide flex items-center gap-1 text-amber-700">
            <AlertCircle className="w-3 h-3" /> Pendientes de verificación ({pendientes.length})
          </p>
          {pendientes.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-sm border rounded-lg p-3 border-amber-200 bg-amber-50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-mono font-semibold">
                  $ {Number(p.amount).toLocaleString('es-AR')}
                </span>
                <span className="text-muted-foreground">{formatLocalDate(p.payment_date)}</span>
                <Badge variant="outline" className="w-fit">
                  {p.payment_method}
                </Badge>
                {p.referencia && (
                  <span className="text-xs text-muted-foreground">Ref: {p.referencia}</span>
                )}
              </div>
              <Button size="sm" onClick={() => setVerificando(p)} className="shrink-0">
                Verificar
              </Button>
            </div>
          ))}
        </div>
      )}
      {verificados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide flex items-center gap-1 text-green-700">
            <CheckCircle className="w-3 h-3" /> Verificados ({verificados.length})
          </p>
          {verificados.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-sm border rounded p-2 opacity-70"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono">$ {Number(p.amount).toLocaleString('es-AR')}</span>
                <span className="text-muted-foreground">{formatLocalDate(p.payment_date)}</span>
                <span className="text-muted-foreground">{p.payment_method}</span>
              </div>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" /> Verificado
              </Badge>
            </div>
          ))}
        </div>
      )}
      {verificando && (
        <VerificarPagoModal
          open={!!verificando}
          onOpenChange={() => setVerificando(null)}
          pago={verificando}
        />
      )}
    </div>
  );
}

interface BranchGroup {
  branchId: string;
  branchName: string;
  liquidaciones: any[];
  totalCanon: number;
  totalSaldo: number;
  hasPendientes: boolean;
}

export default function CanonPage() {
  const { data: liquidaciones, isLoading } = useCanonLiquidaciones();
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const filtered = useMemo(
    () =>
      liquidaciones?.filter((row: any) => {
        if (filtroEstado === 'todos') return true;
        return row.status === filtroEstado;
      }) ?? [],
    [liquidaciones, filtroEstado],
  );

  const branchGroups = useMemo<BranchGroup[]>(() => {
    const map = new Map<string, BranchGroup>();
    for (const row of filtered) {
      const id = row.branch_id;
      if (!map.has(id)) {
        map.set(id, {
          branchId: id,
          branchName: row.branches?.name || '-',
          liquidaciones: [],
          totalCanon: 0,
          totalSaldo: 0,
          hasPendientes: false,
        });
      }
      const g = map.get(id)!;
      g.liquidaciones.push(row);
      g.totalCanon += Number(row.total_canon);
      g.totalSaldo += Number(row.pending_balance ?? 0);
      if (row.status !== 'pagado') g.hasPendientes = true;
    }
    return Array.from(map.values()).sort((a, b) => a.branchName.localeCompare(b.branchName));
  }, [filtered]);

  const totalPendientes = liquidaciones?.filter((r: any) => r.status !== 'pagado').length ?? 0;
  const totalSaldoGlobal = branchGroups.reduce((s, g) => s + g.totalSaldo, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Canon y Liquidaciones"
        subtitle="Verificá los pagos registrados por cada local antes de dar por cancelada la liquidación"
      />

      <div className="flex flex-wrap gap-3">
        {totalPendientes > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg border text-sm bg-amber-50 border-amber-200 text-amber-800 flex-1 min-w-[200px]">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              <strong>{totalPendientes}</strong> liquidaciones pendientes
            </span>
          </div>
        )}
        {totalSaldoGlobal > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg border text-sm bg-destructive/10 border-destructive/20 text-destructive flex-1 min-w-[200px]">
            <Landmark className="w-4 h-4 shrink-0" />
            <span>
              Saldo total pendiente:{' '}
              <strong className="font-mono">$ {totalSaldoGlobal.toLocaleString('es-AR')}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {branchGroups.length} locales · {filtered.length} liquidaciones
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !branchGroups.length ? (
        <div className="border rounded-lg p-8">
          <EmptyState
            icon={Landmark}
            title="Sin liquidaciones"
            description="Las liquidaciones se generan automáticamente al cargar ventas mensuales"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {branchGroups.map((group) => {
            const isOpen = expandedBranch === group.branchId;
            return (
              <div key={group.branchId} className="border rounded-lg overflow-hidden">
                {/* Branch header */}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpandedBranch(isOpen ? null : group.branchId)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Store className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">{group.branchName}</span>
                    <Badge variant="outline" className="ml-1">
                      {group.liquidaciones.length} liq.
                    </Badge>
                    {group.hasPendientes && (
                      <Badge variant="destructive" className="text-xs">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Canon</p>
                      <p className="font-mono font-semibold">
                        $ {group.totalCanon.toLocaleString('es-AR')}
                      </p>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p
                        className={`font-mono font-semibold ${group.totalSaldo > 0 ? 'text-destructive' : 'text-green-600'}`}
                      >
                        {group.totalSaldo > 0
                          ? `$ ${group.totalSaldo.toLocaleString('es-AR')}`
                          : '$ 0'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expanded: liquidaciones table */}
                {isOpen && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8" />
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Canon</TableHead>
                          <TableHead className="text-right">Marketing</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.liquidaciones.map((row: any) => (
                          <>
                            <TableRow
                              key={row.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                            >
                              <TableCell>
                                {expandedRow === row.id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatPeriodo(row.period)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                $ {Number(row.canon_amount).toLocaleString('es-AR')}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({row.canon_percentage}%)
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                $ {Number(row.marketing_amount).toLocaleString('es-AR')}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({row.marketing_percentage}%)
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                $ {Number(row.total_canon).toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell>{estadoBadge(row.estado)}</TableCell>
                              <TableCell className="text-right font-mono text-destructive">
                                {Number(row.pending_balance) > 0
                                  ? `$ ${Number(row.pending_balance).toLocaleString('es-AR')}`
                                  : '-'}
                              </TableCell>
                            </TableRow>
                            {expandedRow === row.id && (
                              <TableRow key={`${row.id}-pagos`}>
                                <TableCell colSpan={7} className="bg-muted/20 p-4">
                                  <PagosDetalleRow branchId={row.branch_id} periodo={row.periodo} />
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
