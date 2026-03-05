import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchExtraAssignmentsByItem,
  fetchActiveExtrasByIds,
  saveExtraAssignments,
  updatePrecioExtra,
} from '@/services/menuService';

export interface ItemExtra {
  id: string;
  item_carta_id: string;
  preparacion_id: string | null;
  insumo_id: string | null;
  orden: number;
  // Joined fields
  preparaciones?: {
    id: string;
    nombre: string;
    costo_calculado: number;
    precio_extra: number | null;
    puede_ser_extra: boolean;
  } | null;
  insumos?: {
    id: string;
    nombre: string;
    costo_por_unidad_base: number;
    precio_extra: number | null;
    puede_ser_extra: boolean;
  } | null;
}

export function useItemExtras(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-extras', itemId],
    queryFn: async () => {
      if (!itemId) return [];

      const asignaciones = await fetchExtraAssignmentsByItem(itemId);
      const extraIds = asignaciones.map((a) => a.extra_id as string);

      if (extraIds.length === 0) return [];

      const extras = await fetchActiveExtrasByIds(extraIds);

      return extras.map((e: Record<string, unknown>, i: number) => ({
        id: e.id as string,
        item_carta_id: itemId,
        preparacion_id: null,
        insumo_id: null,
        orden: i,
        preparaciones: {
          id: e.id as string,
          nombre: e.name as string,
          costo_calculado: 0,
          precio_extra: e.precio_base as number,
          puede_ser_extra: true,
        },
        insumos: null,
      })) as ItemExtra[];
    },
    enabled: !!itemId,
  });
}

export function useItemExtrasMutations() {
  const qc = useQueryClient();

  const saveExtras = useMutation({
    mutationFn: ({
      item_carta_id,
      extra_ids,
    }: {
      item_carta_id: string;
      extra_ids: string[];
    }) => saveExtraAssignments(item_carta_id, extra_ids),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-carta-extras', vars.item_carta_id] });
      toast.success('Extras guardados');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updatePrecioExtraMut = useMutation({
    mutationFn: ({
      tipo,
      id,
      precio_extra,
    }: {
      tipo: 'preparacion' | 'insumo';
      id: string;
      precio_extra: number | null;
    }) => updatePrecioExtra(tipo === 'preparacion' ? 'recipes' : 'supplies', id, precio_extra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-carta-extras'] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      qc.invalidateQueries({ queryKey: ['insumos'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { saveExtras, updatePrecioExtra: updatePrecioExtraMut };
}
