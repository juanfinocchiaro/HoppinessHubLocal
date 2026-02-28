import { useState, useMemo } from 'react';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useBrandClosuresSummary } from '@/hooks/useShiftClosures';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { startOfMonth, endOfMonth, format, parse } from 'date-fns';

import { formatCurrency } from '@/lib/formatters';

export default function BranchComparisonPage() {
  const { branchRoles } = usePermissionsWithImpersonation();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const from = useMemo(() => startOfMonth(parse(month, 'yyyy-MM', new Date())), [month]);
  const to = useMemo(() => endOfMonth(parse(month, 'yyyy-MM', new Date())), [month]);

  const { data: allSummary, isLoading } = useBrandClosuresSummary(from, to);

  const myBranchIds = new Set(branchRoles.map((r) => r.branch_id));

  const summary = useMemo(() => {
    if (!allSummary) return [];
    return allSummary
      .filter((s) => myBranchIds.has(s.branch.id))
      .sort((a, b) => b.totals.vendido - a.totals.vendido);
  }, [allSummary, myBranchIds]);

  const totalNetwork = useMemo(() => {
    if (!summary.length) return null;
    return summary.reduce(
      (acc, s) => ({
        vendido: acc.vendido + s.totals.vendido,
        hamburguesas: acc.hamburguesas + s.totals.hamburguesas,
        efectivo: acc.efectivo + s.totals.efectivo,
        digital: acc.digital + s.totals.digital,
        alertas: acc.alertas + s.totals.alertas,
      }),
      { vendido: 0, hamburguesas: 0, efectivo: 0, digital: 0, alertas: 0 },
    );
  }, [summary]);

  const avgVendido = totalNetwork && summary.length > 0 ? totalNetwork.vendido / summary.length : 0;

  const TrendIcon = ({ value, avg }: { value: number; avg: number }) => {
    if (value > avg * 1.05) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (value < avg * 0.95) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (branchRoles.length < 2) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comparativo de sucursales"
          subtitle="Necesitás al menos 2 locales asignados"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparativo de sucursales"
        subtitle="Rendimiento mensual lado a lado"
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

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !summary.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay datos de cierres para este período.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Totals */}
          {totalNetwork && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Venta total</p>
                  <p className="text-xl font-bold">{formatCurrency(totalNetwork.vendido)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Hamburguesas</p>
                  <p className="text-xl font-bold">
                    {totalNetwork.hamburguesas.toLocaleString('es-AR')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Efectivo</p>
                  <p className="text-xl font-bold">{formatCurrency(totalNetwork.efectivo)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Digital</p>
                  <p className="text-xl font-bold">{formatCurrency(totalNetwork.digital)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle por sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Hamburguesas</TableHead>
                      <TableHead className="text-right">Efectivo</TableHead>
                      <TableHead className="text-right">Digital</TableHead>
                      <TableHead className="text-right">Ticket prom.</TableHead>
                      <TableHead className="text-center">Alertas</TableHead>
                      <TableHead className="text-center">vs prom.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((s) => {
                      const ticket =
                        s.totals.hamburguesas > 0 ? s.totals.vendido / s.totals.hamburguesas : 0;
                      return (
                        <TableRow key={s.branch.id}>
                          <TableCell className="font-medium">{s.branch.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.totals.vendido)}</TableCell>
                          <TableCell className="text-right">
                            {s.totals.hamburguesas.toLocaleString('es-AR')}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(s.totals.efectivo)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.totals.digital)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(ticket)}</TableCell>
                          <TableCell className="text-center">
                            {s.totals.alertas > 0 ? (
                              <Badge variant="destructive">{s.totals.alertas}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <TrendIcon value={s.totals.vendido} avg={avgVendido} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
