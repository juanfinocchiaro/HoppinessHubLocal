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
  nombre: string;
  costo: number;
  cantidad: number;
  origen: string;
  extra_id: string | null;
  extra_nombre: string;
  extra_precio: number;
  activo: boolean;
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
  const { data: asignaciones } = useQuery({
    queryKey: ['item-extra-asignaciones', itemId],
    queryFn: () => fetchExtraAssignmentsWithJoin(itemId!),
    enabled: !!itemId,
  });

  return useMemo((): DiscoveredExtra[] => {
    const discovered: {
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      nombre: string;
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
          nombre: ing.nombre,
          costo: (ing.costo_por_unidad_base || 0) * (ing.cantidad || 1),
          cantidad: ing.cantidad || 1,
          origen: group.receta_nombre,
        });
      }
      for (const sp of group.sub_preparaciones || []) {
        discovered.push({
          tipo: 'preparacion',
          ref_id: sp.preparacion_id,
          nombre: sp.nombre,
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
    const extras = (allItems || []).filter((e: Record<string, unknown>) => e.tipo === 'extra');
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
        extra_nombre: ((existing as Record<string, unknown>)?.nombre as string) || `Extra ${d.nombre}`,
        extra_precio: ((existing as Record<string, unknown>)?.precio_base as number) || 0,
        activo: existing ? asigSet.has((existing as Record<string, unknown>).id) : false,
      };
    });
  }, [deepGroups, composicion, allItems, asignaciones]);
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
      (i: Record<string, unknown>) => i.tipo !== 'extra' && i.activo,
    );
  }, [allItems]);

  const assignedSet = useMemo(() => {
    return new Set(
      (allAsignaciones || []).map((a: Record<string, unknown>) => a.item_carta_id as string),
    );
  }, [allAsignaciones]);

  return { productItems, assignedSet };
}
