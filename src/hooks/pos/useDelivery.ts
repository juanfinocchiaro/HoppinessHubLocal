/**
 * useDelivery - Cadetes y asignación
 */
import { useQuery } from '@tanstack/react-query';
import { fetchActiveCadetes } from '@/services/posService';

export function useDelivery(branchId: string) {
  return useQuery({
    queryKey: ['pos-delivery', branchId],
    queryFn: () => fetchActiveCadetes(branchId),
    enabled: !!branchId,
  });
}
