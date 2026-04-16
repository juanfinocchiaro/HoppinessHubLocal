import { useState, useMemo, useCallback } from 'react';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  usePriceLists,
  useAllPriceListItems,
  useBulkUpdatePriceList,
  useDeletePriceOverride,
  useUpdatePriceListConfig,
  CHANNELS,
  computeChannelPrice,
  resolveChannelMode,
  type PriceList,
  type Channel,
} from '@/hooks/useChannelPricing';

interface Props {
  item: {
    id: string;
    costo: number;
    precio: number;
    fcObj: number;
  };
}

const IVA = 1.21;

function fcColorClass(fc: number, obj: number): string {
  if (fc <= obj) return 'text-green-600';
  if (fc <= obj * 1.15) return 'text-yellow-600';
  return 'text-red-600';
}

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function ChannelPricesInline({ item }: Props) {
  const { data: priceLists, isLoading: loadingLists } = usePriceLists();
  const priceListIds = useMemo(
    () => (priceLists || []).filter((l) => l.is_active).map((l) => l.id),
    [priceLists],
  );
  const { data: allOverrides, isLoading: loadingItems } = useAllPriceListItems(priceListIds);
  const bulkUpdate = useBulkUpdatePriceList();
  const deleteOverride = useDeletePriceOverride();
  const updateConfig = useUpdatePriceListConfig();

  // Local edits: { [channel]: price } for price overrides
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const basePrice = item.precio || 0;
  const totalCost = item.costo || 0;
  const fcObj = item.fcObj || 35;

  const activeLists = useMemo(
    () => (priceLists || []).filter((l) => l.is_active) as PriceList[],
    [priceLists],
  );

  const isBaseChannel = (ch: string) => ch === 'mostrador' || ch === 'webapp';

  const getChannelData = useCallback(
    (ch: Channel) => {
      const list = activeLists.find((l) => l.channel === ch);

      // Edited price takes priority
      const editedPrice = priceEdits[ch] !== undefined ? parseFloat(priceEdits[ch]) || 0 : null;

      let precioVenta: number;
      if (isBaseChannel(ch)) {
        precioVenta = basePrice;
      } else if (editedPrice !== null) {
        precioVenta = editedPrice;
      } else if (list) {
        const { mode, value } = resolveChannelMode(ch, activeLists);
        const override = allOverrides?.[list.id]?.[item.id];
        precioVenta = computeChannelPrice(basePrice, mode, value, override);
      } else {
        precioVenta = basePrice;
      }

      const comisionPct =
        list?.pricing_mode === 'percentage'
          ? list.pricing_value
          : 0;

      const comisionMonto = precioVenta * (comisionPct / 100);
      const netoComision = precioVenta - comisionMonto;
      const precioNeto = netoComision / IVA;
      const fc = precioNeto > 0 ? (totalCost / precioNeto) * 100 : 0;
      const margen = precioNeto - totalCost;

      // Current override from DB
      const currentOverride = list ? allOverrides?.[list.id]?.[item.id] : undefined;

      return {
        channel: ch,
        label: CHANNELS.find((c) => c.value === ch)?.label || ch,
        listId: list?.id,
        precioVenta,
        comisionPct,
        comisionMonto,
        netoComision,
        precioNeto,
        fc,
        margen,
        isBase: isBaseChannel(ch),
        currentOverride,
        currentDbCommission: list?.pricing_mode === 'percentage' ? list.pricing_value : 0,
      };
    },
    [activeLists, allOverrides, basePrice, totalCost, item.id, priceEdits],
  );

  const rows = useMemo(
    () => CHANNELS.map((ch) => getChannelData(ch.value)),
    [getChannelData],
  );

  const hasChanges = Object.keys(priceEdits).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save price overrides
      for (const [channel, priceStr] of Object.entries(priceEdits)) {
        const list = activeLists.find((l) => l.channel === channel);
        if (!list) continue;
        const price = parseFloat(priceStr) || 0;
        if (price > 0) {
          await bulkUpdate.mutateAsync({
            price_list_id: list.id,
            items: [{ item_carta_id: item.id, precio: price }],
          });
        }
      }

      setPriceEdits({});
      toast.success('Precios guardados');
    } catch (e) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrice = async (channel: string) => {
    const list = activeLists.find((l) => l.channel === channel);
    if (!list) return;
    try {
      await deleteOverride.mutateAsync({
        price_list_id: list.id,
        item_carta_id: item.id,
      });
      setPriceEdits((prev) => {
        const next = { ...prev };
        delete next[channel];
        return next;
      });
      toast.success('Precio reseteado al valor base');
    } catch {
      toast.error('Error al resetear precio');
    }
  };

  if (loadingLists || loadingItems) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando canales...
      </div>
    );
  }

  if (!priceLists?.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay listas de precios configuradas. Configurá los canales desde Precios por Canal.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Canal</th>
              <th className="py-2 pr-2 font-medium text-right w-[120px]">Precio Venta</th>
              <th className="py-2 pr-2 font-medium text-right w-[100px]">Comisión</th>
              <th className="py-2 pr-2 font-medium text-right">Neto s/Com</th>
              <th className="py-2 pr-2 font-medium text-right">P. Neto</th>
              <th className="py-2 pr-2 font-medium text-right">FC%</th>
              <th className="py-2 font-medium text-right">Margen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.channel} className="border-b last:border-0 hover:bg-muted/40">
                <td className="py-2 pr-2 font-medium">{r.label}</td>

                {/* Precio Venta */}
                <td className="py-2 pr-2 text-right">
                  {r.isBase ? (
                    <span className="tabular-nums text-muted-foreground">{fmt(basePrice)}</span>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={
                          priceEdits[r.channel] !== undefined
                            ? priceEdits[r.channel]
                            : r.precioVenta
                        }
                        onChange={(e) =>
                          setPriceEdits((prev) => ({ ...prev, [r.channel]: e.target.value }))
                        }
                        className="h-7 w-[90px] text-right text-xs tabular-nums"
                      />
                      {r.currentOverride !== undefined && (
                        <button
                          onClick={() => handleResetPrice(r.channel)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Resetear al precio calculado"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Comisión */}
                <td className="py-2 pr-2 text-right">
                  {r.isBase ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-xs tabular-nums">
                      {r.currentDbCommission}%
                    </span>
                  )}
                </td>

                {/* Neto s/Com */}
                <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.netoComision)}</td>

                {/* Precio Neto */}
                <td className="py-2 pr-2 text-right tabular-nums">{fmt(r.precioNeto)}</td>

                {/* FC% */}
                <td
                  className={`py-2 pr-2 text-right tabular-nums font-semibold ${fcColorClass(r.fc, fcObj)}`}
                >
                  {r.fc.toFixed(1)}%
                </td>

                {/* Margen */}
                <td
                  className={`py-2 text-right tabular-nums font-semibold ${r.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {fmt(r.margen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Costo: {fmt(totalCost)}</span>
          <span>·</span>
          <span>FC Obj: {fcObj}%</span>
          <span>·</span>
          <span>IVA: 21%</span>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPriceEdits({});
                setCommissionEdits({});
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Guardar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
