import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CoachingWithDetails, CoachingFormData } from '@/types/coaching';
import {
  fetchCoachings,
  fetchCoachingDetails,
  fetchEmployeeCoachings,
  createCoaching,
  acknowledgeCoaching,
} from '@/services/coachingService';
import type { CoachingFilters } from '@/services/coachingService';

/**
 * Hook para obtener coachings con filtros
 */
export function useCoachings(filters: CoachingFilters = {}) {
  const { branchId, userId } = filters;

  return useQuery({
    queryKey: ['coachings', filters],
    queryFn: (): Promise<CoachingWithDetails[]> => fetchCoachings(filters),
    enabled: !!branchId || !!userId,
  });
}

/**
 * Hook para obtener un coaching específico con todos sus detalles
 */
export function useCoachingDetails(coachingId: string | null) {
  return useQuery({
    queryKey: ['coaching-details', coachingId],
    queryFn: (): Promise<CoachingWithDetails | null> =>
      coachingId ? fetchCoachingDetails(coachingId) : Promise.resolve(null),
    enabled: !!coachingId,
  });
}

/**
 * Hook para obtener coachings de un empleado
 */
export function useEmployeeCoachings(userId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['employee-coachings', userId, branchId],
    queryFn: (): Promise<CoachingWithDetails[]> =>
      userId ? fetchEmployeeCoachings(userId, branchId) : Promise.resolve([]),
    enabled: !!userId,
  });
}

/**
 * Hook para crear un coaching completo
 */
export function useCreateCoaching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: CoachingFormData & { previousActionReview?: string }) =>
      createCoaching(formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachings'] });
      queryClient.invalidateQueries({ queryKey: ['employee-coachings', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['coaching-stats'] });
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications'] });
      toast.success('Coaching guardado correctamente');
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) console.error('Error creating coaching:', error);
      if (error.message?.includes('unique constraint')) {
        toast.error('Ya existe un coaching para este empleado en este mes');
      } else {
        toast.error('Error al guardar el coaching');
      }
    },
  });
}

/**
 * Hook para que el empleado confirme lectura del coaching
 */
export function useAcknowledgeCoaching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ coachingId, notes }: { coachingId: string; notes?: string }) =>
      acknowledgeCoaching(coachingId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['coachings'] });
      queryClient.invalidateQueries({ queryKey: ['employee-coachings', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['coaching-details', data.id] });
      toast.success('Coaching confirmado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error acknowledging coaching:', error);
      toast.error('Error al confirmar el coaching');
    },
  });
}
