import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { supabase } from '@/services/supabaseClient';

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
      const sb: any = supabase;

      const [entriesRes, schedulesRes, requestsRes] = await Promise.all([
        sb
          .from('clock_entries')
          .select(
            'id, entry_type, photo_url, created_at, user_id, gps_status, is_manual, manual_by, manual_reason, original_created_at, schedule_id, resolved_type, anomaly_type, work_date',
          )
          .eq('branch_id', branchId)
          .eq('user_id', userId)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .order('created_at', { ascending: true }),
        sb
          .from('employee_schedules')
          .select('id, user_id, schedule_date, start_time, end_time, is_day_off')
          .eq('branch_id', branchId)
          .eq('user_id', userId)
          .gte('schedule_date', startDate)
          .lte('schedule_date', endDate),
        sb
          .from('schedule_requests')
          .select('user_id, request_date, request_type, status')
          .eq('branch_id', branchId)
          .eq('user_id', userId)
          .gte('request_date', startDate)
          .lte('request_date', endDate)
          .eq('status', 'approved'),
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (requestsRes.error) throw requestsRes.error;

      return {
        entries: entriesRes.data || [],
        schedules: schedulesRes.data || [],
        requests: requestsRes.data || [],
      };
    },
    staleTime: 60_000,
  });
}
