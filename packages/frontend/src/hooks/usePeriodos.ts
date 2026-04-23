import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPeriodos,
  createPeriodo,
  cerrarPeriodo,
  reabrirPeriodo,
} from '@/services/financialService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePeriodos(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['periodos', branchId],
    queryFn: () => fetchPeriodos(branchId),
    enabled: !!user && !!branchId,
  });
}

export function usePeriodoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async ({ branchId, periodo }: { branchId: string; periodo: string }) => {
      return createPeriodo(branchId, periodo);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const cerrar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      return cerrarPeriodo(id, user?.id, motivo);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período cerrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reabrir = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      return reabrirPeriodo(id, user?.id, motivo);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período reabierto');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, cerrar, reabrir };
}
