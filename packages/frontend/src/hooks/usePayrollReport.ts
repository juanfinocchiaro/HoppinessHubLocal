import { useMemo } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closePayrollMonth,
  fetchEmployeeConsumptions,
  fetchPayrollClosing,
  fetchSalaryAdvances,
  reopenPayrollMonth,
} from '@/services/hrService';
import { useEmployeeTimeData } from './useEmployeeTimeData';
import { useAuth } from './useAuth';

interface UsePayrollReportParams {
  branchId: string;
  year: number;
  month: number; // 0-indexed
}

export function usePayrollReport({ branchId, year, month }: UsePayrollReportParams) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  const startDate = format(monthStart, 'yyyy-MM-dd');
  const endDate = format(monthEnd, 'yyyy-MM-dd');

  const timeData = useEmployeeTimeData({ branchId, year, month });

  const { data: closing, isLoading: closingLoading } = useQuery({
    queryKey: ['payroll-closing', branchId, year, month],
    enabled: !!branchId,
    queryFn: async () => fetchPayrollClosing(branchId, month + 1, year),
  });

  const { data: advances = [], isLoading: advancesLoading } = useQuery({
    queryKey: ['payroll-advances', branchId, year, month],
    enabled: !!branchId,
    queryFn: async () => fetchSalaryAdvances(branchId, monthStart),
  });

  const { data: consumptions = [], isLoading: consumptionsLoading } = useQuery({
    queryKey: ['payroll-consumptions', branchId, year, month],
    enabled: !!branchId,
    queryFn: async () => fetchEmployeeConsumptions(branchId, startDate, endDate),
  });

  const rows = useMemo(() => {
    const advByUser = new Map<string, number>();
    for (const a of advances) {
      advByUser.set(a.user_id, (advByUser.get(a.user_id) ?? 0) + Number(a.amount || 0));
    }
    const consByUser = new Map<string, number>();
    for (const c of consumptions as any[]) {
      consByUser.set(c.user_id, (consByUser.get(c.user_id) ?? 0) + Number(c.amount || 0));
    }

    return timeData.rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      role: r.localRole,
      workedHours: r.workedHoursMonth,
      scheduledHours: r.scheduledHoursMonth,
      overtimeHours: r.labor.totalOvertime,
      justifiedAbsences: r.labor.justifiedAbsences,
      unjustifiedAbsences: r.labor.unjustifiedAbsences,
      hasOpenShift: r.hasUnpairedEntries,
      advances: advByUser.get(r.userId) ?? 0,
      consumptions: consByUser.get(r.userId) ?? 0,
      status: r.hasUnpairedEntries ? 'Revisar' : 'OK',
    }));
  }, [timeData.rows, advances, consumptions]);

  const closeMutation = useMutation({
    mutationFn: async (notes?: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return closePayrollMonth({
        branchId,
        month: month + 1,
        year,
        closedBy: user.id,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-closing', branchId, year, month] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (notes?: string) =>
      reopenPayrollMonth({
        branchId,
        month: month + 1,
        year,
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-closing', branchId, year, month] });
    },
  });

  return {
    rows,
    closing,
    closeMonth: closeMutation.mutateAsync,
    reopenMonth: reopenMutation.mutateAsync,
    isLoading:
      timeData.isLoading || closingLoading || advancesLoading || consumptionsLoading,
    monthStart,
    monthEnd,
  };
}

