import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/apiClient';
import { fetchLastClockEntry } from '@/services/hrService';
import { useAuth } from './useAuth';

interface TimeStateResponse {
  current_state: string;
  branch_id: string;
}

export function useIsClockedInAtBranch(branchId: string | undefined) {
  const { user } = useAuth();

  const { data: isClockedIn, isLoading } = useQuery({
    queryKey: ['clocked-in-at-branch', user?.id, branchId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !branchId) return false;

      try {
        const ets = await apiGet<TimeStateResponse | null>(
          `/hr/clock/${branchId}/time-state`,
        );

        if (ets) {
          return ets.current_state === 'working' && ets.branch_id === branchId;
        }
      } catch {
        // Fall through to legacy fallback
      }

      const data = await fetchLastClockEntry(user.id, branchId);
      return data?.entry_type === 'clock_in';
    },
    enabled: !!user?.id && !!branchId,
    staleTime: 30 * 1000,
  });

  return { isClockedIn: isClockedIn ?? false, isLoading };
}
