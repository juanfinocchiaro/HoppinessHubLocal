import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchConsumosManuales,
  createConsumoManual,
  updateConsumoManual,
  softDeleteConsumoManual,
} from '@/services/financialService';

export interface ConsumoManualFormData {
  branch_id: string;
  periodo: string;
  categoria_pl: string;
  monto_consumido: number;
  tipo?: string;
  observaciones?: string;
}

export const CATEGORIA_PL_OPTIONS = [
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'descartables', label: 'Descartables' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'varios', label: 'Varios' },
] as const;

export const TIPO_CONSUMO_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'merma', label: 'Merma' },
  { value: 'calculado', label: 'Desde stock (cierre)' },
] as const;

export function useConsumosManuales(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['consumos_manuales', branchId, periodo],
    queryFn: () => fetchConsumosManuales(branchId, periodo),
    enabled: !!user && !!branchId,
  });
}

export function useConsumoManualMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: ConsumoManualFormData) => {
      return createConsumoManual(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConsumoManualFormData> }) => {
      await updateConsumoManual(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await softDeleteConsumoManual(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
