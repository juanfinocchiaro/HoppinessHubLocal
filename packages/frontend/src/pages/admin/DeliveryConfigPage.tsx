import { Component, type ReactNode } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Truck,
  MapPin,
  Save,
  ExternalLink,
  AlertTriangle,
  DollarSign,
  Settings2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDeliveryPricingConfig,
  useUpdateDeliveryPricingConfig,
  useAllBranchDeliveryConfigs,
} from '@/hooks/useDeliveryConfig';
import { RequireBrandPermission } from '@/components/guards';
import { SpinnerLoader, DotsLoader } from '@/components/ui/loaders';

/* ─── Error Boundary ────────────────────────────────────── */

class DeliveryPageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Delivery"
            subtitle="Configuración global de delivery"
            icon={<Truck className="w-6 h-6" />}
          />
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ocurrió un error al cargar esta página.
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Pricing Form ──────────────────────────────────────── */

function DeliveryPricingForm() {
  const { data: config, isLoading, isError } = useDeliveryPricingConfig();
  const updateConfig = useUpdateDeliveryPricingConfig();

  const [form, setForm] = useState<Record<string, string> | null>(null);

  const values = form ?? {
    base_distance_km: String(config?.base_distance_km ?? 2.5),
    base_price: String(config?.base_price ?? 2000),
    price_per_extra_km: String(config?.price_per_extra_km ?? 1000),
    max_allowed_radius_km: String(config?.max_allowed_radius_km ?? 10),
    estimated_speed_kmh: String(config?.estimated_speed_kmh ?? 25),
    prep_time_minutes: String(config?.prep_time_minutes ?? 15),
    time_disclaimer: config?.time_disclaimer ?? '',
  };

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...(prev ?? values), [key]: value }));
  };

  const exampleDistance = 4.2;
  const baseDist = parseFloat(values.base_distance_km) || 0;
  const basePrice = parseInt(values.base_price) || 0;
  const perKm = parseInt(values.price_per_extra_km) || 0;
  const exampleCost = basePrice + Math.max(0, exampleDistance - baseDist) * perKm;

  const handleSave = () => {
    updateConfig.mutate({
      base_distance_km: parseFloat(values.base_distance_km),
      base_price: parseInt(values.base_price),
      price_per_extra_km: parseInt(values.price_per_extra_km),
      max_allowed_radius_km: parseFloat(values.max_allowed_radius_km),
      estimated_speed_kmh: parseInt(values.estimated_speed_kmh),
      prep_time_minutes: parseInt(values.prep_time_minutes),
      time_disclaimer: values.time_disclaimer || null,
    });
    setForm(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <SpinnerLoader size="md" />
        </CardContent>
      </Card>
    );
  }
  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No se pudo cargar la configuración de pricing.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Fórmula de Pricing
        </CardTitle>
        <CardDescription>Cómo se calcula el costo de envío para todos los locales.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section: Costos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Costos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Distancia base (km)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={values.base_distance_km}
                onChange={(e) => setField('base_distance_km', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Costo base ($)</Label>
              <Input
                type="number"
                step="100"
                min="0"
                value={values.base_price}
                onChange={(e) => setField('base_price', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">$/km excedente</Label>
              <Input
                type="number"
                step="100"
                min="0"
                value={values.price_per_extra_km}
                onChange={(e) => setField('price_per_extra_km', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          {/* Inline example */}
          <p className="text-xs text-muted-foreground mt-2">
            Ej: cliente a {exampleDistance} km → ${basePrice.toLocaleString()} + ({exampleDistance}{' '}
            − {baseDist}) × ${perKm.toLocaleString()} ={' '}
            <span className="font-semibold text-foreground">
              ${Math.round(exampleCost).toLocaleString()}
            </span>
          </p>
        </div>

        <Separator />

        {/* Section: Operación */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Operación
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Radio máximo (km)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={values.max_allowed_radius_km}
                onChange={(e) => setField('max_allowed_radius_km', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Velocidad (km/h)</Label>
              <Input
                type="number"
                min="5"
                value={values.estimated_speed_kmh}
                onChange={(e) => setField('estimated_speed_kmh', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preparación (min)</Label>
              <Input
                type="number"
                min="0"
                value={values.prep_time_minutes}
                onChange={(e) => setField('prep_time_minutes', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Disclaimer al cliente</Label>
          <Textarea
            value={values.time_disclaimer}
            onChange={(e) => setField('time_disclaimer', e.target.value)}
            placeholder="Ej: El cadete puede tener hasta 2 pedidos más"
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateConfig.isPending} size="sm">
            {updateConfig.isPending && (
              <span className="mr-2 inline-flex">
                <DotsLoader />
              </span>
            )}
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Branch List ───────────────────────────────────────── */

function BranchDeliveryOverviewList() {
  const { data: configs, isLoading, isError } = useAllBranchDeliveryConfigs();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <SpinnerLoader size="md" />
        </CardContent>
      </Card>
    );
  }
  if (isError || !configs || configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {isError
            ? 'No se pudo cargar la lista de locales.'
            : 'No hay locales con delivery configurado.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Locales
        </CardTitle>
        <CardDescription>Cobertura y estado de delivery por local.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {configs.map((cfg: any) => {
          const branch = cfg.branches;
          const isOverridden =
            cfg.radius_override_km != null &&
            (!cfg.radius_override_until || new Date(cfg.radius_override_until) > new Date());
          const effectiveRadius = isOverridden ? cfg.radius_override_km : cfg.default_radius_km;

          return (
            <div
              key={cfg.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Status dot */}
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.delivery_enabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{branch?.name ?? 'Local'}</p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveRadius} km
                    {isOverridden && (
                      <span className="text-orange-500 ml-1">
                        <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                        reducido
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link to={`/mimarca/delivery/${branch?.id}`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Detalle
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────── */

function DeliveryConfigPageContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery"
        subtitle="Configuración global de delivery para toda la red"
        icon={<Truck className="w-6 h-6" />}
      />
      <DeliveryPricingForm />
      <BranchDeliveryOverviewList />
    </div>
  );
}

export default function DeliveryConfigPage() {
  return (
    <RequireBrandPermission permission="canManageDeliveryZones">
      <DeliveryPageErrorBoundary>
        <DeliveryConfigPageContent />
      </DeliveryPageErrorBoundary>
    </RequireBrandPermission>
  );
}
