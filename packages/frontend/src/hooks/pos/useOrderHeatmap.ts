/**
 * useOrderHeatmap - Generates heatmap data (7 days x hours) from delivered orders
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDeliveredOrders } from '@/services/posService';
import { subDays, startOfDay, format, getDay, getHours } from 'date-fns';

export interface HeatmapCell {
  count: number;
  total: number;
}

export type HeatmapMetric = 'count' | 'total';

// Hours 11-23 (operational range)
export const HEATMAP_HOURS = Array.from({ length: 13 }, (_, i) => i + 11);
// Days Mon(1) to Sun(0) mapped to 0-6 index
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export { DAY_LABELS };

function dayIndex(jsDay: number) {
  // JS getDay: 0=Sun,1=Mon...6=Sat → we want Mon=0...Sun=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function useOrderHeatmap(branchId: string | undefined, daysBack: number) {
  const fromDate = format(subDays(startOfDay(new Date()), daysBack), 'yyyy-MM-dd');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['pos-order-heatmap', branchId, daysBack],
    queryFn: () => fetchDeliveredOrders(branchId!, fromDate),
    enabled: !!branchId,
  });

  const { grid, maxCount, maxTotal } = useMemo(() => {
    // 7 days x 13 hours
    const g: HeatmapCell[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 13 }, () => ({ count: 0, total: 0 })),
    );
    let mc = 0;
    let mt = 0;

    (rawData ?? []).forEach((row) => {
      const d = new Date(row.created_at!);
      const di = dayIndex(getDay(d));
      const h = getHours(d);
      const hi = h - 11;
      if (hi < 0 || hi >= 13) return;
      g[di][hi].count += 1;
      g[di][hi].total += row.total || 0;
      if (g[di][hi].count > mc) mc = g[di][hi].count;
      if (g[di][hi].total > mt) mt = g[di][hi].total;
    });

    return { grid: g, maxCount: mc, maxTotal: mt };
  }, [rawData]);

  return { grid, maxCount, maxTotal, isLoading, DAY_LABELS, HEATMAP_HOURS };
}
