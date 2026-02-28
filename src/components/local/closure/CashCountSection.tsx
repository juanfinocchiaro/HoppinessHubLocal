/**
 * CashCountSection - Record cash difference from Núcleo
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
import { ChevronDown, Banknote, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArqueoCaja } from '@/types/shiftClosure';
import { formatCurrency } from '@/lib/formatters';

interface CashCountSectionProps {
  data: ArqueoCaja;
  onChange: (data: ArqueoCaja) => void;
}

export function CashCountSection({ data, onChange }: CashCountSectionProps) {
  const tieneAlerta = data.diferencia_caja !== 0;

  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow negative values for cash difference
    const val = parseFloat(e.target.value) || 0;
    onChange({ diferencia_caja: val });
  };

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Arqueo de Caja
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium flex items-center gap-1',
                    tieneAlerta ? 'text-destructive' : 'text-green-600',
                  )}
                >
                  {tieneAlerta ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Dif: {formatCurrency(data.diferencia_caja)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Caja exacta
                    </>
                  )}
                </span>
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
                  ¿Cómo obtener la diferencia de caja?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arqueo de Caja en Núcleo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p>Para obtener la diferencia de caja:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>
                      En Núcleo, hacé el <strong>cierre de caja</strong> del turno
                    </li>
                    <li>Contá el efectivo físico en la caja</li>
                    <li>Núcleo te mostrará si hay diferencia entre lo esperado y lo contado</li>
                    <li>Ingresá esa diferencia acá</li>
                  </ol>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <p className="font-medium">¿Cómo cargar la diferencia?</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>
                        • Si la caja cerró <strong>exacta</strong>: dejá $0
                      </li>
                      <li>
                        • Si <strong>falta</strong> dinero: poné el monto en{' '}
                        <strong>negativo</strong> (ej: -500)
                      </li>
                      <li>
                        • Si <strong>sobra</strong> dinero: poné el monto en{' '}
                        <strong>positivo</strong> (ej: +200)
                      </li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Input field */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Ingresá la diferencia de caja que te da Núcleo:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-medium">$</span>
                  <Input
                    type="number"
                    step={0.01}
                    value={data.diferencia_caja || ''}
                    onChange={handleChange}
                    className="h-12 text-xl text-center w-40 font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ diferencia_caja: 0 })}
                  className={cn(data.diferencia_caja === 0 && 'ring-2 ring-green-500')}
                >
                  Caja exacta ($0)
                </Button>
              </div>
            </div>

            {/* Status indicator */}
            {tieneAlerta && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {data.diferencia_caja < 0
                      ? `Faltan ${formatCurrency(Math.abs(data.diferencia_caja))} en la caja`
                      : `Sobran ${formatCurrency(data.diferencia_caja)} en la caja`}
                  </p>
                  <p className="text-destructive/80 mt-1">
                    Esta diferencia se registrará y se asociará a quien cierra el turno.
                  </p>
                </div>
              </div>
            )}

            {!tieneAlerta && (
              <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Caja exacta</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
