import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  toggleDeliveryZoneActive,
} from '@/services/deliveryService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MapPin, Plus, Trash2, GripVertical, Clock, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryZone {
  id: string;
  branch_id: string;
  name: string;
  costo_envio: number;
  pedido_minimo: number;
  tiempo_estimado_min: number;
  barrios: string[];
  description: string | null;
  orden: number;
  is_active: boolean;
}

function useDeliveryZones(branchId: string | undefined) {
  return useQuery({
    queryKey: ['delivery-zones', branchId],
    queryFn: async () => {
      const data = await fetchDeliveryZones(branchId!);
      return data as unknown as DeliveryZone[];
    },
    enabled: !!branchId,
  });
}

interface Props {
  branchId: string;
}

export function DeliveryZonesManager({ branchId }: Props) {
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useDeliveryZones(branchId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<DeliveryZone>>({});

  const createZone = useMutation({
    mutationFn: () => createDeliveryZone(branchId, zones.length),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-zones', branchId] });
      toast.success('Zona creada');
    },
    onError: (e: Error) => toast.error('Error', { description: e.message }),
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DeliveryZone> }) => {
      await updateDeliveryZone(id, patch as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-zones', branchId] });
      setEditingId(null);
      setDraft({});
    },
    onError: (e: Error) => toast.error('Error', { description: e.message }),
  });

  const deleteZoneMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-zones', branchId] });
      toast.success('Zona eliminada');
    },
    onError: (e: Error) => toast.error('Error', { description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggleDeliveryZoneActive(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones', branchId] }),
    onError: (e: Error) => toast.error('Error', { description: e.message }),
  });

  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setDraft({
      name: zone.name,
      costo_envio: zone.costo_envio,
      pedido_minimo: zone.pedido_minimo,
      tiempo_estimado_min: zone.tiempo_estimado_min,
      barrios: zone.barrios,
      description: zone.description,
    });
  };

  const saveEdit = () => {
    if (!editingId || !draft.name?.trim()) return;
    updateZone.mutate({ id: editingId, patch: draft });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Zonas de delivery
        </CardTitle>
        <CardDescription>
          Definí zonas con costos de envío y pedido mínimo diferenciados. Si no hay zonas, se usa el
          costo plano general.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : zones.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No hay zonas configuradas. Se usa el costo de envío general.
          </div>
        ) : (
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`border rounded-lg p-3 space-y-3 transition-colors ${
                  !zone.is_active ? 'opacity-60' : ''
                }`}
              >
                {editingId === zone.id ? (
                  /* â”€â”€ Editing mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Nombre de zona</Label>
                      <Input
                        value={draft.name ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Ej: Centro, Zona Norte"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Costo envío
                        </Label>
                        <Input
                          type="number"
                          value={draft.costo_envio ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              costo_envio: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Pedido mín.
                        </Label>
                        <Input
                          type="number"
                          value={draft.pedido_minimo ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              pedido_minimo: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Tiempo (min)
                        </Label>
                        <Input
                          type="number"
                          value={draft.tiempo_estimado_min ?? 40}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              tiempo_estimado_min: parseInt(e.target.value) || 40,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Barrios (separados por coma)</Label>
                      <Input
                        value={(draft.barrios ?? []).join(', ')}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            barrios: e.target.value
                              .split(',')
                              .map((b) => b.trim())
                              .filter(Boolean),
                          }))
                        }
                        placeholder="Centro, Nueva Córdoba, Alberdi"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Descripción (opcional)</Label>
                      <Input
                        value={draft.description ?? ''}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, description: e.target.value || null }))
                        }
                        placeholder="Info adicional para el cliente"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setDraft({});
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={updateZone.isPending}>
                        {updateZone.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* â”€â”€ Display mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{zone.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span>Envío: ${zone.costo_envio}</span>
                          {zone.pedido_minimo > 0 && <span>Mín: ${zone.pedido_minimo}</span>}
                          <span>{zone.tiempo_estimado_min} min</span>
                        </div>
                        {zone.barrios.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {zone.barrios.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: zone.id, is_active: v })}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => startEdit(zone)}
                      >
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta zona?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará la zona de delivery permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteZoneMut.mutate(zone.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => createZone.mutate()}
          disabled={createZone.isPending}
        >
          {createZone.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Plus className="w-3 h-3 mr-1" />
          )}
          Agregar zona
        </Button>
      </CardContent>
    </Card>
  );
}
