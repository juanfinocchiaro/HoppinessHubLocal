import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchPromociones as fetchPromocionesService,
  fetchActivePromociones,
  fetchPromocionItemsWithCarta,
  fetchPromoItemsByPromoIds,
  fetchPreconfigExtras,
  fetchItemsCartaPriceInfo,
  createPromocion as createPromocionService,
  updatePromocion as updatePromocionService,
  deletePromocionItems,
  insertPromocionItems,
  insertPreconfigExtras,
  togglePromocionActive,
  softDeletePromocion,
} from '@/services/promoService';

/**
 * Config de una promo para un canal específico. Proviene de la tabla
 * `promotion_channel_config` (Fase 2). Es la fuente de verdad por sobre el
 * array legacy `canales` a partir de Fase 2.
 */
export interface PromotionChannelConfig {
  channel_code: string;
  is_active_in_channel: boolean;
  /** Override del precio final para este canal (si null usa reglas base). */
  custom_final_price: number | null;
  /** Override del valor de descuento (% o $) para este canal. */
  custom_discount_value: number | null;
  /** Quién banca este descuento: 'restaurant' | 'channel' | 'split'. */
  funded_by: 'restaurant' | 'channel' | 'split' | null;
  /** Formato de presentación: 'percentage' | 'final_price' | 'both' | 'banner_only'. */
  display_format: 'percentage' | 'final_price' | 'both' | 'banner_only' | null;
  banner_image_url: string | null;
  promo_text: string | null;
}

export type PromotionFundedBy = NonNullable<PromotionChannelConfig['funded_by']>;
export type PromotionDisplayFormat = NonNullable<PromotionChannelConfig['display_format']>;

export interface Promocion {
  id: string;
  name: string;
  descripcion: string | null;
  tipo: 'descuento_porcentaje' | 'descuento_fijo' | '2x1' | 'combo' | 'precio_especial';
  valor: number;
  restriccion_pago: 'cualquiera' | 'solo_efectivo' | 'solo_digital';
  dias_semana: number[];
  hora_inicio: string;
  hora_fin: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  aplica_a: 'producto' | 'categoria' | 'todo';
  producto_ids: string[];
  categoria_ids: string[];
  tipo_usuario: 'todos' | 'nuevo' | 'recurrente' | 'staff' | 'custom_segment';
  is_active: boolean;
  branch_ids: string[];
  /** @deprecated Usar `channel_configs`. Se mantiene como shadow en DB. */
  canales: string[];
  channel_configs: PromotionChannelConfig[];
  funded_by: PromotionFundedBy | null;
  display_format: PromotionDisplayFormat | null;
  show_in_webapp_section: boolean;
  created_at: string;
}

export interface PromocionItemExtra {
  extra_item_carta_id: string;
  cantidad: number;
  nombre?: string;
  precio?: number;
}

export interface PromocionItem {
  id: string;
  promocion_id: string;
  item_carta_id: string;
  precio_promo: number;
  created_at: string;
  item_nombre?: string;
  item_imagen?: string | null;
  precio_base?: number;
  preconfigExtras?: PromocionItemExtra[];
  restriccion_pago?: Promocion['restriccion_pago'];
  promocion_nombre?: string;
}

export type PromocionFormData = Omit<Promocion, 'id' | 'created_at'>;

/**
 * Devuelve true si la promo aplica al canal indicado según su
 * `channel_configs` (nueva fuente de verdad). Si la promo fue normalizada a
 * partir de `canales` legacy, `channel_configs` incluye todos activos, así
 * que el comportamiento es compatible.
 */
function promoAppliesToChannel(promo: Promocion, canal: string | undefined): boolean {
  if (!canal) return true;
  const configs = promo.channel_configs;
  if (!configs?.length) return true;
  const match = configs.find((c) => c.channel_code === canal);
  return !!match && match.is_active_in_channel;
}

