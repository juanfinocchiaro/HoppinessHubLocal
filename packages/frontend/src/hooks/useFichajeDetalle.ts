import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { apiGet } from '@/services/apiClient';

interface MonthData {
  entries: {
    id: string;
    entry_type: string;
    photo_url: string | null;
    created_at: string;
    user_id: string;
    gps_status: string | null;
    is_manual: boolean | null;
    manual_by: string | null;
    manual_reason: string | null;
    original_created_at: string | null;
    schedule_id: string | null;
    resolved_type: string | null;
    anomaly_type: string | null;
    work_date: string;
  }[];
  schedules: {
    id: string;
    user_id: string;
    schedule_date: string;
    start_time: string | null;
    end_time: string | null;
    is_day_off: boolean | null;
  }[];
  requests: {
    user_id: string;
    request_date: string;
    request_type: string;
    status: string;
  }[];
}

export function useFichajeDetalle(
  branchId: string,
  userId: string,
  referenceDate: Date,
) {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  return useQuery<MonthData>({
    queryKey: [
      'expanded-month-history',
      branchId,
      userId,
      format(monthStart, 'yyyy-MM'),
    ],
    queryFn: async () => {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');

      return apiGet<MonthData>(`/hr/clock/${branchId}/detail`, {
        userId,
        startDate,
        endDate,
      });
    },
    staleTime: 60_000,
  });
}
