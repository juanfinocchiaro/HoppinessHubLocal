import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePriceLists,
  useUpdatePriceListConfig,
  CHANNELS,
  type PriceList,
} from '@/hooks/useChannelPricing';
import { insertPriceLists, deletePriceList } from '@/services/promoService';
import { useQueryClient } from '@tanstack/react-query';

export default function CanalesVentaPage() {
  const { data: priceLists, isLoading } = usePriceLists();
  const updateConfig = useUpdatePriceListConfig();
  const qc = useQueryClient();

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKey, setNewChannelKey] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);

  // Local edits for commissions
  const [edits, setEdits] = useState<Record<string, { commission?: string; active?: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const channels = useMemo(() => {
    return (priceLists || []) as PriceList[];
  }, [priceLists]);

  const channelLabel = (ch: string) =>
    CHANNELS.find((c) => c.value === ch)?.label || ch;

  const isAppChannel = (ch: string) =>
    ch !== 'mostrador' && ch !== 'webapp';

  const handleAddChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error('Ingresá un nombre para el canal');
      return;
    }
    const key = newChannelKey.trim() || newChannelName.trim().toLowerCase().replace(/\s+/g, '_');

    // Check if already exists
    if (channels.some((c) => c.channel === key)) {
      toast.error('Ya existe un canal con esa clave');
      return;
    }

    setAddingChannel(true);
    try {
      await insertPriceLists([
        {
          name: `Lista ${newChannelName.trim()}`,
          channel: key,
          is_default: false,
          pricing_mode: 'percentage',
          pricing_value: 0,
          is_active: true,
        },
      ]);
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      setNewChannelName('');
      setNewChannelKey('');
      setShowAddForm(false);
      toast.success(`Canal "${newChannelName.trim()}" creado`);
    } catch {
      toast.error('Error al crear canal');
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePriceList(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success(`Canal "${channelLabel(deleteTarget.channel)}" eliminado`);
      setDeleteTarget(null);
    } catch {
      toast.error('Error al eliminar canal');
    }
  };

  const handleSaveChannel = async (list: PriceList) => {
    const edit = edits[list.id];
    if (!edit) return;

    setSaving(list.id);
    try {
      const commission =
        edit.commission !== undefined ? parseFloat(edit.commission) || 0 : list.pricing_value;

      await updateConfig.mutateAsync({
        id: list.id,
        pricing_mode: isAppChannel(list.channel) ? 'percentage' : 'base',
        pricing_value: commission,
        mirror_channel: null,
      });

      setEdits((prev) => {
        const next = { ...prev };
        delete next[list.id];
        return next;
      });
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando canales...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canales de Venta"
        subtitle="Definí los canales donde vendés y sus comisiones"
        breadcrumb={[{ label: 'Mi Marca', href: '/mimarca' }, { label: 'Canales de Venta' }]}
        actions={
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Canal
          </Button>
        }
      />

      {/* Add channel form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h3 className="text-sm font-semibold">Agregar Canal de Venta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre visible</label>
              <Input
                placeholder="Ej: Rappi"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Clave interna (opcional)
              </label>
              <Input
                placeholder="Ej: rappi"
                value={newChannelKey}
                onChange={(e) => setNewChannelKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se genera automáticamente si no lo completás
              </p>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAddChannel} disabled={addingChannel}>
                {addingChannel ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Crear
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewChannelName('');
                  setNewChannelKey('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Channels list */}
      <div className="space-y-3">
        {channels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay canales configurados</p>
            <p className="text-xs mt-1">Creá tu primer canal de venta</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="py-3 px-4 text-left font-medium">Canal</th>
                  <th className="py-3 px-4 text-left font-medium">Clave</th>
                  <th className="py-3 px-4 text-left font-medium">Tipo</th>
                  <th className="py-3 px-4 text-right font-medium w-[140px]">Comisión %</th>
                  <th className="py-3 px-4 text-center font-medium w-[80px]">Activo</th>
                  <th className="py-3 px-4 text-right font-medium w-[120px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((list) => {
                  const edit = edits[list.id];
                  const hasEdit = !!edit;
                  const isBase = !isAppChannel(list.channel);
                  const currentCommission =
                    edit?.commission !== undefined
                      ? edit.commission
                      : String(list.pricing_value || 0);

                  return (
                    <tr
                      key={list.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">
                        {channelLabel(list.channel)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {list.channel}
                      </td>
                      <td className="py-3 px-4">
                        {isBase ? (
                          <Badge variant="outline" className="text-xs">
                            Directo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            App / Plataforma
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isBase ? (
                          <span className="text-muted-foreground text-xs">Sin comisión</span>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={currentCommission}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [list.id]: {
                                    ...prev[list.id],
                                    commission: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 w-[80px] text-right text-sm tabular-nums"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={list.is_active}
                          disabled
                          className="mx-auto"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {hasEdit && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() => handleSaveChannel(list)}
                              disabled={saving === list.id}
                            >
                              {saving === list.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                          {isBase ? null : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(list)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Directo:</strong> Mostrador y WebApp usan el precio de carta sin comisión.
        </p>
        <p>
          <strong>App / Plataforma:</strong> Canales con comisión (Rappi, PedidosYa, etc.). El
          precio se calcula como Precio Base + Comisión%.
        </p>
        <p>
          Los precios por producto se configuran en{' '}
          <a href="/mimarca/precios-canal" className="text-primary underline">
            Precios por Canal
          </a>
          .
        </p>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Eliminar canal"
        description={`¿Eliminar el canal "${deleteTarget ? channelLabel(deleteTarget.channel) : ''}"? Se eliminarán también todos los precios asociados.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
