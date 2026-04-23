/**
 * useOrderItems - Items de un pedido
 */
import { useQuery } from '@tanstack/react-query';
import { fetchOrderItems } from '@/services/posService';

export function useOrderItems(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pos-order-items', pedidoId],
    queryFn: () => fetchOrderItems(pedidoId!),
    enabled: !!pedidoId,
  });
}
