/**
 * useRegister - Turnos de caja
 */
import { useQuery } from '@tanstack/react-query';
import { fetchOpenRegister } from '@/services/posService';

export function useRegister(branchId: string) {
  return useQuery({
    queryKey: ['pos-register', branchId],
    queryFn: () => fetchOpenRegister(branchId),
    enabled: !!branchId,
  });
}
