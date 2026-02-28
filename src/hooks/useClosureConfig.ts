/**
 * useClosureConfig - Configuration hooks for shift closures
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchBrandClosureConfig,
  fetchBranchClosureConfig,
  upsertBranchClosureConfig,
} from '@/services/configService';

/**
 * Get brand-wide closure configuration (categories, types, extras, apps)
 */
export function useBrandClosureConfig() {
  return useQuery({
    queryKey: ['brand-closure-config'],
    queryFn: fetchBrandClosureConfig,
  });
}

/**
 * Get branch-specific configuration (which apps are enabled)
 */
export function useBranchClosureConfig(branchId: string) {
  return useQuery({
    queryKey: ['branch-closure-config', branchId],
    queryFn: () => fetchBranchClosureConfig(branchId),
    enabled: !!branchId,
  });
}

/**
 * Update branch closure config (enable/disable apps)
 */
export function useUpdateBranchClosureConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertBranchClosureConfig,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['branch-closure-config', variables.branchId],
      });
      toast.success('Configuración actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Get apps that are enabled for a branch (for display in closure modal)
 */
export function useEnabledApps(branchId: string) {
  const { data: config } = useBranchClosureConfig(branchId);

  if (!config) return [];

  return config.brandApps.filter((app) => config.enabledApps.get(app.clave) !== false);
}
