import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fromUntyped } from '@/lib/supabase-helpers';
import { fetchBranchSlugAndName } from '@/services/configService';
import { toast } from 'sonner';
import type { BranchWebappAvailabilityRow } from '@/components/local/webapp/webappConfigTypes';

export function useWebappConfigAdmin(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config-admin', branchId],
    queryFn: async () => {
      const { data, error } = await fromUntyped('webapp_config')
        .select('*')
        .eq('branch_id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!branchId,
  });
}

export function useBranchSlug(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-slug', branchId],
    queryFn: () => fetchBranchSlugAndName(branchId!),
    enabled: !!branchId,
  });
}

export function useBranchWebappAvailability(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-webapp-availability', branchId],
    queryFn: async () => {
      const { data: items, error: itemsErr } = await fromUntyped('items_carta')
        .select(
          'id, nombre, tipo, orden, disponible_webapp, menu_categorias:categoria_carta_id(nombre, orden)',
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('orden');
      if (itemsErr) throw itemsErr;

      const { data: availability, error: avErr } = await fromUntyped('branch_item_availability')
        .select('item_carta_id, available_webapp, out_of_stock')
        .eq('branch_id', branchId!);
      if (avErr) throw avErr;

      const availabilityMap = new Map((availability || []).map((a: any) => [a.item_carta_id, a]));

      const rows = (items || [])
        .filter((item: any) => item.tipo !== 'extra')
        .map((item: any) => {
          const av = availabilityMap.get(item.id);
          return {
            itemId: item.id,
            nombre: item.nombre,
            categoriaNombre: item.menu_categorias?.nombre ?? 'Sin categoría',
            categoriaOrden: item.menu_categorias?.orden ?? 999,
            productoOrden: item.orden ?? 999,
            marcaDisponibleWebapp: item.disponible_webapp !== false,
            localDisponibleWebapp: (av as any)?.available_webapp ?? true,
            outOfStock: (av as any)?.out_of_stock ?? false,
          } satisfies BranchWebappAvailabilityRow;
        })
        .sort((a, b) => {
          if (a.categoriaOrden !== b.categoriaOrden) return a.categoriaOrden - b.categoriaOrden;
          if (a.productoOrden !== b.productoOrden) return a.productoOrden - b.productoOrden;
          return a.nombre.localeCompare(b.nombre);
        });

      return rows;
    },
    enabled: !!branchId,
  });
}

export function useUpdateBranchWebappAvailability(branchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      localDisponibleWebapp?: boolean;
      outOfStock?: boolean;
    }) => {
      const patch: Record<string, any> = {};
      if (params.localDisponibleWebapp !== undefined)
        patch.available_webapp = params.localDisponibleWebapp;
      if (params.outOfStock !== undefined) patch.out_of_stock = params.outOfStock;
      patch.updated_at = new Date().toISOString();

      const { data: updated, error: updateErr } = await fromUntyped('branch_item_availability')
        .update(patch)
        .eq('branch_id', branchId!)
        .eq('item_carta_id', params.itemId)
        .select('id');
      if (updateErr) throw updateErr;

      if (!updated || updated.length === 0) {
        const { error: upsertErr } = await fromUntyped('branch_item_availability').upsert(
          {
            branch_id: branchId!,
            item_carta_id: params.itemId,
            available_webapp: params.localDisponibleWebapp ?? true,
            out_of_stock: params.outOfStock ?? false,
          },
          { onConflict: 'branch_id,item_carta_id' },
        );
        if (upsertErr) throw upsertErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-webapp-availability', branchId] });
      qc.invalidateQueries({ queryKey: ['webapp-menu-items', branchId] });
      qc.invalidateQueries({ queryKey: ['items-carta', branchId] });
    },
    onError: (err: Error) => {
      toast.error('No se pudo actualizar la disponibilidad', { description: err.message });
    },
  });
}