/**
 * Normaliza una promo tal como viene del backend:
 * - Parsea `canales` (TEXT) a array.
 * - Si no hay `channel_configs` (legacy), los deriva del array `canales`.
 * - Garantiza que el caller siempre ve ambos (compat durante Fase 2).
 */
function normalizePromo(raw: Record<string, unknown>): Promocion {
  const canalesRaw = raw.canales;
  const canales: string[] = Array.isArray(canalesRaw)
    ? (canalesRaw as string[])
    : typeof canalesRaw === 'string' && canalesRaw.trim()
      ? parseCanalesString(canalesRaw)
      : ['webapp', 'dine_in', 'rappi', 'pedidos_ya'];

  const rawConfigs = raw.channel_configs as Array<Record<string, unknown>> | undefined;
  const channel_configs: PromotionChannelConfig[] = Array.isArray(rawConfigs) && rawConfigs.length
    ? rawConfigs.map((c) => ({
        channel_code: c.channel_code as string,
        is_active_in_channel: c.is_active_in_channel !== false,
        custom_final_price: (c.custom_final_price as number | null) ?? null,
        custom_discount_value: (c.custom_discount_value as number | null) ?? null,
        funded_by: (c.funded_by as PromotionChannelConfig['funded_by']) ?? null,
        display_format: (c.display_format as PromotionChannelConfig['display_format']) ?? null,
        banner_image_url: (c.banner_image_url as string | null) ?? null,
        promo_text: (c.promo_text as string | null) ?? null,
      }))
    : canales.map((code) => ({
        channel_code: code,
        is_active_in_channel: true,
        custom_final_price: null,
        custom_discount_value: null,
        funded_by: null,
        display_format: null,
        banner_image_url: null,
        promo_text: null,
      }));

  return {
    ...(raw as unknown as Promocion),
    canales,
    channel_configs,
    funded_by: (raw.funded_by as PromotionFundedBy | null) ?? null,
    display_format: (raw.display_format as PromotionDisplayFormat | null) ?? null,
    show_in_webapp_section: raw.show_in_webapp_section !== false,
  };
}

function parseCanalesString(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      /* falls through to CSV */
    }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

export function usePromociones() {
  return useQuery({
    queryKey: ['promociones'],
    queryFn: async () => {
      const data = await fetchPromocionesService();
      return (data as Array<Record<string, unknown>>).map(normalizePromo);
    },
  });
}

/** Fetch items attached to a promotion, with carta info + preconfig extras */
export function usePromocionItems(promoId: string | undefined) {
  return useQuery({
    queryKey: ['promocion-items', promoId],
    queryFn: async () => {
      const data = await fetchPromocionItemsWithCarta(promoId!);

      const items = (data as Array<Record<string, unknown>>).map((d) => ({
        id: d.id as string,
        promocion_id: d.promocion_id as string,
        item_carta_id: d.item_carta_id as string,
        precio_promo: Number(d.promo_price ?? 0),
        created_at: d.created_at as string,
        item_nombre: (d.menu_items as Record<string, unknown>)?.name as string | undefined,
        item_imagen: (d.menu_items as Record<string, unknown>)?.image_url as string | null | undefined,
        precio_base: (d.menu_items as Record<string, unknown>)?.base_price
          ? Number((d.menu_items as Record<string, unknown>).base_price)
          : undefined,
      })) as PromocionItem[];

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const extrasData = await fetchPreconfigExtras(itemIds);
        if (extrasData.length > 0) {
          const extraCartaIds = [
            ...new Set(extrasData.map((e) => e.extra_item_carta_id as string)),
          ];
          const extraInfo = await fetchItemsCartaPriceInfo(extraCartaIds);
          const nameMap = new Map(extraInfo.map((n: Record<string, unknown>) => [n.id, n.name]));
          const priceMap = new Map(
            extraInfo.map((n: Record<string, unknown>) => [n.id, Number(n.base_price ?? 0)]),
          );
          const byItem = new Map<string, PromocionItemExtra[]>();
          for (const e of extrasData) {
            const list = byItem.get(e.promocion_item_id as string) || [];
            list.push({
              extra_item_carta_id: e.extra_item_carta_id as string,
              cantidad: e.cantidad as number,
              nombre: (nameMap.get(e.extra_item_carta_id as string) as string) || '',
              precio: (priceMap.get(e.extra_item_carta_id as string) as number) ?? 0,
            });
            byItem.set(e.promocion_item_id as string, list);
          }
          for (const item of items) {
            item.preconfigExtras = byItem.get(item.id);
          }
        }
      }

      return items;
    },
    enabled: !!promoId,
  });
}

