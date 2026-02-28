/**
 * useCashierDiscrepancies - Hooks para discrepancias de cajero (Fase 7)
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchCashierDiscrepancyStats,
  fetchCashierHistory,
  fetchBranchDiscrepancyReport,
} from '@/services/rdoService';

export const discrepancyKeys = {
  all: ['cashier-discrepancies'] as const,
  stats: (userId: string, branchId?: string) =>
    [...discrepancyKeys.all, 'stats', userId, branchId] as const,
  history: (userId: string, branchId?: string) =>
    [...discrepancyKeys.all, 'history', userId, branchId] as const,
  branchReport: (branchId: string, startDate?: string, endDate?: string) =>
    [...discrepancyKeys.all, 'branch-report', branchId, startDate, endDate] as const,
};

export interface CashierStats {
  total_shifts: number;
  perfect_shifts: number;
  precision_pct: number;
  discrepancy_this_month: number;
  discrepancy_total: number;
  last_discrepancy_date: string | null;
  last_discrepancy_amount: number;
}

export interface DiscrepancyEntry {
  id: string;
  shift_id: string;
  branch_id: string;
  user_id: string;
  cash_register_id: string | null;
  expected_amount: number;
  actual_amount: number;
  discrepancy: number;
  shift_date: string;
  notes: string | null;
  created_at: string;
}

export function useCashierStats(userId: string | undefined, branchId?: string) {
  return useQuery({
    queryKey: discrepancyKeys.stats(userId || '', branchId),
    queryFn: async () => {
      if (!userId) return null;
      return fetchCashierDiscrepancyStats(userId, branchId);
    },
    enabled: !!userId,
  });
}

export function useCashierHistory(userId: string | undefined, branchId?: string, limit = 20) {
  return useQuery({
    queryKey: discrepancyKeys.history(userId || '', branchId),
    queryFn: async () => {
      if (!userId) return [];
      return fetchCashierHistory(userId, branchId, limit);
    },
    enabled: !!userId,
  });
}

export interface CashierReportEntry {
  user_id: string;
  full_name: string;
  total_shifts: number;
  perfect_shifts: number;
  total_discrepancy: number;
  precision_pct: number;
}

export function useBranchDiscrepancyReport(
  branchId: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: discrepancyKeys.branchReport(branchId || '', startDate, endDate),
    queryFn: async () => {
      if (!branchId) return [];
      return fetchBranchDiscrepancyReport(branchId, startDate, endDate);
    },
    enabled: !!branchId,
  });
}
