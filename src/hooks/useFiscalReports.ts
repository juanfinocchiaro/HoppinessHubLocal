import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFiscalBranchData,
  generateFiscalXReport,
  generateZClosing,
  fetchLastZClosing,
  fetchZClosings,
  generateFiscalAuditReport,
} from '@/services/rdoService';

export function useFiscalBranchData(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-branch-data', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      return fetchFiscalBranchData(branchId);
    },
    enabled: !!branchId,
  });
}

export function useFiscalXReport(branchId: string | undefined) {
  return useMutation({
    mutationFn: (date?: string) => generateFiscalXReport(branchId!, date),
  });
}

export function useGenerateZClosing(branchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => generateZClosing(branchId!, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-z-closings', branchId] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-last-z', branchId] });
    },
  });
}

export function useLastZClosing(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-last-z', branchId],
    queryFn: () => fetchLastZClosing(branchId!),
    enabled: !!branchId,
  });
}

export function useZClosings(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-z-closings', branchId],
    queryFn: () => fetchZClosings(branchId!),
    enabled: !!branchId,
  });
}

export function useFiscalAuditReport(branchId: string | undefined) {
  return useMutation({
    mutationFn: (params: {
      mode: 'date' | 'z';
      fromDate?: string;
      toDate?: string;
      fromZ?: number;
      toZ?: number;
    }) => generateFiscalAuditReport(branchId!, params),
  });
}
