import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchSocios,
  fetchMovimientosSocio,
  createSocio,
  updateSocio,
  createMovimientoSocio,
} from '@/services/financialService';

export interface SocioFormData {
  branch_id: string;
  name: string;
  cuit?: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  ownership_percentage: number;
  fecha_ingreso: string;
  limite_retiro_mensual?: number | null;
}

export interface MovimientoSocioFormData {
  branch_id: string;
  socio_id: string;
  tipo: string;
  amount: number;
  date: string;
  period?: string;
  notes?: string;
}

export const TIPO_MOVIMIENTO_OPTIONS = [
  { value: 'retiro', label: 'Retiro' },
  { value: 'aporte', label: 'Aporte' },
  { value: 'distribucion', label: 'Distribución de Utilidades' },
  { value: 'prestamo', label: 'Préstamo' },
  { value: 'devolucion_prestamo', label: 'Devolución de Préstamo' },
  { value: 'ajuste', label: 'Ajuste' },
] as const;

export function useSocios(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['socios', branchId],
    queryFn: () => fetchSocios(branchId),
    enabled: !!user && !!branchId,
  });
}

export function useMovimientosSocio(branchId: string, socioId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movimientos_socio', branchId, socioId],
    queryFn: () => fetchMovimientosSocio(branchId, socioId),
    enabled: !!user && !!branchId,
  });
}

export function useSocioMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createSocioMut = useMutation({
    mutationFn: async (data: SocioFormData) => {
      return createSocio(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Socio creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateSocioMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SocioFormData> }) => {
      await updateSocio(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Socio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const createMovimientoMut = useMutation({
    mutationFn: async (data: MovimientoSocioFormData) => {
      return createMovimientoSocio(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos_socio'] });
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Movimiento registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { createSocio: createSocioMut, updateSocio: updateSocioMut, createMovimiento: createMovimientoMut };
}
