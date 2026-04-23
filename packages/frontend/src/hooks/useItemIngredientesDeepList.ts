import { useQuery } from '@tanstack/react-query';
import {
  fetchItemCartaComposicion,
  fetchPrepIngredientesForDeepList,
} from '@/services/menuService';

export interface DeepIngredient {
  insumo_id: string;
  name: string;
  quantity: number;
  unit: string;
  base_unit_cost: number;
  receta_origen: string;
  receta_origen_id: string;
}

export interface DeepSubPrep {
  preparacion_id: string;
  name: string;
  receta_origen: string;
  receta_origen_id: string;
}

export interface DeepIngredientGroup {
  receta_id: string;
  receta_nombre: string;
  ingredientes: DeepIngredient[];
  sub_preparaciones: DeepSubPrep[];
}

/**
 * For a given item_carta, fetches composition → for each preparacion,
 * fetches its preparacion_ingredientes (insumos AND sub-preparations) recursively.
 * Returns ingredients and sub-preparations grouped by recipe of origin.
 */
export function useItemIngredientesDeepList(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-ingredientes-deep', itemId],
    queryFn: async (): Promise<DeepIngredientGroup[]> => {
      if (!itemId) return [];

      const composicion = await fetchItemCartaComposicion(itemId);

      const groups: DeepIngredientGroup[] = [];

      async function fetchPrepIngredients(prepId: string, prepNombre: string, depth: number) {
        if (depth > 3) return;

        const ingredientes = await fetchPrepIngredientesForDeepList(prepId);

        const insumoItems: DeepIngredient[] = [];
        const subPrepItems: DeepSubPrep[] = [];

        for (const ing of ingredientes) {
          if (ing.insumo_id && (ing as Record<string, unknown>).supplies) {
            const supplies = (ing as Record<string, unknown>).supplies as Record<string, unknown>;
            insumoItems.push({
              insumo_id: (supplies.id as string) || ing.insumo_id,
              name: (supplies.name as string) || 'Desconocido',
              quantity: ing.quantity,
              unit: ing.unit || (supplies.base_unit as string) || 'un',
              base_unit_cost: (supplies.base_unit_cost as number) || 0,
              receta_origen: prepNombre,
              receta_origen_id: prepId,
            });
          }
          if (ing.sub_preparacion_id && (ing as Record<string, unknown>).sub_prep) {
            const subPrep = (ing as Record<string, unknown>).sub_prep as Record<string, unknown>;
            subPrepItems.push({
              preparacion_id: (subPrep.id as string) || ing.sub_preparacion_id,
              name: (subPrep.name as string) || 'Desconocido',
              receta_origen: prepNombre,
              receta_origen_id: prepId,
            });
            await fetchPrepIngredients(
              (subPrep.id as string) || ing.sub_preparacion_id,
              (subPrep.name as string) || 'Desconocido',
              depth + 1,
            );
          }
        }

        if (insumoItems.length > 0 || subPrepItems.length > 0) {
          groups.push({
            receta_id: prepId,
            receta_nombre: prepNombre,
            ingredientes: insumoItems,
            sub_preparaciones: subPrepItems,
          });
        }
      }

      for (const comp of composicion || []) {
        if (comp.preparacion_id && (comp as Record<string, unknown>).recipes) {
          const prep = (comp as Record<string, unknown>).recipes as Record<string, unknown>;
          await fetchPrepIngredients(prep.id as string, prep.name as string, 0);
        }

        if (comp.insumo_id && (comp as Record<string, unknown>).supplies) {
          const ins = (comp as Record<string, unknown>).supplies as Record<string, unknown>;
          const directGroup = groups.find((g) => g.receta_id === '__direct__');
          const ingredient: DeepIngredient = {
            insumo_id: ins.id as string,
            name: ins.name as string,
            quantity: comp.quantity,
            unit: (ins.base_unit as string) || 'un',
            base_unit_cost: (ins.base_unit_cost as number) || 0,
            receta_origen: 'Directo',
            receta_origen_id: '__direct__',
          };
          if (directGroup) {
            directGroup.ingredientes.push(ingredient);
          } else {
            groups.push({
              receta_id: '__direct__',
              receta_nombre: 'Insumos directos',
              ingredientes: [ingredient],
              sub_preparaciones: [],
            });
          }
        }
      }

      return groups;
    },
    enabled: !!itemId,
  });
}
