import { useQuery } from '@tanstack/react-query';
import {
  fetchBranchTeamData,
  fetchEmployeeData as fetchEmployeeDataService,
  fetchEmployeeWarnings,
} from '@/services/staffService';
import type { TeamMember, EmployeeData, Warning, NoteEntry } from './types';
import type { LocalRole } from '@/hooks/usePermissions';

interface UseTeamDataOptions {
  /** Exclude franchise owners (franquiciado) from team list - useful for schedules/HR operations */
  excludeOwners?: boolean;
}

export function useTeamData(branchId: string | undefined, options?: UseTeamDataOptions) {
  const { excludeOwners = false } = options || {};

  // Fetch team members
  const {
    data: team = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['branch-team', branchId, excludeOwners],
    queryFn: async () => {
      if (!branchId) return [];

      const { roles, profiles, employeeData, clockEntries, warnings } =
        await fetchBranchTeamData(branchId, excludeOwners);

      if (!roles.length) return [];

      const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
      const employeeDataMap = new Map(employeeData.map((e: any) => [e.user_id, e]));

      const hoursMap = new Map<string, number>();
      const userEntriesMap = new Map<string, Array<{ type: string; time: Date }>>();

      clockEntries.forEach((e: any) => {
        const existing = userEntriesMap.get(e.user_id) || [];
        existing.push({ type: e.entry_type, time: new Date(e.created_at) });
        userEntriesMap.set(e.user_id, existing);
      });

      // Calculate hours for each user
      userEntriesMap.forEach((entries, userId) => {
        let totalHours = 0;
        let lastClockIn: Date | null = null;

        entries.sort((a, b) => a.time.getTime() - b.time.getTime());

        for (const entry of entries) {
          if (entry.type === 'clock_in') {
            lastClockIn = entry.time;
          } else if (entry.type === 'clock_out' && lastClockIn) {
            totalHours += (entry.time.getTime() - lastClockIn.getTime()) / (1000 * 60 * 60);
            lastClockIn = null;
          }
        }

        hoursMap.set(userId, totalHours);
      });

      const lastClockInMap = new Map<string, { time: string; isWorking: boolean }>();
      const sortedEntries = [...clockEntries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      const processedUsers = new Set<string>();
      sortedEntries.forEach((e: any) => {
        if (!processedUsers.has(e.user_id)) {
          processedUsers.add(e.user_id);
          lastClockInMap.set(e.user_id, {
            time: e.created_at,
            isWorking: e.entry_type === 'clock_in',
          });
        }
      });

      const warningsMap = new Map<string, number>();
      warnings.forEach((w: any) => {
        warningsMap.set(w.user_id, (warningsMap.get(w.user_id) || 0) + 1);
      });

      return roles
        .map((role) => {
          const profile = profilesMap.get(role.user_id);
          const empData = employeeDataMap.get(role.user_id);
          const lastClock = lastClockInMap.get(role.user_id);

          return {
            id: role.user_id,
            user_id: role.user_id,
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            phone: profile?.phone || null,
            local_role: role.local_role as LocalRole,
            default_position: (role as any).default_position || null,
            hire_date: role.created_at,
            hours_this_month: hoursMap.get(role.user_id) || 0,
            monthly_hours_target: empData?.monthly_hours_target || 160,
            last_clock_in: lastClock?.time || null,
            is_working: lastClock?.isWorking || false,
            active_warnings: warningsMap.get(role.user_id) || 0,
            role_id: role.id,
          } as TeamMember;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });

  return { team, loading: isLoading, refetch };
}

export function useEmployeeDetails(userId: string | undefined, branchId: string | undefined) {
  const { data: employeeData } = useQuery({
    queryKey: ['employee-data', userId, branchId],
    queryFn: async () => {
      if (!userId || !branchId) return null;

      const data = await fetchEmployeeDataService(userId, branchId);
      if (!data) return null;
      return {
        ...data,
        internal_notes: (data.internal_notes as unknown as NoteEntry[]) || [],
      } as EmployeeData;
    },
    enabled: !!userId && !!branchId,
    staleTime: 30 * 1000,
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ['employee-warnings', userId, branchId],
    queryFn: async () => {
      if (!userId || !branchId) return [];
      return (await fetchEmployeeWarnings(userId, branchId)) as Warning[];
    },
    enabled: !!userId && !!branchId,
    staleTime: 30 * 1000,
  });

  return { employeeData, warnings };
}
