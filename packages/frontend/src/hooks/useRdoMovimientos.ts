import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRdoMovimientos,
  fetchRdoMovimientosByCategory,
  upsertRdoMovimiento,
} from '@/services/rdoService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface RdoMovimientoFormData {
  branch_id: string;
  period: string;
  rdo_category_code: string;
  origen: string;
  amount: number;
  descripcion?: string;
  datos_extra?: Record<string, unknown>;
}

export function useRdoMovimientos(branchId: string, period: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, period],
    queryFn: () => fetchRdoMovimientos(branchId, period),
    enabled: !!user && !!branchId && !!period,
  });
}

export function useRdoMovimientosByCategory(
  branchId: string,
  period: string,
  categoryCode: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, period, categoryCode],
    queryFn: () => fetchRdoMovimientosByCategory(branchId, period, categoryCode),
    enabled: !!user && !!branchId && !!period && !!categoryCode,
  });
}

export function useRdoMovimientoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertManual = useMutation({
    mutationFn: (data: RdoMovimientoFormData) => upsertRdoMovimiento(data, user?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rdo-movimientos'] });
      qc.invalidateQueries({ queryKey: ['rdo-report'] });
      toast.success('Movimiento guardado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { upsertManual };
}
