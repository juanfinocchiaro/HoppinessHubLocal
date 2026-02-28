/**
 * ReportsPage - Consolidated reporting for informes/inversor role
 * Shows P&L summary, sales comparison, and hours summary by branch
 */
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Clock, DollarSign, Download } from 'lucide-react';
import { useBrandClosuresSummary } from '@/hooks/useShiftClosures';
import { useQuery } from '@tanstack/react-query';
import { fetchGastosSummary, fetchClockEntriesSummary } from '@/services/adminService';
import { startOfMonth, endOfMonth, format, parse } from 'date-fns';
import { exportToExcel } from '@/lib/exportExcel';
import { formatCurrency } from '@/lib/formatters';

const fmtNum = (n: number) => n.toLocaleString('es-AR');

export default function ReportsPage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const from = useMemo(() => startOfMonth(parse(month, 'yyyy-MM', new Date())), [month]);
  const to = useMemo(() => endOfMonth(parse(month, 'yyyy-MM', new Date())), [month]);

  const { data: salesSummary, isLoading: loadingSales } = useBrandClosuresSummary(from, to);

  const { data: gastosData, isLoading: loadingGastos } = useQuery({
    queryKey: ['brand-gastos-summary', month],
    queryFn: async () => {
      const data = await fetchGastosSummary(month);
      const byBranch: Record<string, number> = {};
      data.forEach((g) => {
        byBranch[g.branch_id] = (byBranch[g.branch_id] || 0) + Number(g.monto || 0);
      });
      return byBranch;
    },
  });

  const { data: hoursData, isLoading: loadingHours } = useQuery({
    queryKey: ['brand-hours-summary', month],
    queryFn: async () => {
      const startStr = format(from, 'yyyy-MM-dd');
      const endStr = format(to, 'yyyy-MM-dd');

      const data = await fetchClockEntriesSummary(startStr, endStr);
      const clockIns: Record<string, number> = {};
      data.forEach((e) => {
        if (e.entry_type === 'clock_in') {
          clockIns[e.branch_id] = (clockIns[e.branch_id] || 0) + 1;
        }
      });
      return clockIns;
    },
  });

  const isLoading = loadingSales || loadingGastos || loadingHours;

  const rows = useMemo(() => {
    if (!salesSummary) return [];
    return salesSummary
      .map((s) => {
        const gastos = gastosData?.[s.branch.id] || 0;
        const clockIns = hoursData?.[s.branch.id] || 0;
        const margin = s.totals.vendido - gastos;
        const marginPct = s.totals.vendido > 0 ? (margin / s.totals.vendido) * 100 : 0;
        const ticketPromedio =
          s.totals.hamburguesas > 0 ? s.totals.vendido / s.totals.hamburguesas : 0;

        return {
          branch: s.branch.name,
          branchId: s.branch.id,
          vendido: s.totals.vendido,
          efectivo: s.totals.efectivo,
          digital: s.totals.digital,
          hamburguesas: s.totals.hamburguesas,
          gastos,
          margin,
          marginPct,
          ticketPromedio,
          clockIns,
          alertas: s.totals.alertas,
        };
      })
      .filter((r) => r.vendido > 0 || r.gastos > 0 || r.clockIns > 0);
  }, [salesSummary, gastosData, hoursData]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          vendido: acc.vendido + r.vendido,
          efectivo: acc.efectivo + r.efectivo,
          digital: acc.digital + r.digital,
          hamburguesas: acc.hamburguesas + r.hamburguesas,
          gastos: acc.gastos + r.gastos,
          margin: acc.margin + r.margin,
          clockIns: acc.clockIns + r.clockIns,
          alertas: acc.alertas + r.alertas,
        }),
        {
          vendido: 0,
          efectivo: 0,
          digital: 0,
          hamburguesas: 0,
          gastos: 0,
          margin: 0,
          clockIns: 0,
          alertas: 0,
        },
      ),
    [rows],
  );

  const handleExport = (tab: string) => {
    if (tab === 'pnl') {
      exportToExcel(
        rows.map((r) => ({
          Sucursal: r.branch,
          Venta: r.vendido,
          Gastos: r.gastos,
          Margen: r.margin,
          'Margen %': `${r.marginPct.toFixed(1)}%`,
        })),
        {
          Sucursal: 'Sucursal',
          Venta: 'Venta',
          Gastos: 'Gastos',
          Margen: 'Margen',
          'Margen %': 'Margen %',
        },
        { filename: `PnL_${month}` },
      );
    } else if (tab === 'ventas') {
      exportToExcel(
        rows.map((r) => ({
          Sucursal: r.branch,
          'Venta Total': r.vendido,
          Efectivo: r.efectivo,
          Digital: r.digital,
          Hamburguesas: r.hamburguesas,
          'Ticket Prom.': r.ticketPromedio,
          Alertas: r.alertas,
        })),
        {
          Sucursal: 'Sucursal',
          'Venta Total': 'Venta Total',
          Efectivo: 'Efectivo',
          Digital: 'Digital',
          Hamburguesas: 'Hamburguesas',
          'Ticket Prom.': 'Ticket Prom.',
          Alertas: 'Alertas',
        },
        { filename: `Ventas_${month}` },
      );
    } else {
      exportToExcel(
        rows.map((r) => ({
          Sucursal: r.branch,
          Fichajes: r.clockIns,
          Venta: r.vendido,
        })),
        { Sucursal: 'Sucursal', Fichajes: 'Fichajes', Venta: 'Venta' },
        { filename: `Horas_${month}` },
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Resumen consolidado por período"
        icon={<BarChart3 className="w-5 h-5" />}
      />

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>Período</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Venta total
            </div>
            <p className="text-xl font-bold mt-1">
              {isLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totals.vendido)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              Gastos total
            </div>
            <p className="text-xl font-bold mt-1">
              {isLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totals.gastos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              Margen bruto
            </div>
            <p className="text-xl font-bold mt-1">
              {isLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totals.margin)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Hamburguesas
            </div>
            <p className="text-xl font-bold mt-1">
              {isLoading ? <Skeleton className="h-7 w-24" /> : fmtNum(totals.hamburguesas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pnl">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="horas">Actividad</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pnl" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Resultado por sucursal</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleExport('pnl')}
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Venta</TableHead>
                        <TableHead className="text-right">Gastos</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.branchId}>
                          <TableCell className="font-medium">{r.branch}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.vendido)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.gastos)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(r.margin)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                r.marginPct >= 30
                                  ? 'default'
                                  : r.marginPct >= 15
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {r.marginPct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length > 1 && (
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(totals.vendido)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.gastos)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.margin)}</TableCell>
                          <TableCell className="text-right">
                            {totals.vendido > 0
                              ? `${((totals.margin / totals.vendido) * 100).toFixed(1)}%`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ventas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Ventas por sucursal</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleExport('ventas')}
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Venta</TableHead>
                        <TableHead className="text-right">Efectivo</TableHead>
                        <TableHead className="text-right">Digital</TableHead>
                        <TableHead className="text-right">Hamburguesas</TableHead>
                        <TableHead className="text-right">Ticket prom.</TableHead>
                        <TableHead className="text-center">Alertas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.branchId}>
                          <TableCell className="font-medium">{r.branch}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.vendido)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.efectivo)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.digital)}</TableCell>
                          <TableCell className="text-right">{fmtNum(r.hamburguesas)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(r.ticketPromedio)}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.alertas > 0 ? (
                              <Badge variant="destructive">{r.alertas}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Actividad por sucursal</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleExport('horas')}
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Fichajes</TableHead>
                        <TableHead className="text-right">Venta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.branchId}>
                          <TableCell className="font-medium">{r.branch}</TableCell>
                          <TableCell className="text-right">{fmtNum(r.clockIns)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.vendido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
