import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/services/apiClient';
import { fetchBranchSlugAndName } from '@/services/configService';
import { toast } from 'sonner';
import type { BranchWebappAvailabilityRow } from '@/components/local/webapp/webappConfigTypes';

export function useWebappConfigAdmin(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config-admin', branchId],
    queryFn: async () => {
      return apiGet<Record<string, unknown> | null>(
        `/branches/${branchId}/config/webapp`,
      );
    },
    enabled: !!branchId,
  });
}

export function useBranchSlug(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-slug', branchId],
    queryFn: () => fetchBranchSlugAndName(branchId!),
    enabled: !!branchId,
  });
}

export function useBranchWebappAvailability(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-webapp-availability', branchId],
    queryFn: async () => {
      return apiGet<BranchWebappAvailabilityRow[]>(
        `/branches/${branchId}/webapp/availability`,
      );
    },
    enabled: !!branchId,
  });
}

export function useUpdateBranchWebappAvailability(branchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      localDisponibleWebapp?: boolean;
      outOfStock?: boolean;
    }) => {
      await apiPut(`/branches/${branchId}/webapp/availability/${params.itemId}`, {
        localDisponibleWebapp: params.localDisponibleWebapp,
        outOfStock: params.outOfStock,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-webapp-availability', branchId] });
      qc.invalidateQueries({ queryKey: ['webapp-menu-items', branchId] });
      qc.invalidateQueries({ queryKey: ['items-carta', branchId] });
    },
    onError: (err: Error) => {
      toast.error('No se pudo actualizar la disponibilidad', { description: err.message });
    },
  });
}
