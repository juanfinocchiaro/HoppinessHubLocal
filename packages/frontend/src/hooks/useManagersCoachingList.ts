/**
 * useManagersCoachingList - Hook para obtener lista de encargados con estado de coaching
 *
 * Usado en Mi Marca > Coaching > Encargados para ver todos los encargados de la red
 * y su estado de coaching del mes actual.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchManagerRoles,
  fetchProfilesByIds,
  fetchBranchesByIds,
  fetchCoachingsByUsersAndMonth,
  fetchCoachingScoresByUsersAndMonth,
} from '@/services/coachingService';

export interface ManagerCoachingStatus {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  branchId: string;
  branchName: string;
  hasCoachingThisMonth: boolean;
  latestCoaching: {
    id: string;
    date: string;
    overallScore: number | null;
    acknowledgedAt: string | null;
    evaluatorName: string | null;
  } | null;
  previousScore: number | null;
}

interface UseManagersCoachingListOptions {
  branchId?: string; // Filtro opcional por sucursal
}

export function useManagersCoachingList(options: UseManagersCoachingListOptions = {}) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['managers-coaching-list', options.branchId, currentMonth, currentYear],
    queryFn: async (): Promise<ManagerCoachingStatus[]> => {
      const roles = await fetchManagerRoles(options.branchId);
      if (!roles?.length) return [];

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const profiles = await fetchProfilesByIds(userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const branchIds = [...new Set(roles.map((r) => r.branch_id))];
      const branches = await fetchBranchesByIds(branchIds);
      const branchMap = new Map(branches?.map((b) => [b.id, b]) ?? []);

      const thisMonthCoachings = await fetchCoachingsByUsersAndMonth(userIds, currentMonth, currentYear);

      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const prevMonthCoachings = await fetchCoachingScoresByUsersAndMonth(userIds, prevMonth, prevYear);

      const evaluatorIds = [...new Set(thisMonthCoachings?.map((c) => c.evaluated_by) ?? [])];
      const evaluators = await fetchProfilesByIds(evaluatorIds);
      const evaluatorMap = new Map(evaluators?.map((e) => [e.id, e.full_name]) ?? []);

      // 7. Construir resultado
      return roles.map((role) => {
        const profile = profileMap.get(role.user_id);
        const branch = branchMap.get(role.branch_id);
        const coaching = thisMonthCoachings?.find(
          (c) => c.user_id === role.user_id && c.branch_id === role.branch_id,
        );
        const prevCoaching = prevMonthCoachings?.find(
          (c) => c.user_id === role.user_id && c.branch_id === role.branch_id,
        );

        return {
          userId: role.user_id,
          fullName: profile?.full_name || 'Sin nombre',
          avatarUrl: profile?.avatar_url || null,
          branchId: role.branch_id,
          branchName: branch?.name || 'Sin sucursal',
          hasCoachingThisMonth: !!coaching,
          latestCoaching: coaching
            ? {
                id: coaching.id,
                date: coaching.coaching_date,
                overallScore: coaching.overall_score,
                acknowledgedAt: coaching.acknowledged_at,
                evaluatorName: evaluatorMap.get(coaching.evaluated_by) || null,
              }
            : null,
          previousScore: prevCoaching?.overall_score || null,
        };
      });
    },
    staleTime: 30 * 1000,
  });
}

export default useManagersCoachingList;
