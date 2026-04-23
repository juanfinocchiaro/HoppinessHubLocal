import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, Truck, Clock, RotateCcw } from 'lucide-react';
import {
  useBranchDeliveryConfig,
  useDeliveryRadiusOverride,
  useUpdateBranchDeliveryConfig,
} from '@/hooks/useDeliveryConfig';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveDeliveryStats } from '@/services/deliveryService';

interface DeliveryRadiusControlProps {
  branchId: string;
}

export function DeliveryRadiusControl({ branchId }: DeliveryRadiusControlProps) {
  const { data: config, isLoading } = useBranchDeliveryConfig(branchId);
  const radiusOverride = useDeliveryRadiusOverride();
  const updateConfig = useUpdateBranchDeliveryConfig();

  const [sliderValue, setSliderValue] = useState<number | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['delivery-stats', branchId],
    queryFn: () => fetchActiveDeliveryStats(branchId),
    refetchInterval: 30_000,
    enabled: !!branchId,
  });

  if (isLoading || !config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isOverridden =
    config.radius_override_km != null &&
    (!config.radius_override_until || new Date(config.radius_override_until) > new Date());
  const effectiveRadius = isOverridden ? config.radius_override_km! : config.default_radius_km;
  const currentSlider = sliderValue ?? effectiveRadius;
  const maxRadius = config.default_radius_km;

  const handleApplyOverride = () => {
    if (sliderValue == null || sliderValue === effectiveRadius) return;
    radiusOverride.mutate({
      branchId,
      newRadiusKm: sliderValue,
      previousKm: effectiveRadius,
      action: 'reduce',
    });
    setSliderValue(null);
  };

  const handleRestore = () => {
    radiusOverride.mutate({
      branchId,
      newRadiusKm: null,
      previousKm: effectiveRadius,
      action: 'restore',
    });
    setSliderValue(null);
  };

  const handleToggle = (enabled: boolean) => {
    updateConfig.mutate({ branchId, values: { delivery_enabled: enabled } });
  };

  const overrideExpiry = config.radius_override_until
    ? new Date(config.radius_override_until)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" />
            Cobertura Delivery
          </CardTitle>
          <div className="flex items-center gap-2">
            {config.delivery_enabled ? (
              <Badge className="bg-green-600 text-xs">ON</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                OFF
              </Badge>
            )}
            <Switch checked={config.delivery_enabled} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardHeader>

      {config.delivery_enabled && (
        <CardContent className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span>
                  Activos: <span className="font-medium text-foreground">{stats.activeCount}</span>
                </span>
              </div>
              {stats.avgMinutes != null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Promedio:{' '}
                    <span className="font-medium text-foreground">{stats.avgMinutes} min</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Radius slider */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                Radio actual: {currentSlider} km
                {isOverridden && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    (de {config.default_radius_km} km)
                  </span>
                )}
              </span>
            </div>
            <Slider
              value={[currentSlider]}
              onValueChange={([v]) => setSliderValue(v)}
              min={1}
              max={maxRadius}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>{maxRadius} km</span>
            </div>
          </div>

          {/* Override info */}
          {isOverridden && overrideExpiry && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Se restaura:{' '}
              {overrideExpiry.toLocaleDateString('es-AR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {sliderValue != null && sliderValue !== effectiveRadius && (
              <Button size="sm" onClick={handleApplyOverride} disabled={radiusOverride.isPending}>
                {radiusOverride.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Aplicar {sliderValue} km
              </Button>
            )}
            {isOverridden && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={radiusOverride.isPending}
              >
                <RotateCcw className="mr-2 h-3 w-3" />
                Restaurar a {config.default_radius_km} km
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
