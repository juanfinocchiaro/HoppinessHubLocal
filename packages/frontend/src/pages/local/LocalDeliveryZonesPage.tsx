import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapPin, CheckCircle2, Ban, Info, Truck, Search } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { useState, useMemo } from 'react';
import {
  useDeliveryPricingConfig,
  useBranchDeliveryConfig,
  useBranchNeighborhoods,
} from '@/hooks/useDeliveryConfig';

export default function LocalDeliveryZonesPage() {
  const ctx = useOutletContext<{ branch: { id: string; name: string } | null }>();
  const branch = ctx?.branch ?? null;
  const branchId = branch?.id;

  const { data: pricingConfig, isLoading: pricingLoading } = useDeliveryPricingConfig();
  const { data: config, isLoading: configLoading } = useBranchDeliveryConfig(branchId);
  const { data: neighborhoods = [], isLoading: neighLoading } = useBranchNeighborhoods(branchId);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const enabledNeighborhoods = useMemo(
    () => neighborhoods.filter((n: any) => n.status === 'enabled'),
    [neighborhoods],
  );
  const blockedNeighborhoods = useMemo(
    () =>
      neighborhoods.filter(
        (n: any) => typeof n.status === 'string' && n.status.startsWith('blocked'),
      ),
    [neighborhoods],
  );

  const filteredList = useMemo(() => {
    let list = neighborhoods;
    if (tab === 'enabled') list = enabledNeighborhoods;
    else if (tab === 'blocked') list = blockedNeighborhoods;

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((n: any) => (n.city_neighborhoods?.name ?? '').toLowerCase().includes(q));
  }, [tab, neighborhoods, enabledNeighborhoods, blockedNeighborhoods, search]);

  if (!branchId || pricingLoading || configLoading || neighLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  const effectiveRadius = config
    ? config.radius_override_km != null &&
      (!config.radius_override_until || new Date(config.radius_override_until) > new Date())
      ? config.radius_override_km
      : config.default_radius_km
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zonas de Delivery"
        subtitle="Configuración definida por la marca para tu local"
        icon={<MapPin className="w-6 h-6" />}
      />

      {/* Pricing formula */}
      {pricingConfig && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Fórmula vigente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Base</p>
                <p className="text-sm font-semibold">
                  {pricingConfig.base_distance_km} km → ${pricingConfig.base_price.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Excedente</p>
                <p className="text-sm font-semibold">
                  ${pricingConfig.price_per_extra_km.toLocaleString()}/km
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Radio</p>
                <p className="text-sm font-semibold">{effectiveRadius ?? '—'} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Neighborhoods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Barrios ({neighborhoods.length})</CardTitle>
          <CardDescription>
            {enabledNeighborhoods.length} habilitados · {blockedNeighborhoods.length} bloqueados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center gap-3 flex-wrap">
              <TabsList>
                <TabsTrigger value="all" className="text-xs">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="enabled" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Habilitados ({enabledNeighborhoods.length})
                </TabsTrigger>
                <TabsTrigger value="blocked" className="text-xs">
                  <Ban className="mr-1 h-3 w-3" />
                  Bloqueados ({blockedNeighborhoods.length})
                </TabsTrigger>
              </TabsList>
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar barrio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            {['all', 'enabled', 'blocked'].map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue} className="mt-3">
                <div className="max-h-[380px] overflow-y-auto rounded-lg border divide-y divide-border">
                  {filteredList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {search ? 'Sin resultados' : 'No hay barrios en esta categoría'}
                    </p>
                  ) : (
                    filteredList.map((n: any) => {
                      const isBlocked =
                        typeof n.status === 'string' && n.status.startsWith('blocked');
                      return (
                        <div key={n.id} className="flex items-center gap-3 px-3 py-2">
                          {isBlocked ? (
                            <Ban className="h-4 w-4 text-destructive shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                          <span className="text-sm truncate flex-1">
                            {n.city_neighborhoods?.name ?? '—'}
                          </span>
                          {n.distance_km != null && (
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {n.distance_km} km
                            </span>
                          )}
                          {isBlocked && n.block_reason && (
                            <Badge
                              variant="outline"
                              className="text-xs border-destructive/30 text-destructive shrink-0"
                            >
                              {n.block_reason}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>Para modificar zonas, precios o el radio de cobertura, contactá a la marca.</p>
      </div>
    </div>
  );
}
