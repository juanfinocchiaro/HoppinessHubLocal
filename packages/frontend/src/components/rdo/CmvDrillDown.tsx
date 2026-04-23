/**
 * CMV Drill-Down: Shows food cost breakdown by items_carta
 * when a CMV category is expanded in the RDO.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { UtensilsCrossed } from 'lucide-react';

interface CmvDrillDownProps {
  rdoCategoryCode: string;
}

const formatCurrency = (value: number) =>
  `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

export function CmvDrillDown({ rdoCategoryCode }: CmvDrillDownProps) {
  const { data: allItems, isLoading } = useItemsCarta();

  const items = useMemo(() => {
    if (!allItems) return [];
    return allItems
      .filter((i: any) => i.rdo_category_code === rdoCategoryCode && i.costo_total > 0)
      .sort((a: any, b: any) => (b.fc_actual || 0) - (a.fc_actual || 0));
  }, [allItems, rdoCategoryCode]);

  if (isLoading) {
    return (
      <div className="pl-14 space-y-1 py-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pl-14 py-2 text-xs text-muted-foreground italic flex items-center gap-1">
        <UtensilsCrossed className="w-3 h-3" /> Sin items de carta asignados a esta categoría
      </div>
    );
  }

  return (
    <div className="pl-14 py-1 space-y-0.5">
      <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
        <UtensilsCrossed className="w-3 h-3" /> Desglose por producto
      </div>
      {items.map((item: any) => (
        <div key={item.id} className="flex justify-between items-center py-0.5 text-xs">
          <span className="text-muted-foreground truncate max-w-[200px]">{item.name}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">
              {formatCurrency(item.costo_total)}
            </span>
            <span className="font-mono">{formatCurrency(item.base_price)}</span>
            {item.fc_actual != null && (
              <Badge
                variant={
                  item.fc_actual <= 32
                    ? 'default'
                    : item.fc_actual <= 40
                      ? 'secondary'
                      : 'destructive'
                }
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {item.fc_actual.toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
