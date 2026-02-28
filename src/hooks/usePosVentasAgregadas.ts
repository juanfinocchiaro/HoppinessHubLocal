import { useQuery } from '@tanstack/react-query';
import { fetchPosVentasAgregadas } from '@/services/rdoService';
import { useAuth } from './useAuth';

interface VentasAgregadas {
  fc: number;
  ft: number;
  total: number;
}

export function usePosVentasAgregadas(branchId: string, periodo: string, enabled: boolean = false) {
  const { user } = useAuth();

  return useQuery<VentasAgregadas>({
    queryKey: ['pos-ventas-agregadas', branchId, periodo],
    queryFn: () => fetchPosVentasAgregadas(branchId, periodo),
    enabled: !!user && !!branchId && !!periodo && enabled,
  });
}
