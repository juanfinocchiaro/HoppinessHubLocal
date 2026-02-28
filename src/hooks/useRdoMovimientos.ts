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
  periodo: string;
  rdo_category_code: string;
  origen: string;
  monto: number;
  descripcion?: string;
  datos_extra?: Record<string, unknown>;
}

export function useRdoMovimientos(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, periodo],
    queryFn: () => fetchRdoMovimientos(branchId, periodo),
    enabled: !!user && !!branchId && !!periodo,
  });
}

export function useRdoMovimientosByCategory(
  branchId: string,
  periodo: string,
  categoryCode: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, periodo, categoryCode],
    queryFn: () => fetchRdoMovimientosByCategory(branchId, periodo, categoryCode),
    enabled: !!user && !!branchId && !!periodo && !!categoryCode,
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