/** Get active promos for a specific branch + channel, evaluated by current day/time */
export function useActivePromos(branchId: string | undefined, canal?: string) {
  return useQuery({
    queryKey: ['active-promos', branchId, canal],
    queryFn: async () => {
      const data = await fetchActivePromociones();

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().slice(0, 10);

      return (data as Array<Record<string, unknown>>)
        .map(normalizePromo)
        .filter((p) => {
          const bids = p.branch_ids ?? [];
          if (bids.length > 0 && (!branchId || !bids.includes(branchId))) return false;
          if (!promoAppliesToChannel(p, canal)) return false;
          const dias = p.dias_semana ?? [];
          if (dias.length > 0 && !dias.includes(currentDay)) return false;
          const hi = (p.hora_inicio ?? '').slice(0, 5);
          const hf = (p.hora_fin ?? '').slice(0, 5);
          if (hi && currentTime < hi) return false;
          if (hf && hf !== '00:00' && currentTime > hf) return false;
          if (p.fecha_inicio && today < p.fecha_inicio) return false;
          if (p.fecha_fin && today > p.fecha_fin) return false;
          return true;
        });
    },
    enabled: !!branchId,
    refetchInterval: 5 * 60 * 1000,
  });
}

/** Get active promo items (with prices + preconfig extras) for a channel + branch */
export function useActivePromoItems(branchId: string | undefined, canal?: string) {
  const { data: promos = [] } = useActivePromos(branchId, canal);
  const promoIds = promos.map((p) => p.id);
  const payRestrictionByPromoId = useMemo(
    () => new Map(promos.map((p) => [p.id, p.restriccion_pago] as const)),
    [promos],
  );
  const promoNameById = useMemo(
    () => new Map(promos.map((p) => [p.id, p.name] as const)),
    [promos],
  );

  return useQuery({
    queryKey: ['active-promo-items', promoIds],
    queryFn: async () => {
      if (promoIds.length === 0) return [];
      const data = await fetchPromoItemsByPromoIds(promoIds);

      const promoItemIds = (data as Array<Record<string, unknown>>).map(
        (d) => d.id as string,
      );

      let extrasMap = new Map<string, PromocionItemExtra[]>();
      if (promoItemIds.length > 0) {
        const extrasData = await fetchPreconfigExtras(promoItemIds);

        if (extrasData.length > 0) {
          const extraItemIds = [
            ...new Set(extrasData.map((e) => e.extra_item_carta_id as string)),
          ];
          const extraInfo = await fetchItemsCartaPriceInfo(extraItemIds);
          const nameMap = new Map(
            extraInfo.map((n: Record<string, unknown>) => [n.id, n.name]),
          );
          const priceMap = new Map(
            extraInfo.map((n: Record<string, unknown>) => [n.id, Number(n.base_price ?? 0)]),
          );

          for (const e of extrasData) {
            const list = extrasMap.get(e.promocion_item_id as string) || [];
            list.push({
              extra_item_carta_id: e.extra_item_carta_id as string,
              cantidad: e.cantidad as number,
              nombre: (nameMap.get(e.extra_item_carta_id as string) as string) || '',
              precio: (priceMap.get(e.extra_item_carta_id as string) as number) ?? 0,
            });
            extrasMap.set(e.promocion_item_id as string, list);
          }
        }
      }

      return (data as Array<Record<string, unknown>>).map((d) => ({
        id: d.id as string,
        promocion_id: d.promocion_id as string,
        item_carta_id: d.item_carta_id as string,
        precio_promo: Number(d.promo_price ?? 0),
        created_at: d.created_at as string,
        item_nombre: (d.menu_items as Record<string, unknown>)?.name as string | undefined,
        item_imagen: (d.menu_items as Record<string, unknown>)?.image_url as string | null | undefined,
        precio_base: (d.menu_items as Record<string, unknown>)?.base_price
          ? Number((d.menu_items as Record<string, unknown>).base_price)
          : undefined,
        preconfigExtras: extrasMap.get(d.id as string) || undefined,
        restriccion_pago:
          payRestrictionByPromoId.get(d.promocion_id as string) ?? 'cualquiera',
        promocion_nombre: promoNameById.get(d.promocion_id as string) ?? undefined,
      })) as PromocionItem[];
    },
    enabled: promoIds.length > 0,
  });
}

