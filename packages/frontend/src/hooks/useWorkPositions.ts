/**
 * useWorkPositions - Hook para gestionar posiciones de trabajo configurables
 *
 * Las posiciones (cajero, sandwichero, cafetero, etc.) se cargan dinámicamente
 * desde la tabla work_positions en lugar de estar hardcodeadas.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActiveWorkPositions,
  fetchAllWorkPositions,
  createWorkPosition,
  updateWorkPosition,
  deleteWorkPosition,
} from '@/services/hrService';
import { toast } from 'sonner';

export interface WorkPosition {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todas las posiciones activas ordenadas por sort_order
 */
export function useWorkPositions() {
  return useQuery({
    queryKey: ['work-positions'],
    queryFn: async () => {
      return (await fetchActiveWorkPositions()) as WorkPosition[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Obtiene TODAS las posiciones (incluyendo inactivas) para admin
 */
export function useAllWorkPositions() {
  return useQuery({
    queryKey: ['work-positions', 'all'],
    queryFn: async () => {
      return (await fetchAllWorkPositions()) as WorkPosition[];
    },
  });
}

/**
 * Helper para obtener el label de una posición dado su key
 */
export function useWorkPositionLabel(key: string | null | undefined): string {
  const { data: positions } = useWorkPositions();

  if (!key || !positions) return '';

  const position = positions.find((p) => p.key === key);
  return position?.label || key;
}

/**
 * Crear nueva posición (solo superadmin)
 */
export function useCreateWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; label: string; sort_order?: number }) =>
      createWorkPosition(data) as Promise<WorkPosition>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición creada');
    },
    onError: (e: Error) => toast.error(`Error al crear posición: ${e.message}`),
  });
}

/**
 * Actualizar posición existente (solo superadmin)
 */
export function useUpdateWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkPosition> & { id: string }) =>
      updateWorkPosition(id, data) as Promise<WorkPosition>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición actualizada');
    },
    onError: (e: Error) => toast.error(`Error al actualizar posición: ${e.message}`),
  });
}

/**
 * Eliminar posición (solo superadmin) - soft delete cambiando is_active
 */
export function useDeleteWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => deleteWorkPosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición eliminada');
    },
    onError: (e: Error) => toast.error(`Error al eliminar posición: ${e.message}`),
  });
}
