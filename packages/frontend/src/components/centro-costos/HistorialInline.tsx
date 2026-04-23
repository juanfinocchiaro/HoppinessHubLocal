
import { useItemCartaHistorial } from '@/hooks/useItemsCarta';
import { formatCurrency } from '@/lib/formatters';

export function HistorialInline({ item }: { item: any }) {
  const { data: historial, isLoading } = useItemCartaHistorial(item?.id);
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando historial...</p>;
  if (!historial || historial.length === 0)
    return <p className="text-sm text-muted-foreground">Sin historial de precios.</p>;
  return (
    <div className="space-y-2">
      {historial.map((h: any) => (
        <div key={h.id} className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground w-32">
            {new Date(h.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="font-mono text-destructive">{formatCurrency(h.previous_price)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono text-primary font-semibold">{formatCurrency(h.new_price)}</span>
          {h.reason && (
            <span className="text-xs text-muted-foreground truncate flex-1">({h.reason})</span>
          )}
        </div>
      ))}
    </div>
  );
}
