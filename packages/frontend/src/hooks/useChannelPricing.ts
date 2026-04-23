import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchPriceLists as fetchPriceListsService,
  fetchPriceListItems as fetchPriceListItemsService,
  fetchAllPriceListItems as fetchAllPriceListItemsService,
  fetchItemsCartaForPricing,
  updatePriceListConfig as updatePriceListConfigService,
  bulkUpsertPriceListItems,
  updatePriceListItem,
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
  /** Fase 3: si false, el ítem está oculto en este canal. */
  is_visible?: boolean;
  custom_name?: string | null;
  custom_image_url?: string | null;
  custom_description?: string | null;
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

/**
 * Devuelve un map `priceListId → { itemCartaId → PriceListItem }` con todas
 * las filas de override por canal × ítem. A partir de Fase 3, cada celda
 * incluye `is_visible` y los overrides visuales (`custom_name`, etc.)
 * además del `precio`.
 */
export function useAllPriceListItems(priceListIds: string[]) {
  return useQuery({
    queryKey: ['all-price-list-items', priceListIds],
    queryFn: async () => {
      if (priceListIds.length === 0) return {};
      const data = await fetchAllPriceListItemsService(priceListIds);

      const map: Record<string, Record<string, PriceListItem>> = {};
      for (const row of data as unknown as PriceListItem[]) {
        if (!map[row.price_list_id]) map[row.price_list_id] = {};
        map[row.price_list_id][row.item_carta_id] = row;
      }
      return map;
    },
    enabled: priceListIds.length > 0,
  });
}

export function useMenuItemsForPricing() {
  return useQuery({
    queryKey: ['menu-items-all'],
    queryFn: async () => {
      const data = await fetchItemsCartaForPricing();
      return data || [];
    },
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

/**
 * P1 #4: tras cualquier mutation de pricing por canal, invalidar también
 * la cache canónica `sellable-menu` que consumen POS y WebApp. Así un
 * cambio de precio en admin se refleja inmediatamente en consumers.
 */
function invalidateSellableCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sellable-menu'] });
  qc.invalidateQueries({ queryKey: ['webapp-menu-items'] });
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
      invalidateSellableCaches(qc);
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
      invalidateSellableCaches(qc);
    },
  });
}

/**
 * Fase 5: toggle activo/inactivo de una price_list (canal). Reemplaza el
 * switch "disabled" que había en `CanalesVentaPage` tab "Canales y Comisiones".
 */
export function useTogglePriceListActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; is_active: boolean }) => {
      const { apiPut } = await import('@/services/apiClient');
      return apiPut(`/promotions/price-lists/${params.id}`, { is_active: params.is_active });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      invalidateSellableCaches(qc);
      toast.success(vars.is_active ? 'Canal activado' : 'Canal desactivado');
    },
    onError: () => toast.error('Error al cambiar estado del canal'),
  });
}

/**
 * Fase 3: patch puntual de un ítem dentro de un canal (visibilidad y
 * overrides visuales). No requiere pasar el precio.
 */
export function useUpdatePriceListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      price_list_id: string;
      item_carta_id: string;
      patch: Parameters<typeof updatePriceListItem>[2];
    }) => updatePriceListItem(params.price_list_id, params.item_carta_id, params.patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
      invalidateSellableCaches(qc);
    },
  });
}

export function useUnifyPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { source: 'default' | string; targetChannels: Channel[] }) => {
      let sourceItems: Array<{ id: string; base_price: number }>;

      if (params.source === 'default') {
        const data = await fetchActiveItemsPrices();
        sourceItems = data as Array<{ id: string; base_price: number }>;
      } else {
        const data = await fetchPriceListItemsService(params.source);
        sourceItems = (data as Array<Record<string, unknown>>).map((d) => ({
          id: d.item_carta_id as string,
          base_price: d.precio as number,
        }));
      }

      const targetLists = await fetchPriceListsByChannels(params.targetChannels);

      for (const list of targetLists as unknown as PriceList[]) {
        const items = sourceItems.map((s) => ({
          item_carta_id: s.id,
          precio: s.base_price,
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
