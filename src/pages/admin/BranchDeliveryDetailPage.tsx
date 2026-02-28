import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Loader2,
  MapPin,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Ban,
  Search,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useBranchDeliveryConfig,
  useUpdateBranchDeliveryConfig,
  useBranchNeighborhoods,
  useUpdateNeighborhoodStatus,
  useRegenerateBranchNeighborhoods,
  useDeliveryPricingConfig,
} from '@/hooks/useDeliveryConfig';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchForDelivery } from '@/services/adminService';
import { RequireBrandPermission } from '@/components/guards';
import { SpinnerLoader } from '@/components/ui/loaders';

/* â”€â”€â”€ Block Popover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function BlockPopover({
  neighborhoodId,
  onBlock,
  isPending,
}: {
  neighborhoodId: string;
  onBlock: (id: string, reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('Zona de riesgo');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Bloquear
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="end">
        <p className="text-sm font-medium">Motivo del bloqueo</p>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Zona de riesgo">Zona de riesgo</SelectItem>
            <SelectItem value="Sin acceso vial">Sin acceso vial</SelectItem>
            <SelectItem value="Fuera de cobertura real">Fuera de cobertura real</SelectItem>
            <SelectItem value="Otro motivo">Otro motivo</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            disabled={isPending}
            onClick={() => {
              onBlock(neighborhoodId, reason);
              setOpen(false);
            }}
          >
            {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* â”€â”€â”€ Neighborhood Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function NeighborhoodRow({
  n,
  onBlock,
  onUnblock,
  isPending,
}: {
  n: any;
  onBlock: (id: string, reason: string) => void;
  onUnblock: (id: string) => void;
  isPending: boolean;
}) {
  const hood = n.city_neighborhoods;
  const isBlocked = n.status === 'blocked_security';

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 group">
      {isBlocked ? (
        <Ban className="h-4 w-4 text-destructive shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      )}
      <span className="text-sm font-medium truncate flex-1">{hood?.name ?? 'â€”'}</span>
      {n.distance_km != null && (
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {n.distance_km} km
        </span>
      )}
      {isBlocked && n.block_reason && (
        <Badge
          variant="outline"
          className="text-xs border-destructive/30 text-destructive shrink-0 hidden sm:inline-flex"
        >
          {n.block_reason}
        </Badge>
      )}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isBlocked ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
            onClick={() => onUnblock(n.id)}
            disabled={isPending}
          >
            Habilitar
          </Button>
        ) : (
          <BlockPopover neighborhoodId={n.id} onBlock={onBlock} isPending={isPending} />
        )}
      </div>
    </div>
  );
}

/* â”€â”€â”€ Delivery Hours Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

type TimeWindow = { opens: string; closes: string };
type DeliveryHours = Record<string, TimeWindow[]>;

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function DeliveryHoursEditor({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: DeliveryHours | null;
  onChange: (hours: DeliveryHours | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const hours = value ?? {};
  const hasCustomHours = Object.keys(hours).length > 0;

  const toggleDay = useCallback(
    (day: string) => {
      const next = { ...hours };
      if (next[day]) {
        delete next[day];
      } else {
        next[day] = [{ opens: '19:00', closes: '23:30' }];
      }
      onChange(Object.keys(next).length > 0 ? next : null);
    },
    [hours, onChange],
  );

  const addWindow = useCallback(
    (day: string) => {
      const next = { ...hours };
      next[day] = [...(next[day] || []), { opens: '12:00', closes: '15:00' }];
      onChange(next);
    },
    [hours, onChange],
  );

  const removeWindow = useCallback(
    (day: string, idx: number) => {
      const next = { ...hours };
      next[day] = next[day].filter((_, i) => i !== idx);
      if (next[day].length === 0) delete next[day];
      onChange(Object.keys(next).length > 0 ? next : null);
    },
    [hours, onChange],
  );

  const updateWindow = useCallback(
    (day: string, idx: number, field: 'opens' | 'closes', val: string) => {
      const next = { ...hours };
      next[day] = next[day].map((w, i) => (i === idx ? { ...w, [field]: val } : w));
      onChange(next);
    },
    [hours, onChange],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" /> Horarios de Delivery
        </CardTitle>
        <CardDescription>
          {hasCustomHours
            ? 'Franjas horarias configuradas. Delivery solo disponible en estos horarios.'
            : 'Sin configurar â€” delivery usa el horario general del local.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DIAS.map((_dia, i) => {
          const dayKey = String(i);
          const dayWindows = hours[dayKey];
          const isActive = !!dayWindows;

          return (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <div className="w-20 shrink-0 pt-1">
                <button
                  onClick={() => toggleDay(dayKey)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors w-full ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {DIAS_SHORT[i]}
                </button>
              </div>
              <div className="flex-1 space-y-1.5">
                {isActive ? (
                  <>
                    {dayWindows.map((w, wi) => (
                      <div key={wi} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={w.opens}
                          onChange={(e) => updateWindow(dayKey, wi, 'opens', e.target.value)}
                          className="h-8 w-28 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">a</span>
                        <Input
                          type="time"
                          value={w.closes}
                          onChange={(e) => updateWindow(dayKey, wi, 'closes', e.target.value)}
                          className="h-8 w-28 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeWindow(dayKey, wi)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => addWindow(dayKey)}
                    >
                      <Plus className="w-3 h-3" /> Agregar franja
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">Sin delivery</p>
                )}
              </div>
            </div>
          );
        })}

        <Separator />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasCustomHours
              ? 'Se usarán estos horarios para delivery.'
              : 'Dejá vacío para usar el horario del local.'}
          </p>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Guardar horarios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* â”€â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function BranchDeliveryDetailContent() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['branch-detail-delivery', branchId],
    queryFn: () => fetchBranchForDelivery(branchId!),
    enabled: !!branchId,
  });

  const { data: config, isLoading: configLoading } = useBranchDeliveryConfig(branchId);
  const { data: pricingConfig } = useDeliveryPricingConfig();
  const { data: neighborhoods = [], isLoading: neighLoading } = useBranchNeighborhoods(branchId);
  const updateConfig = useUpdateBranchDeliveryConfig();
  const updateNeighborhood = useUpdateNeighborhoodStatus();
  const regenerate = useRegenerateBranchNeighborhoods();

  const [radius, setRadius] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('enabled');
  const [deliveryHours, setDeliveryHours] = useState<DeliveryHours | null | undefined>(undefined);

  const currentDeliveryHours =
    deliveryHours !== undefined
      ? deliveryHours
      : (((config as any)?.delivery_hours as DeliveryHours | null) ?? null);

  const handleSaveHours = () => {
    if (!branch) return;
    updateConfig.mutate(
      { branchId: branch.id, values: { delivery_hours: currentDeliveryHours } as any },
      { onSuccess: () => toast.success('Horarios de delivery actualizados') },
    );
  };

  const isLoading = branchLoading || configLoading || neighLoading;

  const enabledNeighborhoods = useMemo(
    () => neighborhoods.filter((n: any) => n.status === 'enabled'),
    [neighborhoods],
  );
  const blockedNeighborhoods = useMemo(
    () => neighborhoods.filter((n: any) => n.status === 'blocked_security'),
    [neighborhoods],
  );

  const filteredList = useMemo(() => {
    const list = tab === 'enabled' ? enabledNeighborhoods : blockedNeighborhoods;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((n: any) => (n.city_neighborhoods?.name ?? '').toLowerCase().includes(q));
  }, [tab, enabledNeighborhoods, blockedNeighborhoods, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (!branch || !config) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Local no encontrado o sin configuración de delivery.
      </div>
    );
  }

  const maxRadius = pricingConfig?.max_allowed_radius_km ?? 10;
  const currentRadius = radius ?? config.default_radius_km;

  const handleSaveRadius = () => {
    if (radius == null) return;
    updateConfig.mutate(
      { branchId: branch.id, values: { default_radius_km: radius } },
      {
        onSuccess: () => {
          toast.success('Radio actualizado');
          if (branch.latitude && branch.longitude) {
            regenerate.mutate({
              branchId: branch.id,
              branchLat: Number(branch.latitude),
              branchLng: Number(branch.longitude),
              radiusKm: radius,
            });
          }
        },
      },
    );
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig.mutate({ branchId: branch.id, values: { delivery_enabled: enabled } });
  };

  const handleBlock = (id: string, reason: string) => {
    updateNeighborhood.mutate({ id, status: 'blocked_security', blockReason: reason });
  };

  const handleUnblock = (id: string) => {
    updateNeighborhood.mutate({ id, status: 'enabled' });
  };

  const handleRegenerate = () => {
    if (!branch.latitude || !branch.longitude) {
      toast.error('El local no tiene coordenadas configuradas');
      return;
    }
    regenerate.mutate({
      branchId: branch.id,
      branchLat: Number(branch.latitude),
      branchLng: Number(branch.longitude),
      radiusKm: currentRadius,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/mimarca/delivery">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`${branch.name} â€” Delivery`}
          subtitle={`Radio: ${currentRadius} km · ${enabledNeighborhoods.length} habilitados · ${blockedNeighborhoods.length} bloqueados`}
          icon={<MapPin className="w-6 h-6" />}
        />
      </div>

      {/* Config card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Delivery habilitado</Label>
              <p className="text-sm text-muted-foreground">
                Activar o desactivar delivery para este local
              </p>
            </div>
            <Switch checked={config.delivery_enabled} onCheckedChange={handleToggleEnabled} />
          </div>
          <Separator />
          <div className="space-y-4">
            <Label>
              Radio: {currentRadius} km (máx {maxRadius} km)
            </Label>
            <Slider
              value={[currentRadius]}
              onValueChange={([v]) => setRadius(v)}
              min={1}
              max={maxRadius}
              step={0.5}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>{maxRadius} km</span>
            </div>
            {radius != null && radius !== config.default_radius_km && (
              <Button onClick={handleSaveRadius} disabled={updateConfig.isPending} size="sm">
                {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar radio ({radius} km)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery hours */}
      <DeliveryHoursEditor
        value={currentDeliveryHours}
        onChange={(h) => setDeliveryHours(h)}
        onSave={handleSaveHours}
        saving={updateConfig.isPending}
      />

      {/* Neighborhoods card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Barrios</CardTitle>
              <CardDescription>{neighborhoods.length} barrios en total</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {neighborhoods.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay barrios asignados. Hacé click en "Regenerar" para detectar barrios dentro del
              radio.
            </p>
          ) : (
            <>
              {/* Tabs + Search */}
              <Tabs value={tab} onValueChange={setTab}>
                <div className="flex items-center gap-3 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="enabled" className="text-xs">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Habilitados ({enabledNeighborhoods.length})
                    </TabsTrigger>
                    <TabsTrigger value="blocked" className="text-xs">
                      <Ban className="mr-1.5 h-3.5 w-3.5" />
                      Bloqueados ({blockedNeighborhoods.length})
                    </TabsTrigger>
                  </TabsList>
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar barrio..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>

                <TabsContent value="enabled" className="mt-3">
                  <div className="max-h-[420px] overflow-y-auto rounded-lg border divide-y divide-border">
                    {filteredList.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {search ? 'Sin resultados' : 'No hay barrios habilitados'}
                      </p>
                    ) : (
                      filteredList.map((n: any) => (
                        <NeighborhoodRow
                          key={n.id}
                          n={n}
                          onBlock={handleBlock}
                          onUnblock={handleUnblock}
                          isPending={updateNeighborhood.isPending}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="blocked" className="mt-3">
                  <div className="max-h-[420px] overflow-y-auto rounded-lg border divide-y divide-border">
                    {filteredList.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {search ? 'Sin resultados' : 'No hay barrios bloqueados'}
                      </p>
                    ) : (
                      filteredList.map((n: any) => (
                        <NeighborhoodRow
                          key={n.id}
                          n={n}
                          onBlock={handleBlock}
                          onUnblock={handleUnblock}
                          isPending={updateNeighborhood.isPending}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BranchDeliveryDetailPage() {
  return (
    <RequireBrandPermission permission="canManageDeliveryZones">
      <BranchDeliveryDetailContent />
    </RequireBrandPermission>
  );
}
