/**
 * usePosClosureData - Datos para generar shift_closure desde POS
 */
import { useQuery } from '@tanstack/react-query';
import { fetchClosureOrders } from '@/services/posService';

export function usePosClosureData(branchId: string, fecha: string, turno: string) {
  return useQuery({
    queryKey: ['pos-closure-data', branchId, fecha, turno],
    queryFn: () => fetchClosureOrders(branchId, fecha, turno),
    enabled: !!branchId && !!fecha && !!turno,
  });
}
