import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchGruposOpcionales,
  createGrupoOpcional,
  updateGrupoOpcional,
  deleteGrupoOpcional,
  saveGrupoOpcionalItems,
  updateGrupoOpcionalCosto,
  recalcularCostoItemCarta,
} from '@/services/menuService';

export interface GrupoOpcionalItem {
  id: string;
  grupo_id: string;
  insumo_id: string | null;
  preparacion_id: string | null;
  quantity: number;
  unit_cost: number;
  // joined
  supplies?: { id: string; name: string; base_unit_cost: number } | null;
  recipes?: { id: string; name: string; calculated_cost: number } | null;
}

export interface GrupoOpcional {
  id: string;
  item_carta_id: string;
  name: string;
  sort_order: number;
  average_cost: number;
  items?: GrupoOpcionalItem[];
}

export function useGruposOpcionales(itemId: string | undefined) {
  return useQuery({
    queryKey: ['grupos-opcionales', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const raw = await fetchGruposOpcionales(itemId);
      return (raw || []) as unknown as GrupoOpcional[];
    },
    enabled: !!itemId,
  });
}

export function useGruposOpcionalesMutations() {
  const qc = useQueryClient();

  const invalidate = (itemId: string) => {
    qc.invalidateQueries({ queryKey: ['grupos-opcionales', itemId] });
    qc.invalidateQueries({ queryKey: ['items-carta'] });
  };

  const createGrupoMut = useMutation({
    mutationFn: (params: { item_carta_id: string; nombre: string; orden: number }) =>
      createGrupoOpcional(params),
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateGrupoMut = useMutation({
    mutationFn: ({
      id,
      item_carta_id: _item_carta_id,
      data,
    }: {
      id: string;
      item_carta_id: string;
      data: { nombre?: string };
    }) => updateGrupoOpcional(id, data),
    onSuccess: (_, vars) => invalidate(vars.item_carta_id),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const deleteGrupoMut = useMutation({
    mutationFn: async ({ id, item_carta_id }: { id: string; item_carta_id: string }) => {
      await deleteGrupoOpcional(id);
      await recalcularCostoItemCarta(item_carta_id);
    },
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveGrupoItemsMut = useMutation({
    mutationFn: async ({
      grupo_id,
      item_carta_id,
      items,
    }: {
      grupo_id: string;
      item_carta_id: string;
      items: {
        insumo_id?: string | null;
        preparacion_id?: string | null;
        quantity: number;
        unit_cost: number;
      }[];
    }) => {
      const serviceItems = items.map(i => ({
        insumo_id: i.insumo_id,
        preparacion_id: i.preparacion_id,
        cantidad: i.quantity,
        costo_unitario: i.unit_cost,
      }));
      await saveGrupoOpcionalItems(grupo_id, serviceItems);

      const avg =
        items.length > 0
          ? items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0) / items.length
          : 0;

      await updateGrupoOpcionalCosto(grupo_id, avg);
      await recalcularCostoItemCarta(item_carta_id);
    },
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return {
    createGrupo: createGrupoMut,
    updateGrupo: updateGrupoMut,
    deleteGrupo: deleteGrupoMut,
    saveGrupoItems: saveGrupoItemsMut,
  };
}
