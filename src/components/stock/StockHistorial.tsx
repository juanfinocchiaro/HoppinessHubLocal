import { useStockMovimientos } from '@/hooks/pos/useStock';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const TIPO_LABELS: Record<string, string> = {
  ajuste: 'Ajuste',
  stock_inicial: 'Stock inicial',
  conteo_fisico: 'Conteo físico',
  venta: 'Venta',
  compra: 'Compra',
};

interface StockHistorialProps {
  branchId: string;
  insumoId: string;
}

export function StockHistorial({ branchId, insumoId }: StockHistorialProps) {
  const { data, isLoading } = useStockMovimientos(branchId, insumoId);

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!data?.length)
    return <p className="text-xs text-muted-foreground py-2 px-4">Sin movimientos registrados</p>;

  return (
    <div className="divide-y border-t">
      {data.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-2 px-4 text-xs">
          <span className="text-muted-foreground w-28 flex-shrink-0">
            {m.created_at ? format(new Date(m.created_at), 'dd/MM HH:mm') : '-'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {TIPO_LABELS[(m as any).type ?? (m as any).tipo] ?? (m as any).type ?? (m as any).tipo}
          </Badge>
          <span className="flex-1 truncate text-muted-foreground">{(m as any).reason || (m as any).motivo || (m as any).note || '-'}</span>
          <span className="font-mono tabular-nums">
            {Number(m.quantity_before ?? (m as any).cantidad_anterior).toFixed(1)} → {Number(m.quantity_after ?? (m as any).cantidad_nueva).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
