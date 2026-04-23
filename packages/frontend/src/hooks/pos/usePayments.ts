/**
 * usePayments - Pagos de pedidos
 */
import { useQuery } from '@tanstack/react-query';
import { fetchPayments } from '@/services/posService';

export function usePayments(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pos-payments', pedidoId],
    queryFn: () => fetchPayments(pedidoId!),
    enabled: !!pedidoId,
  });
}
