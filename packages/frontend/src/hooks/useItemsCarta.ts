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
      if (branchId) {
        const availability = await fetchBranchItemAvailability(branchId);
        const data = await fetchItemsCartaSvc();

        const availabilityMap = new Map(
          (availability || []).map((row: any) => [row.item_carta_id, row]),
        );

        return (data || []).filter((item: any) => {
          const row = availabilityMap.get(item.id);
          if (!row) return true;
          return !!(row as any).available && !!(row as any).available_salon && !(row as any).out_of_stock;
        });
      }

      return await fetchItemsCartaSvc();
    },
  });
}

export function useItemCartaComposicion(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-composicion', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      return (await fetchItemCartaComposicion(itemId)) || [];
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

/**
 * Fase 1 follow-up / P1 #4: tras cualquier mutation que afecte el menú
 * vendible, invalidar también las caches que consumen POS y WebApp.
 * Así un cambio en admin se refleja sin F5.
 */
function invalidateSellableCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['items-carta'] });
  qc.invalidateQueries({ queryKey: ['sellable-menu'] });
  qc.invalidateQueries({ queryKey: ['webapp-menu-items'] });
  qc.invalidateQueries({ queryKey: ['active-promos'] });
  qc.invalidateQueries({ queryKey: ['active-promo-items'] });
}

export function useItemCartaMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: {
      nombre: string;
      short_name?: string;
      descripcion?: string;
      categoria_carta_id?: string | null;
      rdo_category_code?: string;
      precio_base: number;
      fc_objetivo?: number;
      disponible_delivery?: boolean;
      tipo?: string;
    }) => createItemCarta(data),
    onSuccess: () => {
      invalidateSellableCaches(qc);
      toast.success('Item de carta creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateItemCarta(id, data),
    onSuccess: () => {
      invalidateSellableCaches(qc);
      toast.success('Item actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteItemCarta(id),
    onSuccess: () => {
      invalidateSellableCaches(qc);
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
      invalidateSellableCaches(qc);
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
      qc.invalidateQueries({ queryKey: ['item-carta-historial'] });
      invalidateSellableCaches(qc);
      toast.success('Precio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, saveComposicion, cambiarPrecio };
}
