import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Globe, ExternalLink, Truck, ShoppingBag, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DotsLoader } from '@/components/ui/loaders';

import type { ServiceScheduleV2 } from '@/components/local/webapp/webappConfigTypes';
import { defaultService, migrateSchedules } from '@/components/local/webapp/webappConfigHelpers';
import {
  useWebappConfigAdmin,
  useBranchSlug,
  useBranchWebappAvailability,
  useUpdateBranchWebappAvailability,
} from '@/hooks/useWebappConfig';
import { ServiceSection } from '@/components/local/webapp/ServiceSection';

export default function WebappConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useWebappConfigAdmin(branchId);
  const { data: branchData } = useBranchSlug(branchId);
  const { data: availabilityRows, isLoading: loadingAvailability } =
    useBranchWebappAvailability(branchId);
  const updateAvailability = useUpdateBranchWebappAvailability(branchId);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    webapp_activa: false,
    estado: 'cerrado',
    mensaje_pausa: '',
    recepcion_modo: 'auto',
    auto_accept_orders: false,
    auto_print_orders: false,
  });

  const [services, setServices] = useState<Record<string, ServiceScheduleV2>>({
    retiro: defaultService('retiro', 15),
    delivery: { ...defaultService('delivery', 40), radio_km: 5, costo: 0, pedido_minimo: 0 },
    comer_aca: defaultService('comer_aca', 15),
  });
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        webapp_activa: config.webapp_activa ?? false,
        estado: config.status ?? 'cerrado',
        mensaje_pausa: config.pause_message ?? '',
        recepcion_modo: config.recepcion_modo ?? 'auto',
        auto_accept_orders: config.auto_accept_orders ?? false,
        auto_print_orders: config.auto_print_orders ?? false,
      });
      setServices(
        migrateSchedules(
          config.service_schedules,
          {
            retiro_habilitado: config.retiro_habilitado ?? true,
            delivery_habilitado: config.delivery_habilitado ?? false,
            comer_aca_habilitado: config.comer_aca_habilitado ?? false,
          },
          config,
        ),
      );
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: branchId!,
        webapp_activa: form.webapp_activa,
        status: form.estado,
        pause_message: form.mensaje_pausa || null,
        recepcion_modo: form.recepcion_modo,
        auto_accept_orders: form.auto_accept_orders,
        auto_print_orders: form.auto_print_orders,
        retiro_habilitado: services.retiro?.enabled ?? false,
        delivery_habilitado: services.delivery?.enabled ?? false,
        comer_aca_habilitado: services.comer_aca?.enabled ?? false,
        delivery_radio_km: services.delivery?.radio_km ?? null,
        delivery_costo: services.delivery?.costo ?? null,
        delivery_pedido_minimo: services.delivery?.pedido_minimo ?? null,
        prep_time_retiro: services.retiro?.prep_time ?? 15,
        prep_time_delivery: services.delivery?.prep_time ?? 40,
        prep_time_comer_aca: services.comer_aca?.prep_time ?? 15,
        estimated_pickup_time_min: services.retiro?.prep_time ?? null,
        estimated_delivery_time_min: services.delivery?.prep_time ?? null,
        service_schedules: services,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        await apiPut(`/branches/${branchId}/config/webapp`, payload);
      } else {
        await apiPost(`/branches/${branchId}/config/webapp`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webapp-config-admin', branchId] });
      toast.success('Configuración guardada');
    },
    onError: (err: Error) => {
      toast.error('Error al guardar', { description: err.message });
    },
  });

  const publicUrl = branchData?.slug ? `${window.location.origin}/pedir/${branchData.slug}` : null;

  const updateService = (key: string, s: ServiceScheduleV2) => {
    setServices((prev) => ({ ...prev, [key]: s }));
  };

  const filteredAvailabilityRows = useMemo(() => {
    const rows = availabilityRows || [];
    const q = itemSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.categoriaNombre.toLowerCase().includes(q),
    );
  }, [availabilityRows, itemSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda Online"
        subtitle="Configurá tu tienda online para recibir pedidos desde la web."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Status & Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Estado de la tienda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tienda activa</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilita o deshabilita la tienda online
                  </p>
                </div>
                <Switch
                  checked={form.webapp_activa}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, webapp_activa: v }))}
                />
              </div>

              {form.webapp_activa && (
                <>
                  <div className="space-y-2">
                    <Label>Estado operativo</Label>
                    <Select
                      value={form.estado}
                      onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abierto">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Abierto
                          </div>
                        </SelectItem>
                        <SelectItem value="pausado">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            Pausado
                          </div>
                        </SelectItem>
                        <SelectItem value="cerrado">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Cerrado
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.estado === 'pausado' && (
                    <div className="space-y-2">
                      <Label>Mensaje de pausa (opcional)</Label>
                      <Input
                        placeholder="Ej: Volvemos en 15 minutos"
                        value={form.mensaje_pausa}
                        onChange={(e) => setForm((f) => ({ ...f, mensaje_pausa: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}

              {publicUrl && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate flex-1">{publicUrl}</span>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
              <CardDescription>
                Activá cada servicio y configurá sus horarios y tiempos de preparación de forma
                independiente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ServiceSection
                serviceKey="retiro"
                label="Retiro en local"
                icon={ShoppingBag}
                schedule={services.retiro}
                onChange={(s) => updateService('retiro', s)}
              />
              <ServiceSection
                serviceKey="delivery"
                label="Delivery"
                icon={Truck}
                schedule={services.delivery}
                onChange={(s) => updateService('delivery', s)}
                isDelivery
              />
              {/* Comer acá no se ofrece en la webapp; se mantiene en backend por compatibilidad */}
            </CardContent>
          </Card>

          {/* Product visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad de productos (Online)</CardTitle>
              <CardDescription>
                Elegí qué productos se ven en la tienda online de este local. No afecta el POS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-9"
                  placeholder="Buscar producto o categoría..."
                />
              </div>

              {loadingAvailability ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="border rounded-lg max-h-[380px] overflow-y-auto divide-y">
                  {filteredAvailabilityRows.map((row) => {
                    const webVisible =
                      row.marcaDisponibleWebapp && row.localDisponibleWebapp && !row.outOfStock;
                    const isPendingThisRow =
                      updateAvailability.isPending &&
                      updateAvailability.variables?.itemId === row.itemId;

                    return (
                      <div
                        key={row.itemId}
                        className="px-3 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{row.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {row.categoriaNombre}
                            {!row.marcaDisponibleWebapp && ' · Oculto por marca'}
                            {row.outOfStock && ' · Sin stock'}
                            {webVisible && ' · Visible online'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Online</Label>
                            <Switch
                              checked={row.marcaDisponibleWebapp && row.localDisponibleWebapp}
                              disabled={!row.marcaDisponibleWebapp || isPendingThisRow}
                              onCheckedChange={(checked) => {
                                updateAvailability.mutate({
                                  itemId: row.itemId,
                                  localDisponibleWebapp: checked,
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Sin stock</Label>
                            <Switch
                              checked={row.outOfStock}
                              disabled={isPendingThisRow}
                              onCheckedChange={(checked) => {
                                updateAvailability.mutate({
                                  itemId: row.itemId,
                                  outOfStock: checked,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAvailabilityRows.length === 0 && (
                    <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                      No hay productos para mostrar con ese filtro.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reception mode */}
          <Card>
            <CardHeader>
              <CardTitle>Recepción de pedidos</CardTitle>
              <CardDescription>
                Cómo se reciben y procesan los pedidos entrantes de la webapp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={form.recepcion_modo}
                onValueChange={(v) => setForm((f) => ({ ...f, recepcion_modo: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático (entran directo a cocina)</SelectItem>
                  <SelectItem value="manual">Manual (requieren confirmación en OPERAR)</SelectItem>
                </SelectContent>
              </Select>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-aceptar pedidos</Label>
                  <p className="text-xs text-muted-foreground">
                    Los pedidos se aceptan automáticamente sin intervención
                  </p>
                </div>
                <Switch
                  checked={form.auto_accept_orders}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, auto_accept_orders: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Impresión automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activo, los pedidos auto-aceptados se imprimen automáticamente
                  </p>
                </div>
                <Switch
                  checked={form.auto_print_orders}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, auto_print_orders: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
              {save.isPending && (
                <span className="mr-2 inline-flex">
                  <DotsLoader />
                </span>
              )}
              Guardar configuración
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
