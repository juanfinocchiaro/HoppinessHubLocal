/**
 * CashierDiscrepancyStats - Estadísticas de discrepancias de cajero (Fase 7)
 */
import { useCashierStats } from '@/hooks/useCashierDiscrepancies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Target, Calendar, Info } from 'lucide-react';

interface CashierDiscrepancyStatsProps {
  userId: string;
  branchId?: string;
  currentDiscrepancy?: number;
  showCurrentDiscrepancy?: boolean;
}

export function CashierDiscrepancyStats({
  userId,
  branchId,
  currentDiscrepancy = 0,
  showCurrentDiscrepancy = true,
}: CashierDiscrepancyStatsProps) {
  const { data: stats, isLoading } = useCashierStats(userId, branchId);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));

    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  };

  const getDiscrepancyColor = (amount: number) => {
    if (amount === 0) return 'text-green-600 dark:text-green-400';
    if (amount > 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPrecisionColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (pct >= 70)
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Tu historial de diferencias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCurrentDiscrepancy && (
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm text-muted-foreground">Diferencia este turno:</span>
            <span className={`text-lg font-bold ${getDiscrepancyColor(currentDiscrepancy)}`}>
              {formatCurrency(currentDiscrepancy)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Este mes
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-lg font-semibold ${getDiscrepancyColor(stats.discrepancy_this_month)}`}
              >
                {formatCurrency(stats.discrepancy_this_month)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Turnos cerrados</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold">{stats.total_shifts}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Precisión</div>
            <Badge className={getPrecisionColor(stats.precision_pct)}>
              {stats.precision_pct}% ({stats.perfect_shifts}/{stats.total_shifts})
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Histórico total</div>
            <div className="flex items-center gap-1">
              {stats.discrepancy_total < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : stats.discrepancy_total > 0 ? (
                <TrendingUp className="h-4 w-4 text-blue-500" />
              ) : null}
              <span className={`font-semibold ${getDiscrepancyColor(stats.discrepancy_total)}`}>
                {formatCurrency(stats.discrepancy_total)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <p>Esto es un indicador de desempeño.</p>
        </div>
      </CardContent>
    </Card>
  );
}
