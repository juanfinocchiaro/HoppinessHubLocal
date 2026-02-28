import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Clock,
  MapPin,
  DollarSign,
  ChevronDown,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DaySchedule, WebappPaymentMethods, ServiceScheduleV2 } from './webappConfigTypes';
import { DAYS, DAY_LABELS } from './webappConfigTypes';
import { defaultPaymentMethods } from './webappConfigHelpers';

export function ServiceSection({
  serviceKey,
  label,
  icon: Icon,
  schedule,
  onChange,
  isDelivery,
}: {
  serviceKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  schedule: ServiceScheduleV2;
  onChange: (s: ServiceScheduleV2) => void;
  isDelivery?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pm: WebappPaymentMethods = schedule.payment_methods
    ? { ...defaultPaymentMethods(serviceKey), ...schedule.payment_methods }
    : defaultPaymentMethods(serviceKey);

  const setPaymentMethod = (key: keyof WebappPaymentMethods, enabled: boolean) => {
    const next = { ...pm, [key]: enabled };
    if (!next.efectivo && !next.mercadopago) {
      toast.error('Seleccioná al menos un medio de pago');
      return;
    }
    onChange({ ...schedule, payment_methods: next });
  };

  const updateDay = (day: string, patch: Partial<DaySchedule>) => {
    onChange({
      ...schedule,
      days: { ...schedule.days, [day]: { ...schedule.days[day], ...patch } },
    });
  };

  const toggleAllDays = (enabled: boolean) => {
    const newDays = { ...schedule.days };
    for (const d of DAYS) {
      newDays[d] = { ...newDays[d], enabled };
    }
    onChange({ ...schedule, days: newDays });
  };

  const copyToAll = (sourceDay: string) => {
    const src = schedule.days[sourceDay];
    if (!src) return;
    const newDays = { ...schedule.days };
    for (const d of DAYS) {
      newDays[d] = { ...src };
    }
    onChange({ ...schedule, days: newDays });
  };

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <div>
            <span className="font-medium">{label}</span>
            {schedule.enabled && (
              <p className="text-xs text-muted-foreground">Prep: {schedule.prep_time} min</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(v) =>
              onChange({
                ...schedule,
                enabled: v,
                payment_methods: schedule.payment_methods ?? defaultPaymentMethods(serviceKey),
              })
            }
          />
          {schedule.enabled && (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {schedule.enabled && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {/* Prep time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Tiempo de preparación (min)
                </Label>
                <Input
                  type="number"
                  value={schedule.prep_time}
                  onChange={(e) =>
                    onChange({ ...schedule, prep_time: parseInt(e.target.value) || 0 })
                  }
                  className="w-32"
                />
              </div>

              {/* Delivery-specific fields */}
              {isDelivery && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3" /> Radio (km)
                    </Label>
                    <Input
                      type="number"
                      value={schedule.radio_km ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, radio_km: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3" /> Costo envío
                    </Label>
                    <Input
                      type="number"
                      value={schedule.costo ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, costo: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3" /> Pedido mínimo
                    </Label>
                    <Input
                      type="number"
                      value={schedule.pedido_minimo ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, pedido_minimo: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Payment methods */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Medios de pago (WebApp)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-700" />
                      <div>
                        <p className="text-sm font-medium">Efectivo</p>
                        <p className="text-xs text-muted-foreground">Pagás al recibir / retirar</p>
                      </div>
                    </div>
                    <Switch
                      checked={pm.efectivo}
                      onCheckedChange={(v) => setPaymentMethod('efectivo', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-700" />
                      <div>
                        <p className="text-sm font-medium">MercadoPago</p>
                        <p className="text-xs text-muted-foreground">Tarjeta, débito o billetera</p>
                      </div>
                    </div>
                    <Switch
                      checked={pm.mercadopago}
                      onCheckedChange={(v) => setPaymentMethod('mercadopago', v)}
                    />
                  </div>
                </div>
                {isDelivery && pm.efectivo && (
                  <p className="text-xs text-amber-700">
                    Si habilitás efectivo en delivery, el pedido puede ingresar sin pago previo.
                  </p>
                )}
              </div>

              <Separator />

              {/* Schedule per day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Horarios por día</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => toggleAllDays(true)}
                    >
                      Activar todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => toggleAllDays(false)}
                    >
                      Desactivar todos
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {DAYS.map((day) => {
                    const ds = schedule.days[day] || { enabled: true, from: '11:00', to: '23:00' };
                    return (
                      <div key={day} className="flex items-center gap-2 py-1">
                        <Switch
                          checked={ds.enabled}
                          onCheckedChange={(v) => updateDay(day, { enabled: v })}
                          className="scale-75"
                        />
                        <span
                          className={`text-sm w-20 ${ds.enabled ? 'font-medium' : 'text-muted-foreground'}`}
                        >
                          {DAY_LABELS[day]}
                        </span>
                        {ds.enabled ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              type="time"
                              value={ds.from}
                              onChange={(e) => updateDay(day, { from: e.target.value })}
                              className="w-28 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={ds.to}
                              onChange={(e) => updateDay(day, { to: e.target.value })}
                              className="w-28 h-8 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 text-muted-foreground"
                              onClick={() => copyToAll(day)}
                              title="Copiar este horario a todos los días"
                            >
                              Copiar a todos
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Cerrado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
