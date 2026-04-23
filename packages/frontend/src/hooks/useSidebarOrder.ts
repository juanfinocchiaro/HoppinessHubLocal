/**
 * useSidebarOrder - Manages global sidebar section ordering
 * Superadmins can reorder; all users see the same order.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSidebarOrder, upsertSidebarOrder } from '@/services/configService';
import { toast } from 'sonner';

const DEFAULT_ORDER = ['locales', 'menu-eng', 'gestion-red', 'modelo-op', 'finanzas', 'admin'];

export function useSidebarOrder() {
  const queryClient = useQueryClient();

  const { data: orderMap, isLoading } = useQuery({
    queryKey: ['sidebar-section-order'],
    queryFn: fetchSidebarOrder,
    staleTime: 60_000,
  });

  const sortedIds = orderMap ? orderMap.map((r) => r.section_id) : DEFAULT_ORDER;

  const reorder = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const rows = newOrder.map((id, idx) => ({
        section_id: id,
        sort_order: idx + 1,
        updated_at: new Date().toISOString(),
      }));

      for (const row of rows) {
        await upsertSidebarOrder(row);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-section-order'] });
    },
    onError: () => {
      toast.error('Error al guardar el orden del sidebar');
    },
  });

  return {
    sectionOrder: sortedIds,
    isLoading,
    reorder: reorder.mutate,
    isReordering: reorder.isPending,
  };
}
