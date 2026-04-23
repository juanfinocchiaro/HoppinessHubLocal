/**
 * PosnetComparisonSection - Compare Núcleo cards with Posnet terminal
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronDown, CreditCard, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VentasLocalData, VentasAppsData, ComparacionPosnet } from '@/types/shiftClosure';
import { calcularDiferenciaPosnet, calcularDesgloseTarjetas } from '@/types/shiftClosure';
import { formatCurrency } from '@/lib/formatters';

interface PosnetComparisonSectionProps {
  ventasLocal: VentasLocalData;
  ventasApps?: VentasAppsData;
  onPosnetChange: (data: ComparacionPosnet) => void;
}

export function PosnetComparisonSection({
  ventasLocal,
  ventasApps,
  onPosnetChange,
}: PosnetComparisonSectionProps) {
  const comparacion = calcularDiferenciaPosnet(ventasLocal, ventasApps);
  const desglose = calcularDesgloseTarjetas(ventasLocal);

  

  const handleChange = (value: number) => {
    onPosnetChange({ total_posnet: value });
  };

  const parseNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    return Math.max(0, val);
  };

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Comparación con Posnet
              </div>
              <div className="flex items-center gap-2">
                {comparacion.posnet > 0 && (
                  <span
                    className={cn(
                      'text-sm font-medium flex items-center gap-1',
                      comparacion.tieneAlerta ? 'text-destructive' : 'text-green-600',
                    )}
                  >
                    {comparacion.tieneAlerta ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {comparacion.tieneAlerta
                      ? `Dif: ${formatCurrency(comparacion.diferencia)}`
                      : 'Coincide'}
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Help button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  ¿Cómo obtener el cierre del Posnet?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cierre del Posnet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p>Para obtener el total del Posnet:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>
                      En la terminal Posnet, hacé el <strong>cierre del turno</strong>
                    </li>
                    <li>El Posnet imprimirá un ticket con el total</li>
                    <li>
                      Ingresá el <strong>monto total de tarjetas</strong> (incluye Débito, Crédito y
                      QR)
                    </li>
                  </ol>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium mb-1">¿Por qué comparar?</p>
                    <p className="text-muted-foreground">
                      Si el total del Posnet no coincide con lo registrado en Núcleo, puede haber
                      ventas que no se cargaron correctamente o errores de cobro.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Comparison table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">Concepto</th>
                    <th className="text-right py-2 px-3 font-medium">Núcleo</th>
                    <th className="text-center py-2 px-3 font-medium">Posnet</th>
                    <th className="text-right py-2 px-3 font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-3 px-3">
                      <span className="font-medium">Total Tarjetas</span>
                      <span className="block text-xs text-muted-foreground">(Déb + Créd + QR)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrency(comparacion.nucleo)}
                    </td>
                    <td className="py-3 px-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ventasLocal.comparacion_posnet?.total_posnet || ''}
                        onChange={(e) => handleChange(parseNumber(e))}
                        className="h-9 text-center w-28 mx-auto"
                        placeholder="$0"
                      />
                    </td>
                    <td
                      className={cn(
                        'py-3 px-3 text-right font-mono font-medium',
                        comparacion.posnet > 0 && comparacion.tieneAlerta && 'text-destructive',
                        comparacion.posnet > 0 && !comparacion.tieneAlerta && 'text-green-600',
                      )}
                    >
                      {comparacion.posnet > 0 ? (
                        <>
                          {comparacion.tieneAlerta ? (
                            formatCurrency(comparacion.diferencia)
                          ) : (
                            <span className="flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              $0
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Card breakdown */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center">
              <span>
                Débito:{' '}
                <span className="font-mono text-foreground">{formatCurrency(desglose.debito)}</span>
              </span>
              <span>
                Crédito:{' '}
                <span className="font-mono text-foreground">
                  {formatCurrency(desglose.credito)}
                </span>
              </span>
              <span>
                QR: <span className="font-mono text-foreground">{formatCurrency(desglose.qr)}</span>
              </span>
            </div>

            {/* Warning if difference */}
            {comparacion.posnet > 0 && comparacion.tieneAlerta && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Se detectó una diferencia</p>
                  <p className="text-destructive/80 mt-1">
                    {comparacion.diferencia > 0
                      ? `Núcleo tiene ${formatCurrency(comparacion.diferencia)} más que el Posnet`
                      : `El Posnet tiene ${formatCurrency(Math.abs(comparacion.diferencia))} más que Núcleo`}
                    . Revisá si hay ventas mal cargadas o cobros no procesados.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
