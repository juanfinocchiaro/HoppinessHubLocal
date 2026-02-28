import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchPriceLists as fetchPriceListsService,
  fetchPriceListItems as fetchPriceListItemsService,
  fetchAllPriceListItems as fetchAllPriceListItemsService,
  fetchItemsCartaForPricing,
  updatePriceListConfig as updatePriceListConfigService,
  bulkUpsertPriceListItems,
  deletePriceOverride as deletePriceOverrideService,
  fetchActiveItemsPrices,
  fetchPriceListsByChannels,
  fetchExistingPriceListChannels,
  insertPriceLists,
} from '@/services/promoService';

export type Channel = 'mostrador' | 'webapp' | 'rappi' | 'pedidos_ya' | 'mp_delivery';
export type PricingMode = 'base' | 'percentage' | 'fixed_amount' | 'mirror' | 'manual';

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'webapp', label: 'WebApp' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MercadoPago Delivery' },
];

export const APP_CHANNELS: Channel[] = ['rappi', 'pedidos_ya', 'mp_delivery'];

export const PRICING_MODES: { value: PricingMode; label: string; description: string }[] = [
  { value: 'base', label: 'Precio base', description: 'Usa el precio de la carta' },
  { value: 'percentage', label: '% comisión', description: 'Precio base + porcentaje' },
  { value: 'fixed_amount', label: 'Monto fijo', description: 'Precio base + monto fijo' },
  { value: 'mirror', label: 'Mismo que…', description: 'Copia los precios de otro canal' },
  { value: 'manual', label: 'Manual', description: 'Precio individual por producto' },
];

export interface PriceList {
  id: string;
  name: string;
  channel: Channel;
  is_default: boolean;
  is_active: boolean;
  pricing_mode: PricingMode;
  pricing_value: number;
  mirror_channel: Channel | null;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  item_carta_id: string;
  precio: number;
}

export function computeChannelPrice(
  basePrice: number,
  mode: PricingMode,
  value: number,
  override?: number,
): number {
  if (override !== undefined) return override;
  switch (mode) {
    case 'base':
      return basePrice;
    case 'percentage':
      return Math.round(basePrice * (1 + value / 100));
    case 'fixed_amount':
      return Math.round(basePrice + value);
    case 'manual':
      return basePrice;
    default:
      return basePrice;
  }
}

export function resolveChannelMode(
  channel: Channel,
  priceLists: PriceList[],
): { mode: PricingMode; value: number; resolvedChannel: Channel } {
  const list = priceLists.find((l) => l.channel === channel);
  if (!list) return { mode: 'base', value: 0, resolvedChannel: channel };

  if (list.pricing_mode === 'mirror' && list.mirror_channel) {
    const mirrorList = priceLists.find((l) => l.channel === list.mirror_channel);
    if (mirrorList && mirrorList.pricing_mode !== 'mirror') {
      return {
        mode: mirrorList.pricing_mode,
        value: mirrorList.pricing_value,
        resolvedChannel: mirrorList.channel,
      };
    }
  }

  return { mode: list.pricing_mode, value: list.pricing_value, resolvedChannel: channel };
}

export function usePriceLists() {
  return useQuery({
    queryKey: ['price-lists'],
    queryFn: async () => {
      const data = await fetchPriceListsService();
      return data as unknown as PriceList[];
    },
  });
}

export function usePriceListItems(priceListId: string | undefined) {
  return useQuery({
    queryKey: ['price-list-items', priceListId],
    queryFn: async () => {
      const data = await fetchPriceListItemsService(priceListId!);
      return data as unknown as PriceListItem[];
    },
    enabled: !!priceListId,
  });
}

export function useAllPriceListItems(priceListIds: string[]) {
  return useQuery({
    queryKey: ['all-price-list-items', priceListIds],
    queryFn: async () => {
      if (priceListIds.length === 0) return {};
      const data = await fetchAllPriceListItemsService(priceListIds);

      const map: Record<string, Record<string, number>> = {};
      for (const row of data as unknown as PriceListItem[]) {
        if (!map[row.price_list_id]) map[row.price_list_id] = {};
        map[row.price_list_id][row.item_carta_id] = row.precio;
      }
      return map;
    },
    enabled: priceListIds.length > 0,
  });
}

export function useMenuItemsForPricing() {
  return useQuery({
    queryKey: ['menu-items-all'],
    queryFn: fetchItemsCartaForPricing,
  });
}

export function useUpdatePriceListConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      pricing_mode: PricingMode;
      pricing_value: number;
      mirror_channel?: Channel | null;
    }) =>
      updatePriceListConfigService({
        id: params.id,
        pricing_mode: params.pricing_mode,
        pricing_value: params.pricing_value,
        mirror_channel: params.mirror_channel ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success('Configuración de canal actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar configuración');
    },
  });
}

export function useBulkUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      price_list_id: string;
      items: Array<{ item_carta_id: string; precio: number }>;
    }) => bulkUpsertPriceListItems(params.price_list_id, params.items),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
      toast.success('Precios actualizados');
    },
  });
}

export function useDeletePriceOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { price_list_id: string; item_carta_id: string }) =>
      deletePriceOverrideService(params.price_list_id, params.item_carta_id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
    },
  });
}

export function useUnifyPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { source: 'default' | string; targetChannels: Channel[] }) => {
      let sourceItems: Array<{ id: string; precio_base: number }>;

      if (params.source === 'default') {
        const data = await fetchActiveItemsPrices();
        sourceItems = data as Array<{ id: string; precio_base: number }>;
      } else {
        const data = await fetchPriceListItemsService(params.source);
        sourceItems = (data as Array<Record<string, unknown>>).map((d) => ({
          id: d.item_carta_id as string,
          precio_base: d.precio as number,
        }));
      }

      const targetLists = await fetchPriceListsByChannels(params.targetChannels);

      for (const list of targetLists as unknown as PriceList[]) {
        const items = sourceItems.map((s) => ({
          item_carta_id: s.id,
          precio: s.precio_base,
        }));
        if (items.length) {
          await bulkUpsertPriceListItems(list.id, items);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-list-items'] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success('Precios unificados exitosamente');
    },
  });
}

export function useChannelPrice(channel: Channel | null | undefined, itemId: string) {
  const { data: lists } = usePriceLists();
  const priceList = lists?.find((l) => l.channel === channel && l.is_active);
  const { data: items } = usePriceListItems(priceList?.id);
  const item = items?.find((i) => i.item_carta_id === itemId);
  return item?.precio ?? null;
}

export function useInitializePriceLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const existingChannels = await fetchExistingPriceListChannels();

      const toCreate = CHANNELS.filter((c) => !existingChannels.has(c.value));
      if (toCreate.length === 0) return;

      const rows = toCreate.map((c) => ({
        name: `Lista ${c.label}`,
        channel: c.value,
        is_default: c.value === 'mostrador' || c.value === 'webapp',
        pricing_mode: c.value === 'mostrador' || c.value === 'webapp' ? 'base' : 'manual',
        pricing_value: 0,
      }));

      await insertPriceLists(rows);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}
