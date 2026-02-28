/**
 * useIsClockedInAtBranch - Reads employee_time_state to determine
 * if the user is currently clocked in at a branch.
 * Falls back to legacy last-entry check when the state table has no row.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { fetchLastClockEntry } from '@/services/hrService';
import { useAuth } from './useAuth';

export function useIsClockedInAtBranch(branchId: string | undefined) {
  const { user } = useAuth();

  const { data: isClockedIn, isLoading } = useQuery({
    queryKey: ['clocked-in-at-branch', user?.id, branchId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !branchId) return false;

      const { data: ets } = await supabase
        .from('employee_time_state')
        .select('current_state, branch_id')
        .eq('employee_id', user.id)
        .maybeSingle();

      if (ets) {
        return ets.current_state === 'working' && ets.branch_id === branchId;
      }

      // Legacy fallback
      const data = await fetchLastClockEntry(user.id, branchId);
      return data?.entry_type === 'clock_in';
    },
    enabled: !!user?.id && !!branchId,
    staleTime: 30 * 1000,
  });

  return { isClockedIn: isClockedIn ?? false, isLoading };
}
