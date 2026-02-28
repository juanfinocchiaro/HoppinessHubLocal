/**
 * InvoicingSection - Invoicing input with validation
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Receipt, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface InvoicingSectionProps {
  totalFacturado: number;
  onTotalFacturadoChange: (value: number) => void;
  facturacionEsperada: number;
  totalVendido: number;
  /** Monto total no facturado (calculado dinámicamente según reglas) */
  noFacturado: number;
}

export function InvoicingSection({
  totalFacturado,
  onTotalFacturadoChange,
  facturacionEsperada,
  totalVendido,
  noFacturado,
}: InvoicingSectionProps) {
  const diferencia = totalFacturado - facturacionEsperada;
  const porcentajeDiferencia =
    facturacionEsperada > 0 ? (diferencia / facturacionEsperada) * 100 : 0;
  const tieneAlerta = facturacionEsperada > 0 && Math.abs(porcentajeDiferencia) > 10;
  const esValido = totalFacturado > 0 && !tieneAlerta;

  

  const parseNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    return Math.max(0, val);
  };

  return (
    <Collapsible defaultOpen>
      <Card className={tieneAlerta ? 'border-warning' : esValido ? 'border-success/50' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Facturación
              </div>
              <div className="flex items-center gap-2">
                {tieneAlerta && <AlertTriangle className="w-4 h-4 text-warning" />}
                {esValido && <CheckCircle className="w-4 h-4 text-success" />}
                <ChevronDown className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Total facturado input */}
            <div>
              <Label className="text-sm font-medium">Total facturado</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={totalFacturado || ''}
                onChange={(e) => onTotalFacturadoChange(parseNumber(e))}
                className="h-12 text-xl font-bold"
                placeholder="0"
              />
            </div>

            {/* Calculation breakdown */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Total vendido:</span>
                <span>{formatCurrency(totalVendido)}</span>
              </div>
              {noFacturado > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>No facturado:</span>
                  <span>- {formatCurrency(noFacturado)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Esperado:</span>
                <span>{formatCurrency(facturacionEsperada)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Según las reglas de facturación configuradas para este local.
              </p>
            </div>

            {/* Difference alert */}
            {totalFacturado > 0 && (
              <Alert
                variant={tieneAlerta ? 'destructive' : 'default'}
                className={!tieneAlerta ? 'border-success bg-success/10' : ''}
              >
                {tieneAlerta ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    Diferencia: {diferencia > 0 ? '+' : ''}
                    {formatCurrency(diferencia)}
                  </span>
                  <span className="text-xs">
                    ({porcentajeDiferencia > 0 ? '+' : ''}
                    {porcentajeDiferencia.toFixed(1)}%)
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {tieneAlerta && (
              <p className="text-xs text-warning">
                ⚠️ La diferencia supera el 10%. Verificá los montos ingresados.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
