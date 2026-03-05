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
  cantidad: number;
  costo_unitario: number;
  // joined
  insumos?: { id: string; nombre: string; costo_por_unidad_base: number } | null;
  preparaciones?: { id: string; nombre: string; costo_calculado: number } | null;
}

export interface GrupoOpcional {
  id: string;
  item_carta_id: string;
  nombre: string;
  orden: number;
  costo_promedio: number;
  items?: GrupoOpcionalItem[];
}

export function useGruposOpcionales(itemId: string | undefined) {
  return useQuery({
    queryKey: ['grupos-opcionales', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const raw = await fetchGruposOpcionales(itemId);
      return ((raw || []) as any[]).map((g: any) => ({
        ...g,
        nombre: g.name ?? g.nombre,
        items: (g.items || []).map((gi: any) => ({
          ...gi,
          insumos: gi.insumos ? { ...gi.insumos, nombre: gi.insumos.name ?? gi.insumos.nombre } : gi.insumos,
          preparaciones: gi.preparaciones ? { ...gi.preparaciones, nombre: gi.preparaciones.name ?? gi.preparaciones.nombre } : gi.preparaciones,
          supplies: gi.supplies ? { ...gi.supplies, nombre: gi.supplies.name ?? gi.supplies.nombre } : gi.supplies,
          recipes: gi.recipes ? { ...gi.recipes, nombre: gi.recipes.name ?? gi.recipes.nombre } : gi.recipes,
        })),
      })) as unknown as GrupoOpcional[];
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
        cantidad: number;
        costo_unitario: number;
      }[];
    }) => {
      await saveGrupoOpcionalItems(grupo_id, items);

      const avg =
        items.length > 0
          ? items.reduce((sum, i) => sum + i.cantidad * i.costo_unitario, 0) / items.length
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
