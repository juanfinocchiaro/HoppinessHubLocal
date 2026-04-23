import { useQuery } from '@tanstack/react-query';
import {
  fetchWebappConfig,
  fetchWebappMenuItems,
  fetchWebappItemOptionalGroups,
  fetchWebappItemExtras,
  fetchWebappItemRemovables,
} from '@/services/menuService';
import type { WebappConfig, WebappMenuItem } from '@/types/webapp';

export function useWebappConfig(branchSlug: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config', branchSlug],
    queryFn: async () => {
      const { branch, config } = await fetchWebappConfig(branchSlug!);
      return { branch, config: config as unknown as WebappConfig };
    },
    enabled: !!branchSlug,
  });
}

// ── PARTE 6A: Filtrado por disponibilidad de local ──────────────
export function useWebappMenuItems(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-menu-items', branchId],
    queryFn: async () => {
      const { items, availability } = await fetchWebappMenuItems(branchId!);

      const availabilityMap = new Map(
        (availability as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => [
          row.item_carta_id,
          row,
        ]),
      );

      const visibleItems = items.filter((item: Record<string, unknown>) => {
        const row = availabilityMap.get(item.id);
        if (!row) return true;
        return !!row.available && !!row.available_webapp && !row.out_of_stock;
      });

      return visibleItems.map((item: Record<string, unknown>) => ({
        ...item,
        categoria_nombre:
          (item.menu_categories as Record<string, unknown> | null)?.name ?? null,
        categoria_orden:
          (item.menu_categories as Record<string, unknown> | null)?.sort_order ?? 999,
      })) as WebappMenuItem[];
    },
    enabled: !!branchId,
  });
}

// ── Grupos opcionales (bebidas en combos, etc.) ──────────────────
export interface OptionalGroupOption {
  id: string;
  name: string;
  precio_extra: number;
}

export interface OptionalGroup {
  id: string;
  name: string;
  is_required: boolean;
  max_selecciones: number | null;
  opciones: OptionalGroupOption[];
}

export function useWebappItemOptionalGroups(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-optional-groups', itemId],
    queryFn: async () => {
      const { groups, options } = await fetchWebappItemOptionalGroups(itemId!);
      if (groups.length === 0) return [];

      return groups.map((g: Record<string, unknown>) => ({
        id: g.id,
        name: g.name,
        is_required: g.is_required ?? false,
        max_selecciones: g.max_selecciones,
        opciones: (options as Array<Record<string, unknown>>)
          .filter((o: Record<string, unknown>) => o.grupo_id === g.id)
          .map((o: Record<string, unknown>) => ({
            id: o.id,
            name:
              (o.insumos as Record<string, unknown> | null)?.name ||
              (o.preparaciones as Record<string, unknown> | null)?.name ||
              'Opción',
            precio_extra: (o.costo_unitario as number) ?? 0,
          })),
      })) as OptionalGroup[];
    },
    enabled: !!itemId,
  });
}

// ── PARTE 5A: Extras desde item_extra_asignaciones → items_carta ──
export function useWebappItemExtras(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-extras', itemId],
    queryFn: async () => {
      const extras = await fetchWebappItemExtras(itemId!);

      return extras.map((e: Record<string, unknown>) => ({
        id: e.id,
        name: e.name,
        precio: e.base_price,
        image_url: e.image_url,
      }));
    },
    enabled: !!itemId,
  });
}

// ── PARTE 5A: Removibles desde item_removibles ──────────────────
export function useWebappItemRemovables(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-removables', itemId],
    queryFn: async () => {
      const data = await fetchWebappItemRemovables(itemId!);
      return (data as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
        ...r,
        display_name:
          (r.display_name as string) ||
          (r.insumos as Record<string, unknown> | null)?.name ||
          (r.preparaciones as Record<string, unknown> | null)?.name ||
          'Ingrediente',
      }));
    },
    enabled: !!itemId,
  });
}
