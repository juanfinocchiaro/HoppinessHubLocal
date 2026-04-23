import { useMemo } from 'react';
import { useItemIngredientesDeepList } from './useItemIngredientesDeepList';
import { useItemCartaComposicion, useItemsCarta } from './useItemsCarta';
import { useQuery } from '@tanstack/react-query';
import {
  fetchExtraAssignmentsWithJoin,
  fetchExtraAssignmentsForExtra,
} from '@/services/menuService';

export interface DiscoveredExtra {
  tipo: 'preparacion' | 'insumo';
  ref_id: string;
  name: string;
  costo: number;
  cantidad: number;
  origen: string;
  extra_id: string | null;
  extra_name: string;
  extra_price: number;
  is_active: boolean;
}

/**
 * For an item, discovers all components that could be extras
 * and crosses with existing extras + active assignments.
 */
export function useExtraAutoDiscovery(itemId: string | undefined) {
  const { data: deepGroups } = useItemIngredientesDeepList(itemId);
  const { data: composicion } = useItemCartaComposicion(itemId);
  const { data: allItems } = useItemsCarta();

  // Fetch assignments for this item
  const asigQuery = useQuery({
    queryKey: ['item-extra-asignaciones', itemId],
    queryFn: () => fetchExtraAssignmentsWithJoin(itemId!),
    enabled: !!itemId,
  });
  const asignaciones = asigQuery.data;

  const data = useMemo((): DiscoveredExtra[] => {
    const discovered: {
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      name: string;
      costo: number;
      cantidad: number;
      origen: string;
    }[] = [];

    // Deep ingredients from recipes
    for (const group of deepGroups || []) {
      for (const ing of group.ingredientes) {
        discovered.push({
          tipo: 'insumo',
          ref_id: ing.insumo_id,
          name: ing.name,
          costo: (ing.base_unit_cost || 0) * (ing.quantity || 1),
          cantidad: ing.quantity || 1,
          origen: group.receta_nombre,
        });
      }
      for (const sp of group.sub_preparaciones || []) {
        discovered.push({
          tipo: 'preparacion',
          ref_id: sp.preparacion_id,
          name: sp.name,
          costo: 0,
          cantidad: 1,
          origen: group.receta_nombre,
        });
      }
    }

    // Deduplicate by tipo:ref_id
    const unique = new Map<string, (typeof discovered)[0]>();
    for (const d of discovered) {
      const key = `${d.tipo}:${d.ref_id}`;
      if (!unique.has(key)) unique.set(key, d);
    }

    // Cross with existing extras (items_carta tipo='extra')
    const extras = (allItems || []).filter((e: Record<string, unknown>) => e.type === 'extra');
    const asigSet = new Set((asignaciones || []).map((a: Record<string, unknown>) => a.extra_id));

    return Array.from(unique.values()).map((d) => {
      const existing = extras.find(
        (e: Record<string, unknown>) =>
          (d.tipo === 'preparacion' && e.composicion_ref_preparacion_id === d.ref_id) ||
          (d.tipo === 'insumo' && e.composicion_ref_insumo_id === d.ref_id),
      );
      return {
        ...d,
        cantidad: d.cantidad,
        extra_id: (existing as Record<string, unknown>)?.id as string || null,
        extra_name: ((existing as Record<string, unknown>)?.name as string) || `Extra ${d.name}`,
        extra_price: ((existing as Record<string, unknown>)?.base_price as number) || 0,
        is_active: existing ? asigSet.has((existing as Record<string, unknown>).id) : false,
      };
    });
  }, [deepGroups, composicion, allItems, asignaciones]);

  return { data, error: asigQuery.error, isError: asigQuery.isError };
}

/**
 * For an extra item (tipo='extra'), discovers which products contain
 * this component and which have it assigned.
 */
export function useExtraAssignableItems(extraItem: Record<string, unknown> | undefined) {
  const { data: allItems } = useItemsCarta();

  const { data: allAsignaciones } = useQuery({
    queryKey: ['item-extra-asignaciones-for-extra', extraItem?.id],
    queryFn: () => fetchExtraAssignmentsForExtra(extraItem!.id as string),
    enabled: !!extraItem?.id,
  });

  const productItems = useMemo(() => {
    return (allItems || []).filter(
      (i: Record<string, unknown>) => i.type !== 'extra' && i.is_active,
    );
  }, [allItems]);

  const assignedSet = useMemo(() => {
    return new Set(
      (allAsignaciones || []).map((a: Record<string, unknown>) => a.item_carta_id as string),
    );
  }, [allAsignaciones]);

  return { productItems, assignedSet };
}