export function usePromocionMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['promociones'] });
    qc.invalidateQueries({ queryKey: ['active-promos'] });
    qc.invalidateQueries({ queryKey: ['promocion-items'] });
    qc.invalidateQueries({ queryKey: ['active-promo-items'] });
    // P1 #4: el sellable-menu canónico también cambia cuando una promo
    // se crea/edita/desactiva. POS y WebApp ven el cambio sin F5.
    qc.invalidateQueries({ queryKey: ['sellable-menu'] });
    qc.invalidateQueries({ queryKey: ['webapp-menu-items'] });
  };

  const savePreconfigExtrasHelper = async (
    insertedItems: Array<{ id: string; item_carta_id: string }>,
    sourceItems: Array<{
      item_carta_id: string;
      preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
    }>,
  ) => {
    const rows: Array<{
      promocion_item_id: string;
      extra_item_carta_id: string;
      quantity: number;
    }> = [];
    for (const inserted of insertedItems) {
      const source = sourceItems.find((s) => s.item_carta_id === inserted.item_carta_id);
      if (source?.preconfigExtras?.length) {
        for (const ex of source.preconfigExtras) {
          rows.push({
            promocion_item_id: inserted.id,
            extra_item_carta_id: ex.extra_item_carta_id,
            quantity: ex.cantidad,
          });
        }
      }
    }
    await insertPreconfigExtras(rows);
  };

  const create = useMutation({
    mutationFn: async (
      data: PromocionFormData & {
        items?: Array<{
          item_carta_id: string;
          precio_promo: number;
          preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
        }>;
      },
    ) => {
      const { items, ...promoData } = data;
      const result = await createPromocionService(
        promoData as Record<string, unknown>,
        user?.id,
      );

      if (items && items.length > 0) {
        const insertedItems = await insertPromocionItems(
          (result as Record<string, unknown>).id as string,
          items,
        );
        await savePreconfigExtrasHelper(insertedItems, items);
      }

      return result;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción creada');
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      data,
      items,
    }: {
      id: string;
      data: Partial<PromocionFormData>;
      items?: Array<{
        item_carta_id: string;
        precio_promo: number;
        preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
      }>;
    }) => {
      await updatePromocionService(id, data as Record<string, unknown>);

      if (items !== undefined) {
        await deletePromocionItems(id);
        if (items.length > 0) {
          const insertedItems = await insertPromocionItems(id, items);
          await savePreconfigExtrasHelper(insertedItems, items);
        }
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción actualizada');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      togglePromocionActive(id, is_active),
    onSuccess: () => {
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => softDeletePromocion(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción eliminada');
    },
    onError: (e) => toast.error(e.message),
  });

  return { create, update, toggleActive, remove };
}
