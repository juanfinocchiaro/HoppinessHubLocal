import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchVentasMensuales,
  createVentaMensual,
  updateVentaMensual,
  softDeleteVentaMensual,
} from '@/services/rdoService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface VentaMensualPayload {
  branch_id?: string;
  period?: string;
  total_sales?: number;
  cash?: number;
  notes?: string;
}

export function useVentasMensuales(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ventas-mensuales', branchId],
    queryFn: () => fetchVentasMensuales(branchId),
    enabled: !!user && !!branchId,
  });
}

export function useVentaMensualMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: (data: VentaMensualPayload) => createVentaMensual(data, user?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      qc.invalidateQueries({ queryKey: ['ventas-mensuales-marca'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Ventas del período registradas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VentaMensualPayload }) =>
      updateVentaMensual(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      qc.invalidateQueries({ queryKey: ['ventas-mensuales-marca'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Ventas actualizadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteVentaMensual(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      qc.invalidateQueries({ queryKey: ['ventas-mensuales-marca'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Registro eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, remove };
}
