/**
 * AppSalesSection - App delivery sales with panel comparison
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronDown, Smartphone, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VentasAppsData } from '@/types/shiftClosure';
import { calcularDiferenciasApps } from '@/types/shiftClosure';
import { useBranchClosureConfig } from '@/hooks/useClosureConfig';
import { formatCurrency } from '@/lib/formatters';

interface AppSalesSectionProps {
  branchId: string;
  data: VentasAppsData;
  onChange: (data: VentasAppsData) => void;
  subtotal: number;
}

export function AppSalesSection({ branchId, data, onChange, subtotal }: AppSalesSectionProps) {
  const { data: config } = useBranchClosureConfig(branchId);
  const diferencias = calcularDiferenciasApps(data);

  const handleChange = (app: keyof VentasAppsData, field: string, value: number) => {
    onChange({
      ...data,
      [app]: {
        ...data[app],
        [field]: value,
      },
    });
  };

  const parseNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    return Math.max(0, val);
  };

  

  // Check which apps are enabled
  const isAppEnabled = (appKey: string) => {
    if (!config?.enabledApps) return true;
    return config.enabledApps.get(appKey) !== false;
  };

  // Calculate Núcleo sum for an app
  const getNucleoSum = (app: keyof VentasAppsData): number => {
    switch (app) {
      case 'mas_delivery':
        return data.mas_delivery.efectivo + data.mas_delivery.mercadopago;
      case 'rappi':
        return data.rappi.vales;
      case 'pedidosya':
        return data.pedidosya.efectivo + data.pedidosya.vales;
      case 'mp_delivery':
        return data.mp_delivery.vales;
      default:
        return 0;
    }
  };

  // Render difference indicator
  const renderDiferencia = (app: keyof VentasAppsData) => {
    const appData = diferencias.porApp[app];
    if (appData.panel === 0) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    if (!appData.tieneAlerta) {
      return (
        <span className="text-sm font-medium flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          $0
        </span>
      );
    }
    return (
      <span className="text-sm font-medium flex items-center gap-1 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        {formatCurrency(appData.diferencia)}
      </span>
    );
  };

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Ventas por Apps
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Subtotal:{' '}
                  <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </span>
                {diferencias.totalPaneles > 0 && (
                  <span
                    className={cn(
                      'text-sm font-medium flex items-center gap-1',
                      diferencias.tieneAlerta ? 'text-destructive' : 'text-green-600',
                    )}
                  >
                    {diferencias.tieneAlerta ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </span>
                )}
                <ChevronDown className="w-4 h-4" />
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
                  ¿Cómo verificar con cada app?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Verificar ventas por app</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Cargá los datos de Núcleo y comparalos con el panel de cada app:
                  </p>
                  <div>
                    <strong>Más Delivery:</strong>
                    <p className="text-muted-foreground">
                      App de restaurante → Historial del turno
                    </p>
                  </div>
                  <div>
                    <strong>Rappi:</strong>
                    <p className="text-muted-foreground">Partners Portal → Historial de pedidos</p>
                  </div>
                  <div>
                    <strong>PedidosYa:</strong>
                    <p className="text-muted-foreground">App restaurante → Pedidos entregados</p>
                  </div>
                  <div>
                    <strong>MP Delivery:</strong>
                    <p className="text-muted-foreground">
                      MercadoPago → Actividad → Filtrar delivery
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">Formas de pago en Núcleo</p>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>
                        • Rappi, PeYa, MP Delivery no integrados → <strong>Vales</strong>
                      </li>
                      <li>
                        • PeYa efectivo → <strong>Efectivo</strong> (va a caja del local)
                      </li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Apps grid */}
            <div className="space-y-4">
              {/* Más Delivery */}
              {isAppEnabled('mas_delivery') && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold">Más Delivery</Label>
                    {renderDiferencia('mas_delivery')}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Efectivo (Núcleo)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mas_delivery.efectivo || ''}
                        onChange={(e) => handleChange('mas_delivery', 'efectivo', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">MercadoPago (Núcleo)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mas_delivery.mercadopago || ''}
                        onChange={(e) =>
                          handleChange('mas_delivery', 'mercadopago', parseNumber(e))
                        }
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {/* Cobrado por Posnet - cambio de forma de pago */}
                  <div className="pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Cobrado por Posnet</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.mas_delivery.cobrado_posnet || ''}
                      onChange={(e) =>
                        handleChange('mas_delivery', 'cobrado_posnet', parseNumber(e))
                      }
                      className="h-9"
                      placeholder="0"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pedidos que entraron como efectivo pero se cobraron con tarjeta en el local
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Núcleo: {formatCurrency(getNucleoSum('mas_delivery'))}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mas_delivery.total_panel || ''}
                        onChange={(e) =>
                          handleChange('mas_delivery', 'total_panel', parseNumber(e))
                        }
                        className="h-8 text-sm"
                        placeholder="Total Panel MásDeli"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rappi */}
              {isAppEnabled('rappi') && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold">Rappi</Label>
                    {renderDiferencia('rappi')}
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">
                      Vales (Núcleo) - Todo digital
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.rappi.vales || ''}
                      onChange={(e) => handleChange('rappi', 'vales', parseNumber(e))}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Núcleo: {formatCurrency(getNucleoSum('rappi'))}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.rappi.total_panel || ''}
                        onChange={(e) => handleChange('rappi', 'total_panel', parseNumber(e))}
                        className="h-8 text-sm"
                        placeholder="Total Panel Rappi"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PedidosYa */}
              {isAppEnabled('pedidosya') && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold">PedidosYa</Label>
                    {renderDiferencia('pedidosya')}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Efectivo (Núcleo)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.pedidosya.efectivo || ''}
                        onChange={(e) => handleChange('pedidosya', 'efectivo', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Vales (Núcleo) - App</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.pedidosya.vales || ''}
                        onChange={(e) => handleChange('pedidosya', 'vales', parseNumber(e))}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Núcleo: {formatCurrency(getNucleoSum('pedidosya'))}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.pedidosya.total_panel || ''}
                        onChange={(e) => handleChange('pedidosya', 'total_panel', parseNumber(e))}
                        className="h-8 text-sm"
                        placeholder="Total Panel PeYa"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MP Delivery */}
              {isAppEnabled('mp_delivery') && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold">MP Delivery</Label>
                    {renderDiferencia('mp_delivery')}
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">
                      Vales (Núcleo) - Todo digital
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.mp_delivery.vales || ''}
                      onChange={(e) => handleChange('mp_delivery', 'vales', parseNumber(e))}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Núcleo: {formatCurrency(getNucleoSum('mp_delivery'))}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={data.mp_delivery.total_panel || ''}
                        onChange={(e) => handleChange('mp_delivery', 'total_panel', parseNumber(e))}
                        className="h-8 text-sm"
                        placeholder="Total Panel MP"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary of differences */}
            {diferencias.totalPaneles > 0 && (
              <div
                className={cn(
                  'rounded-lg p-3 text-sm',
                  diferencias.tieneAlerta
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-green-50 text-green-700 border border-green-200',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Resumen Apps</span>
                  {diferencias.tieneAlerta ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
                <div className="flex justify-between mt-1 text-xs opacity-80">
                  <span>Núcleo: {formatCurrency(diferencias.totalNucleo)}</span>
                  <span>Paneles: {formatCurrency(diferencias.totalPaneles)}</span>
                </div>
                {diferencias.tieneAlerta && (
                  <p className="mt-2 text-xs">
                    {diferencias.diferencia > 0
                      ? `Núcleo tiene ${formatCurrency(diferencias.diferencia)} más que los paneles`
                      : `Los paneles reportan ${formatCurrency(Math.abs(diferencias.diferencia))} más que Núcleo`}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
