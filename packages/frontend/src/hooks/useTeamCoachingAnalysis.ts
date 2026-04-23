/**
 * Hook para análisis comparativo del equipo de coaching
 * Mejora #2: Vista Comparativa en Mi Local
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchBranchCoachingsLast6Months,
  fetchProfilesByIds,
  fetchStationScoresByBranch,
  fetchActiveWorkStations,
  fetchCompetencyScoresByBranch,
  fetchActiveGeneralCompetencies,
  fetchEmployeeCoachingComparison,
} from '@/services/coachingService';

interface EmployeeScore {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  avgScore: number;
  coachingsCount: number;
  lastScore: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
  trendValue: number;
}

interface CompetencyAnalysis {
  competencyId: string;
  competencyName: string;
  avgScore: number;
  lowestEmployees: { userId: string; name: string; score: number }[];
}

interface StationChampion {
  stationId: string;
  stationName: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  avgScore: number;
}

interface TrendAlert {
  userId: string;
  fullName: string;
  lastThreeScores: number[];
  trend: 'declining' | 'stagnant';
}

export interface TeamAnalysisData {
  ranking: EmployeeScore[];
  competencyAnalysis: CompetencyAnalysis[];
  stationChampions: StationChampion[];
  trendAlerts: TrendAlert[];
  teamAverageScore: number | null;
}

export function useTeamCoachingAnalysis(branchId: string | null) {
  return useQuery({
    queryKey: ['team-coaching-analysis', branchId],
    queryFn: async (): Promise<TeamAnalysisData> => {
      if (!branchId) {
        return {
          ranking: [],
          competencyAnalysis: [],
          stationChampions: [],
          trendAlerts: [],
          teamAverageScore: null,
        };
      }

      const coachings = await fetchBranchCoachingsLast6Months(branchId);
      if (!coachings?.length) {
        return {
          ranking: [],
          competencyAnalysis: [],
          stationChampions: [],
          trendAlerts: [],
          teamAverageScore: null,
        };
      }

      const userIds = [...new Set(coachings.map((c) => c.user_id))];

      const profiles = await fetchProfilesByIds(userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // 2. Calculate ranking by average score
      const userScores = new Map<string, number[]>();
      coachings.forEach((c) => {
        if (c.overall_score !== null) {
          const scores = userScores.get(c.user_id) || [];
          scores.push(c.overall_score);
          userScores.set(c.user_id, scores);
        }
      });

      const ranking: EmployeeScore[] = Array.from(userScores.entries())
        .map(([userId, scores]) => {
          const profile = profileMap.get(userId);
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const lastScore = scores[0] || null;
          const previousScore = scores[1] || null;

          let trend: 'up' | 'down' | 'stable' | 'new' = 'new';
          let trendValue = 0;

          if (previousScore !== null && lastScore !== null) {
            trendValue = lastScore - previousScore;
            if (trendValue > 0.1) trend = 'up';
            else if (trendValue < -0.1) trend = 'down';
            else trend = 'stable';
          }

          return {
            userId,
            fullName: profile?.full_name || 'Sin nombre',
            avatarUrl: profile?.avatar_url || null,
            avgScore: Number(avgScore.toFixed(2)),
            coachingsCount: scores.length,
            lastScore,
            trend,
            trendValue: Number(trendValue.toFixed(2)),
          };
        })
        .sort((a, b) => b.avgScore - a.avgScore);

      // 3. Calculate team average
      const allScores = coachings
        .filter((c) => c.overall_score !== null)
        .map((c) => c.overall_score as number);
      const teamAverageScore =
        allScores.length > 0
          ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2))
          : null;

      const stationScores = await fetchStationScoresByBranch(branchId);

      const stations = await fetchActiveWorkStations();
      const stationMap = new Map(stations?.map((s) => [s.id, s]) || []);

      // Calculate champions per station
      const stationUserScores = new Map<string, Map<string, number[]>>();
      stationScores?.forEach((ss) => {
        const stationId = ss.station_id;
        const coaching = ss.coaching as unknown as { user_id: string; branch_id: string };
        const userId = coaching.user_id;

        if (!stationUserScores.has(stationId)) {
          stationUserScores.set(stationId, new Map());
        }
        const userMap = stationUserScores.get(stationId)!;
        const scores = userMap.get(userId) || [];
        scores.push(ss.score);
        userMap.set(userId, scores);
      });

      const stationChampions: StationChampion[] = [];
      stationUserScores.forEach((userMap, stationId) => {
        let champion = { userId: '', avgScore: 0 };
        userMap.forEach((scores, userId) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg > champion.avgScore) {
            champion = { userId, avgScore: avg };
          }
        });

        if (champion.userId) {
          const profile = profileMap.get(champion.userId);
          const station = stationMap.get(stationId);
          if (station) {
            stationChampions.push({
              stationId,
              stationName: station.name,
              userId: champion.userId,
              fullName: profile?.full_name || 'Sin nombre',
              avatarUrl: profile?.avatar_url || null,
              avgScore: Number(champion.avgScore.toFixed(2)),
            });
          }
        }
      });

      // 5. Detect trend alerts (declining performance)
      const trendAlerts: TrendAlert[] = [];
      userScores.forEach((scores, userId) => {
        if (scores.length >= 3) {
          const lastThree = scores.slice(0, 3);
          const isDecreasing = lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2];
          const isStagnantLow = lastThree.every((s) => s < 2.5);

          if (isDecreasing || isStagnantLow) {
            const profile = profileMap.get(userId);
            trendAlerts.push({
              userId,
              fullName: profile?.full_name || 'Sin nombre',
              lastThreeScores: lastThree,
              trend: isDecreasing ? 'declining' : 'stagnant',
            });
          }
        }
      });

      const competencyScores = await fetchCompetencyScoresByBranch(branchId);

      const competencies = await fetchActiveGeneralCompetencies();
      const compMap = new Map(competencies?.map((c) => [c.id, c]) || []);

      const competencyUserScores = new Map<
        string,
        { scores: number[]; users: Map<string, number> }
      >();
      competencyScores?.forEach((cs) => {
        const coaching = cs.coaching as unknown as { user_id: string; branch_id: string };
        if (!competencyUserScores.has(cs.competency_id)) {
          competencyUserScores.set(cs.competency_id, { scores: [], users: new Map() });
        }
        const data = competencyUserScores.get(cs.competency_id)!;
        data.scores.push(cs.score);

        // Keep track of lowest score per user
        const currentUserScore = data.users.get(coaching.user_id) ?? 5;
        if (cs.score < currentUserScore) {
          data.users.set(coaching.user_id, cs.score);
        }
      });

      const competencyAnalysis: CompetencyAnalysis[] = Array.from(competencyUserScores.entries())
        .map(([compId, data]) => {
          const comp = compMap.get(compId);
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

          // Get 3 lowest performers for this competency
          const lowestEmployees = Array.from(data.users.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .filter(([_, score]) => score < 3)
            .map(([userId, score]) => ({
              userId,
              name: profileMap.get(userId)?.full_name || 'Sin nombre',
              score,
            }));

          return {
            competencyId: compId,
            competencyName: comp?.name || 'Competencia',
            avgScore: Number(avgScore.toFixed(2)),
            lowestEmployees,
          };
        })
        .sort((a, b) => a.avgScore - b.avgScore);

      return {
        ranking,
        competencyAnalysis,
        stationChampions,
        trendAlerts,
        teamAverageScore,
      };
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para obtener historial de un empleado con comparación con el equipo
 */
