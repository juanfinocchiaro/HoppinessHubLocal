import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  usePriceLists,
  useAllPriceListItems,
  CHANNELS,
  computeChannelPrice,
  resolveChannelMode,
  type PriceList,
} from '@/hooks/useChannelPricing';

interface Props {
  item: {
    id: string;
    costo: number;
    precio: number;
    fcObj: number;
  };
}

interface ChannelRow {
  channel: string;
  label: string;
  precioVenta: number;
  comisionPct: number;
  comisionMonto: number;
  netoComision: number;
  precioNeto: number;
  fc: number;
  margen: number;
}

const IVA = 1.21;

function fcColorClass(fc: number, obj: number): string {
  if (fc <= obj) return 'text-green-600';
  if (fc <= obj * 1.15) return 'text-yellow-600';
  return 'text-red-600';
}

export function ChannelPricesInline({ item }: Props) {
  const { data: priceLists, isLoading: loadingLists } = usePriceLists();
  const priceListIds = useMemo(
    () => (priceLists || []).filter((l) => l.is_active).map((l) => l.id),
    [priceLists],
  );
  const { data: allOverrides, isLoading: loadingItems } = useAllPriceListItems(priceListIds);

  const basePrice = item.precio || 0;
  const totalCost = item.costo || 0;
  const fcObj = item.fcObj || 35;

  const rows = useMemo<ChannelRow[]>(() => {
    if (!priceLists) return [];
    const activeLists = priceLists.filter((l) => l.is_active) as PriceList[];

    return CHANNELS.map((ch) => {
      const list = activeLists.find((l) => l.channel === ch.value);
      if (!list) {
        const pNeto = basePrice / IVA;
        const fc = pNeto > 0 ? (totalCost / pNeto) * 100 : 0;
        return {
          channel: ch.value,
          label: ch.label,
          precioVenta: basePrice,
          comisionPct: 0,
          comisionMonto: 0,
          netoComision: basePrice,
          precioNeto: pNeto,
          fc,
          margen: pNeto - totalCost,
        };
      }

      const { mode, value } = resolveChannelMode(ch.value, activeLists);
      const override = allOverrides?.[list.id]?.[item.id];
      const precioVenta = computeChannelPrice(basePrice, mode, value, override);

      // Commission: only applies when the channel itself has percentage mode
      const isAppChannel = list.pricing_mode === 'percentage';
      const comisionPct = isAppChannel ? list.pricing_value : 0;
      const comisionMonto = precioVenta * (comisionPct / 100);
      const netoComision = precioVenta - comisionMonto;
      const precioNeto = netoComision / IVA;
      const fc = precioNeto > 0 ? (totalCost / precioNeto) * 100 : 0;
      const margen = precioNeto - totalCost;

      return {
        channel: ch.value,
        label: ch.label,
        precioVenta,
        comisionPct,
        comisionMonto,
        netoComision,
        precioNeto,
        fc,
        margen,
      };
    });
  }, [priceLists, allOverrides, basePrice, totalCost, item.id]);

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
        No hay listas de precios configuradas. Configurá los canales desde la sección de Precios por Canal.
      </p>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Canal</th>
            <th className="py-2 pr-3 font-medium text-right">Precio Venta</th>
            <th className="py-2 pr-3 font-medium text-right">Comisión</th>
            <th className="py-2 pr-3 font-medium text-right">Neto s/Com</th>
            <th className="py-2 pr-3 font-medium text-right">Precio Neto</th>
            <th className="py-2 pr-3 font-medium text-right">FC%</th>
            <th className="py-2 font-medium text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2 pr-3 font-medium">{r.label}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.precioVenta)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {r.comisionPct > 0 ? (
                  <span>
                    {r.comisionPct}%{' '}
                    <span className="text-muted-foreground">({fmt(r.comisionMonto)})</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.netoComision)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.precioNeto)}</td>
              <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${fcColor(r.fc, fcObj)}`}>
                {r.fc.toFixed(1)}%
              </td>
              <td className={`py-2 text-right tabular-nums font-semibold ${r.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(r.margen)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
        <span>Costo: {fmt(totalCost)}</span>
        <span>·</span>
        <span>FC Objetivo: {fcObj}%</span>
        <span>·</span>
        <span>IVA: 21%</span>
      </div>
    </div>
  );
}
