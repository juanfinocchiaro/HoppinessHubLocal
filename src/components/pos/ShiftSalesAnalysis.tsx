/**
 * ShiftSalesAnalysis â€” Análisis automático de ventas por turno configurado
 *
 * Muestra ventas agrupadas por las franjas horarias (turnos) configurados
 * en la sección Configuración > Turnos del local.
 */
import { useMemo } from 'react';
import { BarChart3, Clock, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchShifts, fetchShiftAnalysisOrders } from '@/services/posService';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(v);

interface BranchShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  sort_order: number;
}

interface ShiftMetrics {
  shift: BranchShift;
  orders: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function isInShift(orderTime: Date, shift: BranchShift): boolean {
  const startMin = parseTimeToMinutes(shift.start_time);
  const endMin = parseTimeToMinutes(shift.end_time);
  const orderMin = orderTime.getHours() * 60 + orderTime.getMinutes();

  if (endMin > startMin) {
    return orderMin >= startMin && orderMin < endMin;
  }
  // Overnight shift (e.g., 22:00 to 04:00)
  return orderMin >= startMin || orderMin < endMin;
}

export function ShiftSalesAnalysis({
  branchId,
  daysBack = 7,
}: {
  branchId: string;
  daysBack?: number;
}) {
  const { data: shifts, isLoading: loadingShifts } = useQuery({
    queryKey: ['branch-shifts', branchId],
    queryFn: async () => {
      const data = await fetchBranchShifts(branchId);
      return data as BranchShift[];
    },
    enabled: !!branchId,
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['shift-analysis-orders', branchId, daysBack],
    queryFn: async () => {
      const since = new Date(Date.now() - daysBack * 86400000).toISOString();
      return fetchShiftAnalysisOrders(branchId, since);
    },
    enabled: !!branchId,
  });

  const metrics = useMemo((): ShiftMetrics[] => {
    if (!shifts?.length || !orders?.length) return [];

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

    return shifts.map((shift) => {
      const shiftOrders = orders.filter((o) => isInShift(new Date(o.created_at), shift));
      const revenue = shiftOrders.reduce((s, o) => s + Number(o.total), 0);
      return {
        shift,
        orders: shiftOrders.length,
        revenue,
        avgTicket: shiftOrders.length > 0 ? revenue / shiftOrders.length : 0,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    });
  }, [shifts, orders]);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = metrics.reduce((s, m) => s + m.orders, 0);
  const maxRevenue = Math.max(...metrics.map((m) => m.revenue), 1);

  const isLoading = loadingShifts || loadingOrders;

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!shifts?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No hay turnos configurados.</p>
          <p className="text-xs mt-1">
            Configurá turnos en Configuración â†’ Turnos para ver el análisis automático.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Análisis por Turno
        </CardTitle>
        <CardDescription>
          Ventas automáticas por franja horaria â€” últimos {daysBack} días
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary row */}
        <div className="flex gap-4 text-sm pb-2 border-b">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-medium">{fmtCurrency(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span>{totalOrders} pedidos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span>
              Ticket prom: {fmtCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
            </span>
          </div>
        </div>

        {/* Shift breakdown */}
        {metrics.map((m) => (
          <div key={m.shift.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {m.shift.start_time}â€“{m.shift.end_time}
                </Badge>
                <span className="text-sm font-medium">{m.shift.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{m.orders} pedidos</span>
                <span className="font-medium tabular-nums">{fmtCurrency(m.revenue)}</span>
                <Badge variant="secondary" className="text-xs">
                  {m.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ticket promedio: {fmtCurrency(m.avgTicket)}</span>
              <span>{(m.orders / daysBack).toFixed(1)} pedidos/día</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
