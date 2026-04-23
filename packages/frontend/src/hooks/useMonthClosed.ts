import { useQuery } from '@tanstack/react-query';
import { fetchPayrollClosing } from '@/services/hrService';

export function useMonthClosed(branchId: string, year: number, month: number) {
  const { data: closing } = useQuery({
    queryKey: ['payroll-closing', branchId, year, month],
    queryFn: () => fetchPayrollClosing(branchId, month + 1, year),
    enabled: !!branchId,
    staleTime: 60_000,
  });

  const isClosed = !!(closing && !closing.reopened_at);

  return { isClosed, closing };
}
