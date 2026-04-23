import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStockCompleto } from '@/hooks/pos/useStock';

interface StockAlertCardProps {
  branchId: string;
}

export function StockAlertCard({ branchId }: StockAlertCardProps) {
  const { data: items } = useStockCompleto(branchId);

  if (!items) return null;

  const criticos = items.filter((i) => i.estado === 'critico');
  const bajos = items.filter((i) => i.estado === 'bajo');

  if (criticos.length === 0 && bajos.length === 0) return null;

  return (
    <Card className={criticos.length > 0 ? 'border-l-4 border-l-destructive' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Alertas de Stock
          </div>
          <div className="flex gap-1">
            {criticos.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticos.length} crítico{criticos.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {bajos.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {bajos.length} bajo{bajos.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {criticos.length > 0 && (
          <div className="space-y-1 mb-2">
            {criticos.slice(0, 5).map((it) => (
              <div key={it.insumo_id} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />
                <span className="truncate">{it.nombre}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {it.cantidad} {it.unidad}
                </span>
              </div>
            ))}
            {criticos.length > 5 && (
              <p className="text-xs text-muted-foreground">y {criticos.length - 5} más...</p>
            )}
          </div>
        )}
        <Link to={`/milocal/${branchId}/ventas/stock`}>
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Ver stock completo
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
