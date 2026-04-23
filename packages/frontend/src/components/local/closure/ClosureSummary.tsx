/**
 * ClosureSummary - Real-time summary with alerts
 */
import { Card, CardContent } from '@/components/ui/card';
import {
  UtensilsCrossed,
  DollarSign,
  Banknote,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface AlertInfo {
  posnet: boolean;
  apps: boolean;
  caja: boolean;
  facturacion: boolean;
}

interface ClosureSummaryProps {
  totalHamburguesas: number;
  totalVendido: number;
  totalEfectivo: number;
  totalDigital: number;
  totalFacturado: number;
  alertas?: AlertInfo;
}

export function ClosureSummary({
  totalHamburguesas,
  totalVendido,
  totalEfectivo,
  totalDigital,
  totalFacturado,
  alertas,
}: ClosureSummaryProps) {
  

  const tieneAlertas =
    alertas && (alertas.posnet || alertas.apps || alertas.caja || alertas.facturacion);

  return (
    <Card
      className={cn(
        'border-2',
        tieneAlertas ? 'bg-destructive/5 border-destructive/30' : 'bg-primary/5 border-primary/20',
      )}
    >
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {/* Hamburguesas */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs">Hamburguesas</span>
            </div>
            <p className="text-xl font-bold">{totalHamburguesas}</p>
          </div>

          {/* Total vendido */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Vendido</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalVendido)}</p>
          </div>

          {/* Efectivo */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Banknote className="w-4 h-4" />
              <span className="text-xs">Efectivo</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalEfectivo)}</p>
          </div>

          {/* Digital */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Digital</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalDigital)}</p>
          </div>
        </div>

        {/* Facturado */}
        {totalFacturado > 0 && (
          <div className="mt-4 pt-3 border-t text-center">
            <span className="text-sm text-muted-foreground">Facturado: </span>
            <span className="font-bold">{formatCurrency(totalFacturado)}</span>
          </div>
        )}

        {/* Alertas section */}
        {alertas && tieneAlertas && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Alertas Detectadas</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {alertas.posnet && (
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                  Diferencia Posnet
                </span>
              )}
              {alertas.apps && (
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                  Diferencia Apps
                </span>
              )}
              {alertas.caja && (
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                  Diferencia Caja
                </span>
              )}
              {alertas.facturacion && (
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                  Diferencia Facturación
                </span>
              )}
            </div>
          </div>
        )}

        {/* All good indicator */}
        {alertas && !tieneAlertas && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Sin alertas</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
