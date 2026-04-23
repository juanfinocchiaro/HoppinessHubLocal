/**
 * useFrequentItems - Top products sold at a branch (last 30 days)
 */
import { useQuery } from '@tanstack/react-query';
import { fetchFrequentItemSales } from '@/services/posService';

export function useFrequentItems(branchId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['frequent-items', branchId, limit],
    enabled: !!branchId,
    staleTime: 1000 * 60 * 15, // 15 min cache
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const data = await fetchFrequentItemSales(branchId!, thirtyDaysAgo.toISOString());

      if (!data || data.length === 0) return [];

      // Aggregate quantities per item
      const counts = new Map<string, number>();
      for (const row of data) {
        const id = row.item_carta_id;
        if (id) {
          counts.set(id, (counts.get(id) || 0) + (row.cantidad || 1));
        }
      }

      // Sort and take top N
      const topIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      return topIds;
    },
  });
}