export function useEmployeeVsTeam(userId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['employee-vs-team', userId, branchId],
    queryFn: async () => {
      if (!userId || !branchId) return null;

      const { myScores, allScores } = await fetchEmployeeCoachingComparison(userId, branchId);

      // Group team scores by month
      const teamByMonth = new Map<string, number[]>();
      allScores?.forEach((s) => {
        if (s.user_id !== userId) {
          const key = `${s.coaching_year}-${s.coaching_month}`;
          const arr = teamByMonth.get(key) || [];
          arr.push(s.overall_score as number);
          teamByMonth.set(key, arr);
        }
      });

      // Build comparison data
      const comparison =
        myScores?.map((s) => {
          const key = `${s.coaching_year}-${s.coaching_month}`;
          const teamScores = teamByMonth.get(key) || [];
          const teamAvg =
            teamScores.length > 0
              ? teamScores.reduce((a, b) => a + b, 0) / teamScores.length
              : null;

          return {
            month: s.coaching_month,
            year: s.coaching_year,
            myScore: s.overall_score,
            teamAvg: teamAvg ? Number(teamAvg.toFixed(2)) : null,
          };
        }) || [];

      // Calculate improvement badges
      let consecutiveImprovements = 0;
      for (let i = 1; i < (myScores?.length || 0); i++) {
        const current = myScores?.[i].overall_score ?? 0;
        const previous = myScores?.[i - 1].overall_score ?? 0;
        if (current > previous) {
          consecutiveImprovements++;
        } else {
          break;
        }
      }

      const badges: string[] = [];
      if (consecutiveImprovements >= 3) badges.push('🔥 En racha');
      if (consecutiveImprovements >= 2) badges.push('📈 Mejorando');

      const lastScore = myScores?.[myScores.length - 1]?.overall_score;
      if (lastScore && lastScore >= 3.5) badges.push('⭐ Alto rendimiento');

      return {
        comparison,
        badges,
        consecutiveImprovements,
      };
    },
    enabled: !!userId && !!branchId,
  });
}
