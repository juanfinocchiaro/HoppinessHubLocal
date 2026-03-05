import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchBranchItemAvailability,
  fetchItemsCarta as fetchItemsCartaSvc,
  fetchItemCartaComposicion,
  fetchItemCartaHistorial,
  createItemCarta,
  updateItemCarta,
  softDeleteItemCarta,
  saveItemCartaComposicion,
  cambiarPrecioItemCarta,
} from '@/services/menuService';

export function useItemsCarta(branchId?: string) {
  return useQuery({
    queryKey: ['items-carta', branchId ?? 'all'],
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async () => {
      const addCompat = (items: any[]) =>
        (items || []).map((it: any) => ({
          ...it,
          nombre: it.name ?? it.nombre,
          menu_categories: it.menu_categories
            ? { ...it.menu_categories, nombre: it.menu_categories.name ?? it.menu_categories.nombre }
            : it.menu_categories,
        }));

      if (branchId) {
        const availability = await fetchBranchItemAvailability(branchId);
        const data = await fetchItemsCartaSvc();

        const availabilityMap = new Map(
          (availability || []).map((row: any) => [row.item_carta_id, row]),
        );

        return addCompat(
          (data || []).filter((item: any) => {
            const row = availabilityMap.get(item.id);
            if (!row) return true;
            return !!(row as any).available && !!(row as any).available_salon && !(row as any).out_of_stock;
          }),
        );
      }

      return addCompat(await fetchItemsCartaSvc());
    },
  });
}

export function useItemCartaComposicion(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-composicion', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const data = await fetchItemCartaComposicion(itemId);
      return (data || []).map((comp: any) => ({
        ...comp,
        recipes: comp.recipes ? { ...comp.recipes, nombre: comp.recipes.name ?? comp.recipes.nombre } : comp.recipes,
        supplies: comp.supplies ? { ...comp.supplies, nombre: comp.supplies.name ?? comp.supplies.nombre } : comp.supplies,
        preparaciones: comp.preparaciones ? { ...comp.preparaciones, nombre: comp.preparaciones.name ?? comp.preparaciones.nombre } : comp.preparaciones,
        insumos: comp.insumos ? { ...comp.insumos, nombre: comp.insumos.name ?? comp.insumos.nombre } : comp.insumos,
      }));
    },
    enabled: !!itemId,
  });
}

export function useItemCartaHistorial(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-historial', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      return fetchItemCartaHistorial(itemId);
    },
    enabled: !!itemId,
  });
}

export function useItemCartaMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: {
      nombre: string;
      nombre_corto?: string;
      descripcion?: string;
      categoria_carta_id?: string | null;
      rdo_category_code?: string;
      precio_base: number;
      fc_objetivo?: number;
      disponible_delivery?: boolean;
      tipo?: string;
    }) => createItemCarta(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item de carta creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateItemCarta(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteItemCarta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveComposicion = useMutation({
    mutationFn: ({
      item_carta_id,
      items,
    }: {
      item_carta_id: string;
      items: { preparacion_id?: string; insumo_id?: string; cantidad: number }[];
    }) => saveItemCartaComposicion(item_carta_id, items),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-carta-composicion', vars.item_carta_id] });
      qc.invalidateQueries({ queryKey: ['item-ingredientes-deep', vars.item_carta_id] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Composición guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const cambiarPrecio = useMutation({
    mutationFn: (params: {
      itemId: string;
      precioAnterior: number;
      precioNuevo: number;
      motivo?: string;
      userId?: string;
    }) => cambiarPrecioItemCarta(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      qc.invalidateQueries({ queryKey: ['item-carta-historial'] });
      toast.success('Precio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, saveComposicion, cambiarPrecio };
}
