import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchConceptosServicio,
  createConceptoServicio,
  updateConceptoServicio,
  softDeleteConceptoServicio,
} from '@/services/financialService';

export interface ConceptoServicioFormData {
  nombre: string;
  descripcion?: string;
  categoria_gasto?: string;
  subcategoria?: string;
  tipo: string;
  es_calculado?: boolean;
  formula_calculo?: Record<string, unknown>;
  proveedor_id?: string;
  periodicidad?: string;
  rdo_category_code?: string;
  visible_local?: boolean;
}

export function useConceptosServicio() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conceptos-servicio'],
    queryFn: () => fetchConceptosServicio(),
    enabled: !!user,
  });
}

export function useConceptoServicioMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: ConceptoServicioFormData) => {
      return createConceptoServicio(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConceptoServicioFormData> }) => {
      await updateConceptoServicio(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await softDeleteConceptoServicio(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
