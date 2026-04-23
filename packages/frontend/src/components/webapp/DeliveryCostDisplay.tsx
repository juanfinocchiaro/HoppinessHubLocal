import { Truck, Clock, Info, Loader2 } from 'lucide-react';

interface DeliveryCostDisplayProps {
  cost: number;
  distanceKm: number;
  estimatedDeliveryMin: number;
  disclaimer: string | null;
}

export function DeliveryCostDisplay({
  cost,
  distanceKm: _distanceKm,
  estimatedDeliveryMin,
  disclaimer,
}: DeliveryCostDisplayProps) {
  const timeRange = `${Math.max(estimatedDeliveryMin - 5, 10)}-${estimatedDeliveryMin + 10}`;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-green-600" />
          Envío: ${cost.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />~{timeRange} min
        </div>
      </div>
      {disclaimer && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {disclaimer}
        </p>
      )}
    </div>
  );
}

export function DeliveryCostLoading() {
  return (
    <div className="rounded-lg border p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Calculando costo de envío...
    </div>
  );
}
