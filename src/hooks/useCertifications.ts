import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { EmployeeCertificationWithStation } from '@/types/coaching';
import {
  fetchCertifications,
  fetchEmployeeCertifications,
  fetchTeamCertifications,
  upsertCertification,
  batchUpdateCertifications,
} from '@/services/coachingService';
import type { CertificationFilters, UpsertCertificationData } from '@/services/coachingService';

/**
 * Hook para obtener certificaciones con filtros
 */
export function useCertifications(filters: CertificationFilters = {}) {
  const { branchId, userId } = filters;

  return useQuery({
    queryKey: ['certifications', filters],
    queryFn: (): Promise<EmployeeCertificationWithStation[]> => fetchCertifications(filters),
    enabled: !!branchId || !!userId,
  });
}

/**
 * Hook para obtener certificaciones de un empleado específico
 */
export function useEmployeeCertifications(userId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['employee-certifications', userId, branchId],
    queryFn: (): Promise<EmployeeCertificationWithStation[]> =>
      userId && branchId
        ? fetchEmployeeCertifications(userId, branchId)
        : Promise.resolve([]),
    enabled: !!userId && !!branchId,
  });
}

/**
 * Hook para obtener matriz de certificaciones de un equipo
 */
export function useTeamCertifications(branchId: string | null) {
  return useQuery({
    queryKey: ['team-certifications', branchId],
    queryFn: () =>
      branchId
        ? fetchTeamCertifications(branchId)
        : Promise.resolve({ certifications: [] as EmployeeCertificationWithStation[], byUser: {} }),
    enabled: !!branchId,
  });
}

/**
 * Hook para crear o actualizar una certificación
 */
export function useUpsertCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCertificationData) => upsertCertification(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee-certifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications', variables.branchId] });
      toast.success('Certificación actualizada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error updating certification:', error);
      toast.error('Error al actualizar certificación');
    },
  });
}

/**
 * Hook para actualizar múltiples certificaciones a la vez
 */
export function useBatchUpdateCertifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpsertCertificationData[]) => batchUpdateCertifications(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee-certifications'] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications'] });
      toast.success('Certificaciones actualizadas');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error batch updating certifications:', error);
      toast.error('Error al actualizar certificaciones');
    },
  });
}
