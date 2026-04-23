import { useQuery } from '@tanstack/react-query';
import {
  fetchCoachingStats,
  checkHasCoachingThisMonth,
  fetchMyPendingCoachings,
  fetchEmployeeScoreHistory,
} from '@/services/coachingService';
import type { CoachingStats } from '@/services/coachingService';

export type { CoachingStats };

/**
 * Hook para obtener estadísticas de coachings de una sucursal
 */
export function useCoachingStats(branchId: string | null) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['coaching-stats', branchId, currentMonth, currentYear],
    queryFn: (): Promise<CoachingStats> =>
      fetchCoachingStats(branchId!, currentMonth, currentYear),
    enabled: !!branchId,
    refetchInterval: 1000 * 60 * 5,
  });
}

/**
 * Hook para verificar si un empleado tiene coaching este mes
 */
export function useHasCoachingThisMonth(userId: string | null, branchId: string | null) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['has-coaching-this-month', userId, branchId, currentMonth, currentYear],
    queryFn: (): Promise<boolean> =>
      checkHasCoachingThisMonth(userId!, branchId!, currentMonth, currentYear),
    enabled: !!userId && !!branchId,
  });
}

/**
 * Hook para obtener coachings pendientes de confirmación del empleado actual
 */
export function useMyPendingCoachings() {
  return useQuery({
    queryKey: ['my-pending-coachings'],
    queryFn: () => fetchMyPendingCoachings(),
  });
}

/**
 * Hook para obtener historial de scores de un empleado
 */
export function useEmployeeScoreHistory(
  userId: string | null,
  branchId: string | null,
  months: number = 6,
) {
  return useQuery({
    queryKey: ['employee-score-history', userId, branchId, months],
    queryFn: () => fetchEmployeeScoreHistory(userId!, branchId!, months),
    enabled: !!userId && !!branchId,
  });
}
