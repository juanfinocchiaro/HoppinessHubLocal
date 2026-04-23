/**
 * LocalSalesSection - Local sales by channel with card total indicator
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
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Store, HelpCircle, CreditCard } from 'lucide-react';
import type { VentasLocalData, VentasAppsData, ChannelPayments } from '@/types/shiftClosure';
import { calcularTotalTarjetasNucleo } from '@/types/shiftClosure';
import { formatCurrency } from '@/lib/formatters';

interface LocalSalesSectionProps {
  data: VentasLocalData;
  onChange: (data: VentasLocalData) => void;
  subtotal: number;
  /** Optional: when provided, Total Tarjetas includes cobrado_posnet (Más Delivery) for Posnet comparison */
  ventasApps?: VentasAppsData;
}

const CHANNELS = [
  { key: 'salon', label: 'Salón' },
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'delivery_manual', label: 'Delivery Manual' },
] as const;

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', short: 'Efect.' },
  { key: 'debito', label: 'Débito', short: 'Déb.' },
  { key: 'credito', label: 'Crédito', short: 'Créd.' },
  { key: 'qr', label: 'QR', short: 'QR' },
  { key: 'transferencia', label: 'Transf.', short: 'Transf.' },
] as const;

export function LocalSalesSection({
  data,
  onChange,
  subtotal,
  ventasApps,
}: LocalSalesSectionProps) {
  const totalTarjetas = calcularTotalTarjetasNucleo(data, ventasApps);

  const handleChange = (
    channel: keyof Omit<VentasLocalData, 'comparacion_posnet'>,
    method: keyof ChannelPayments,
    value: number,
  ) => {
    onChange({
      ...data,
      [channel]: {
        ...data[channel],
        [method]: value,
      },
    });
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
                <Store className="w-4 h-4" />
                Ventas en Mostrador
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Subtotal:{' '}
                  <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </span>
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
                  ¿Cómo obtener estos datos de Núcleo?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Obtener datos de Núcleo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p>Para obtener los datos de ventas desde Núcleo:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Ingresá a Núcleo con tu usuario</li>
                    <li>
                      Andá a <strong>Reportes → Ventas del día</strong>
                    </li>
                    <li>Filtrá por el turno que estás cerrando</li>
                    <li>Los montos aparecen separados por forma de pago</li>
                  </ol>
                  <p className="text-muted-foreground">
                    Tip: Los canales Salón, Takeaway y Delivery Manual corresponden a ventas
                    directas en el local o por WhatsApp/teléfono.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Card total indicator for Posnet comparison */}
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <CreditCard className="w-3 h-3" />
                Total Tarjetas: {formatCurrency(totalTarjetas)}
              </Badge>
              <span className="text-xs text-muted-foreground">(para comparar con Posnet)</span>
            </div>

            {/* Sales grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-medium">Canal</th>
                    {PAYMENT_METHODS.map((pm) => (
                      <th key={pm.key} className="text-center py-2 px-1 font-medium min-w-[70px]">
                        <span className="hidden sm:inline">{pm.label}</span>
                        <span className="sm:hidden">{pm.short}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CHANNELS.map((channel) => (
                    <tr key={channel.key} className="border-b">
                      <td className="py-2 pr-2 font-medium text-muted-foreground">
                        {channel.label}
                      </td>
                      {PAYMENT_METHODS.map((pm) => (
                        <td key={pm.key} className="py-2 px-1">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={data[channel.key][pm.key] || ''}
                            onChange={(e) => handleChange(channel.key, pm.key, parseNumber(e))}
                            className="h-8 text-sm text-center w-full"
                            placeholder="0"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
