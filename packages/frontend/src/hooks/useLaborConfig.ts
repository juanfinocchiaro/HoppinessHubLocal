import { useQuery } from '@tanstack/react-query';
import { fromUntyped } from '@/lib/supabase-helpers';

export interface LaborConfig {
  monthly_hours_limit: number;
  daily_hours_limit: number;
  overtime_surcharge_pct: number;
  holiday_surcharge_pct: number;
  late_tolerance_total_min: number;
  late_tolerance_per_entry_min: number | null;
}

const DEFAULTS: LaborConfig = {
  monthly_hours_limit: 190,
  daily_hours_limit: 9,
  overtime_surcharge_pct: 50,
  holiday_surcharge_pct: 100,
  late_tolerance_total_min: 15,
  late_tolerance_per_entry_min: null,
};

/**
 * Fetches labor configuration for a branch.
 * Falls back to global config (branch_id IS NULL), then to hardcoded defaults.
 */
export function useLaborConfig(branchId: string | null) {
  return useQuery<LaborConfig>({
    queryKey: ['labor-config', branchId],
    queryFn: async () => {
      // Try branch-specific first
      if (branchId) {
        const { data: branchConfig } = await fromUntyped('labor_config')
          .select('*')
          .eq('branch_id', branchId)
          .maybeSingle();
        if (branchConfig) return branchConfig as LaborConfig;
      }

      // Fallback to global (branch_id IS NULL)
      const { data: globalConfig } = await fromUntyped('labor_config')
        .select('*')
        .is('branch_id', null)
        .maybeSingle();
      if (globalConfig) return globalConfig as LaborConfig;

      return DEFAULTS;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export { DEFAULTS as LABOR_CONFIG_DEFAULTS };
