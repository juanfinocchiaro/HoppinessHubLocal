import { useQuery } from '@tanstack/react-query';
import {
  fetchCurrentlyWorking,
  fetchPendingItems,
  fetchPosSalesToday,
} from '@/services/managerDashboardService';

export function useCurrentlyWorkingTeam(branchId: string) {
  return useQuery({
    queryKey: ['currently-working', branchId],
    queryFn: () => fetchCurrentlyWorking(branchId),
    refetchInterval: 60000,
  });
}

export function usePendingDashboardItems(branchId: string) {
  return useQuery({
    queryKey: ['pending-items', branchId],
    queryFn: () => fetchPendingItems(branchId),
  });
}

export function usePosSalesToday(branchId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['pos-sales-today', branchId],
    queryFn: () => fetchPosSalesToday(branchId),
    enabled,
    refetchInterval: 60000,
  });
}
