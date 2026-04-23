import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchInversiones,
  createInversion,
  updateInversion,
  softDeleteInversion,
} from '@/services/financialService';

export interface InversionFormData {
  branch_id: string;
  descripcion: string;
  tipo_inversion: string;
  monto_total: number;
  date: string;
  period: string;
  vida_util_meses?: number | null;
  estado: string;
  cuotas_total?: number | null;
  cuotas_pagadas?: number;
  notes?: string;
}

export const TIPO_INVERSION_OPTIONS = [
  { value: 'equipamiento', label: 'Equipamiento' },
  { value: 'mobiliario', label: 'Mobiliario' },
  { value: 'obra_civil', label: 'Obra Civil' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'franquicia', label: 'Franquicia' },
  { value: 'garantia', label: 'Garantía' },
  { value: 'otro', label: 'Otro' },
] as const;

export const ESTADO_INVERSION_OPTIONS = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'financiado', label: 'Financiado' },
] as const;

export function useInversiones(branchId: string, period?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inversiones', branchId, period],
    queryFn: () => fetchInversiones(branchId, period),
    enabled: !!user && !!branchId,
  });
}

export function useInversionMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: InversionFormData) => {
      return createInversion(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión registrada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InversionFormData> }) => {
      await updateInversion(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await softDeleteInversion(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
