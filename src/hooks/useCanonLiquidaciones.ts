import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCanonLiquidaciones,
  createCanonLiquidacion,
  fetchPagosCanon as fetchPagosCanonService,
  fetchPagosCanonFromProveedores as fetchPagosCanonProvService,
  createPagoCanon,
} from '@/services/financialService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CanonLiquidacionFormData, PagoCanonFormData } from '@/types/ventas';

export function useCanonLiquidaciones(branchId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['canon-liquidaciones', branchId],
    queryFn: () => fetchCanonLiquidaciones(branchId),
    enabled: !!user,
  });
}

export function useCanonMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: CanonLiquidacionFormData) => {
      return createCanonLiquidacion(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Liquidación de canon creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}

export function usePagosCanon(canonId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-canon', canonId],
    queryFn: () => fetchPagosCanonService(canonId),
    enabled: !!user && !!canonId,
  });
}

/**
 * Fetch pagos_proveedores for a Hoppiness Club canon invoice
 * identified by branch_id + periodo
 */
export function usePagosCanonFromProveedores(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-canon-prov', branchId, periodo],
    queryFn: () => fetchPagosCanonProvService(branchId, periodo),
    enabled: !!user && !!branchId && !!periodo,
  });
}

export function usePagoCanonMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: PagoCanonFormData) => {
      return createPagoCanon(data, user?.id);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pagos-canon', vars.canon_liquidacion_id] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Pago de canon registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}
