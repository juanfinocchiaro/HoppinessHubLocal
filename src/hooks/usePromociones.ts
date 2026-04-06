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
  canales: string[];
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

export function usePromociones() {
  return useQuery({
    queryKey: ['promociones'],
    queryFn: async () => {
      const data = await fetchPromocionesService();
      return (data as any[]).map((p: any) => ({
        ...p,
        canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
      })) as Promocion[];
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

      return (data as any[])
        .filter((p: any) => {
          const bids = p.branch_ids ?? [];
          if (bids.length > 0 && (!branchId || !bids.includes(branchId))) return false;
          const ch = p.canales ?? [];
          if (canal && ch.length > 0 && !ch.includes(canal)) return false;
          const dias = p.dias_semana ?? [];
          if (dias.length > 0 && !dias.includes(currentDay)) return false;
          const hi = (p.hora_inicio ?? '').slice(0, 5);
          const hf = (p.hora_fin ?? '').slice(0, 5);
          if (hi && currentTime < hi) return false;
          if (hf && hf !== '00:00' && currentTime > hf) return false;
          if (p.fecha_inicio && today < p.fecha_inicio) return false;
          if (p.fecha_fin && today > p.fecha_fin) return false;
          return true;
        })
        .map((p) => ({
          ...p,
          canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
        }));
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
      cantidad: number;
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
