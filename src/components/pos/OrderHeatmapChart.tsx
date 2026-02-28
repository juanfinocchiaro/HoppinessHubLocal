import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useOrderHeatmap,
  DAY_LABELS,
  HEATMAP_HOURS,
  type HeatmapMetric,
} from '@/hooks/pos/useOrderHeatmap';

interface Props {
  branchId: string;
  daysBack: number;
}

import { formatCurrency } from '@/lib/formatters';

export function OrderHeatmapChart({ branchId, daysBack }: Props) {
  const [metric, setMetric] = useState<HeatmapMetric>('count');
  const { grid, maxCount, maxTotal, isLoading } = useOrderHeatmap(branchId, daysBack);

  const maxVal = metric === 'count' ? maxCount : maxTotal;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Mapa de calor</CardTitle>
        <Select value={metric} onValueChange={(v) => setMetric(v as HeatmapMetric)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Cantidad pedidos</SelectItem>
            <SelectItem value="total">Monto vendido</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        <TooltipProvider delayDuration={100}>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `60px repeat(${HEATMAP_HOURS.length}, minmax(36px, 1fr))`,
              gridTemplateRows: `auto repeat(${DAY_LABELS.length}, 36px)`,
            }}
          >
            {/* Top-left corner */}
            <div />
            {/* Hour labels */}
            {HEATMAP_HOURS.map((h) => (
              <div key={h} className="text-xs text-muted-foreground text-center font-medium">
                {h}:00
              </div>
            ))}

            {/* Rows */}
            {DAY_LABELS.map((day, di) => (
              <>
                <div
                  key={`label-${di}`}
                  className="text-xs text-muted-foreground flex items-center font-medium"
                >
                  {day}
                </div>
                {HEATMAP_HOURS.map((h, hi) => {
                  const cell = grid[di][hi];
                  const val = metric === 'count' ? cell.count : cell.total;
                  const intensity = maxVal > 0 ? val / maxVal : 0;

                  return (
                    <Tooltip key={`${di}-${hi}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="rounded-sm border border-border/30 transition-colors"
                          style={{
                            backgroundColor:
                              intensity > 0
                                ? `hsla(142, 76%, 36%, ${0.1 + intensity * 0.85})`
                                : 'hsl(var(--muted))',
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">
                          {day} {h}:00
                        </p>
                        <p>{cell.count} pedidos</p>
                        <p>{formatCurrency(cell.total)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end text-xs text-muted-foreground">
          <span>Bajo</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
              <div
                key={o}
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: `hsla(142, 76%, 36%, ${o})` }}
              />
            ))}
          </div>
          <span>Alto</span>
        </div>
      </CardContent>
    </Card>
  );
}
