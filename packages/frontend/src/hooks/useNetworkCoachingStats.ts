/**
 * useNetworkCoachingStats - Estadísticas consolidadas de coaching de toda la red
 *
 * Usado en Mi Marca > Coaching > Red para ver métricas globales de
 * todos los coachings de empleados hechos por encargados.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchActiveBranches,
  fetchStaffRolesByBranches,
  fetchCoachingsByBranchesAndMonth,
  fetchProfilesByIds,
  fetchCoachingScoresByBranchesAndMonth,
} from '@/services/coachingService';

export interface BranchCoachingStats {
  branchId: string;
  branchName: string;
  totalEmployees: number;
  coachingsThisMonth: number;
  pendingCoachings: number;
  averageScore: number | null;
  pendingAcknowledgments: number;
}

export interface NetworkCoachingStats {
  totalEmployees: number;
  totalCoachingsThisMonth: number;
  totalPending: number;
  totalPendingAcknowledgments: number;
  networkAverageScore: number | null;
  branchStats: BranchCoachingStats[];
  topPerformers: Array<{
    userId: string;
    fullName: string;
    branchName: string;
    score: number;
  }>;
  lowPerformers: Array<{
    userId: string;
    fullName: string;
    branchName: string;
    score: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    averageScore: number;
    totalCoachings: number;
  }>;
}

export function useNetworkCoachingStats() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['network-coaching-stats', currentMonth, currentYear],
    queryFn: async (): Promise<NetworkCoachingStats> => {
      const branches = await fetchActiveBranches();
      if (!branches?.length) {
        return {
          totalEmployees: 0,
          totalCoachingsThisMonth: 0,
          totalPending: 0,
          totalPendingAcknowledgments: 0,
          networkAverageScore: null,
          branchStats: [],
          topPerformers: [],
          lowPerformers: [],
          monthlyTrend: [],
        };
      }

      const branchIds = branches.map((b) => b.id);
      const branchMap = new Map(branches.map((b) => [b.id, b.name]));

      const staffRoles = await fetchStaffRolesByBranches(branchIds);

      const staffByBranch = new Map<string, string[]>();
      staffRoles?.forEach((r) => {
        const list = staffByBranch.get(r.branch_id) || [];
        list.push(r.user_id);
        staffByBranch.set(r.branch_id, list);
      });

      const thisMonthCoachings = await fetchCoachingsByBranchesAndMonth(branchIds, currentMonth, currentYear);

      const coachingUserIds = [...new Set(thisMonthCoachings?.map((c) => c.user_id) ?? [])];
      const profiles = await fetchProfilesByIds(coachingUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

      // 5. Calcular stats por sucursal
      const branchStats: BranchCoachingStats[] = branches.map((branch) => {
        const staffList = staffByBranch.get(branch.id) || [];
        const branchCoachings = thisMonthCoachings?.filter((c) => c.branch_id === branch.id) || [];
        const evaluatedUserIds = new Set(branchCoachings.map((c) => c.user_id));

        const scores = branchCoachings
          .filter((c) => c.overall_score !== null)
          .map((c) => c.overall_score!);
        const avgScore =
          scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalEmployees: staffList.length,
          coachingsThisMonth: branchCoachings.length,
          pendingCoachings: staffList.filter((id) => !evaluatedUserIds.has(id)).length,
          averageScore: avgScore,
          pendingAcknowledgments: branchCoachings.filter((c) => !c.acknowledged_at).length,
        };
      });

      // 6. Totales globales
      const totalEmployees = branchStats.reduce((sum, b) => sum + b.totalEmployees, 0);
      const totalCoachingsThisMonth = branchStats.reduce((sum, b) => sum + b.coachingsThisMonth, 0);
      const totalPending = branchStats.reduce((sum, b) => sum + b.pendingCoachings, 0);
      const totalPendingAcknowledgments = branchStats.reduce(
        (sum, b) => sum + b.pendingAcknowledgments,
        0,
      );

      const allScores =
        thisMonthCoachings?.filter((c) => c.overall_score !== null).map((c) => c.overall_score!) ||
        [];
      const networkAverageScore =
        allScores.length > 0 ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length : null;

      // 7. Top y low performers
      const scoredCoachings =
        thisMonthCoachings
          ?.filter((c) => c.overall_score !== null)
          .map((c) => ({
            userId: c.user_id,
            fullName: profileMap.get(c.user_id) || 'Sin nombre',
            branchName: branchMap.get(c.branch_id) || 'Sin sucursal',
            score: c.overall_score!,
          })) || [];

      const sortedByScore = [...scoredCoachings].sort((a, b) => b.score - a.score);
      const topPerformers = sortedByScore.slice(0, 5);
      const lowPerformers = sortedByScore.slice(-5).reverse();

      // 8. Tendencia mensual (últimos 6 meses)
      const monthlyTrend: Array<{ month: string; averageScore: number; totalCoachings: number }> =
        [];

      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
        const targetMonth = targetDate.getMonth() + 1;
        const targetYear = targetDate.getFullYear();

        const monthData = await fetchCoachingScoresByBranchesAndMonth(branchIds, targetMonth, targetYear);

        const monthScores =
          monthData?.filter((c) => c.overall_score !== null).map((c) => c.overall_score!) || [];
        const monthAvg =
          monthScores.length > 0
            ? monthScores.reduce((sum, s) => sum + s, 0) / monthScores.length
            : 0;

        monthlyTrend.push({
          month: targetDate.toLocaleString('es-AR', { month: 'short' }),
          averageScore: Number(monthAvg.toFixed(2)),
          totalCoachings: monthData?.length || 0,
        });
      }

      return {
        totalEmployees,
        totalCoachingsThisMonth,
        totalPending,
        totalPendingAcknowledgments,
        networkAverageScore,
        branchStats,
        topPerformers,
        lowPerformers,
        monthlyTrend,
      };
    },
    staleTime: 60 * 1000,
  });
}

export default useNetworkCoachingStats;
