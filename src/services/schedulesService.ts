import { supabase } from './supabaseClient';
import type { ScheduleNotificationInput } from '@/types/schedule';

// ── Schedule CRUD ────────────────────────────────────────────────────

export async function fetchMonthlySchedules(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('branch_id', branchId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchEmployeeMonthSchedule(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('user_id', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchHasPublishedSchedule(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('id, published_at')
    .eq('user_id', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .not('published_at', 'is', null)
    .limit(1);
  if (error) throw error;
  return (data?.length || 0) > 0;
}

export async function deleteUserMonthSchedules(userId: string, startDate: string, endDate: string) {
  const { error } = await supabase
    .from('employee_schedules')
    .delete()
    .eq('user_id', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);
  if (error) throw error;
}

export async function insertScheduleRecords(records: Record<string, unknown>[]) {
  const { data, error } = await supabase.from('employee_schedules').insert(records).select();
  if (error) throw error;
  return data;
}

export async function fetchScheduleById(scheduleId: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateScheduleEntry(scheduleId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUserBranchMonthSchedules(
  userId: string,
  branchId: string,
  startDate: string,
  endDate: string,
) {
  const { error } = await supabase
    .from('employee_schedules')
    .delete()
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);
  if (error) throw error;
}

export async function sendScheduleNotificationComm(input: {
  title: string;
  body: string;
  branch_id: string;
  user_id: string;
  sender_id: string;
}) {
  await supabase.from('communications').insert({
    title: input.title,
    body: input.body,
    type: 'info',
    source_type: 'local',
    source_branch_id: input.branch_id,
    target_user_id: input.user_id,
    is_published: true,
    published_at: new Date().toISOString(),
    created_by: input.sender_id,
  });
}

export async function sendScheduleEmailNotification(input: {
  user_id: string;
  month: number;
  year: number;
  is_modification: boolean;
  modification_reason?: string;
}) {
  await supabase.functions.invoke('send-schedule-notification', { body: input });
}

// ── Schedule Requests ────────────────────────────────────────────────

export async function fetchScheduleRequests(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .select('*')
    .eq('user_id', userId)
    .gte('request_date', startDate)
    .lte('request_date', endDate)
    .order('request_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchMyScheduleRequests(userId: string) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function createScheduleRequest(params: {
  user_id: string;
  branch_id: string;
  request_type: string;
  request_date: string;
  reason: string | null;
  status: string;
  evidence_url: string | null;
  absence_type: string | null;
}) {
  const { error } = await supabase.from('schedule_requests').insert(params);
  if (error) throw error;
}

export async function updateScheduleRequestStatus(
  requestId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Previous Month Pattern ───────────────────────────────────────────

export async function fetchSchedulesByDateRange(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('branch_id', branchId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);
  if (error) throw error;
  return data || [];
}

// ── Shift Closures ───────────────────────────────────────────────────

export async function fetchShiftClosuresByDate(branchId: string, dateStr: string) {
  const { data, error } = await supabase
    .from('shift_closures')
    .select('*')
    .eq('branch_id', branchId)
    .eq('fecha', dateStr)
    .order('turno');
  if (error) throw error;
  return data || [];
}

export async function fetchShiftClosuresByDateRange(branchId: string, fromStr: string, toStr: string) {
  const { data, error } = await supabase
    .from('shift_closures')
    .select('*')
    .eq('branch_id', branchId)
    .gte('fecha', fromStr)
    .lte('fecha', toStr)
    .order('fecha', { ascending: false })
    .order('turno');
  if (error) throw error;
  return data || [];
}

export async function fetchShiftClosureSingle(branchId: string, fecha: string, turno: string) {
  const { data, error } = await supabase
    .from('shift_closures')
    .select('*')
    .eq('branch_id', branchId)
    .eq('fecha', fecha)
    .eq('turno', turno)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAllShiftClosuresInRange(fromStr: string, toStr: string) {
  const { data, error } = await supabase
    .from('shift_closures')
    .select('*')
    .gte('fecha', fromStr)
    .lte('fecha', toStr);
  if (error) throw error;
  return data || [];
}

export async function fetchAllBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, slug')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchActiveBranchShifts() {
  const { data, error } = await supabase
    .from('branch_shifts')
    .select('branch_id, name')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function upsertShiftClosure(closureData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('shift_closures')
    .upsert(closureData, { onConflict: 'branch_id,fecha,turno' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchEnabledBranchShifts(branchId: string) {
  const { data, error } = await supabase
    .from('branch_shifts')
    .select('id, name, start_time, end_time, is_active, sort_order')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

// ── Shift Status ─────────────────────────────────────────────────────

export async function fetchVentasRegisters(branchId: string) {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('id')
    .eq('branch_id', branchId)
    .eq('register_type', 'ventas');
  if (error) throw error;
  return data || [];
}

export async function fetchOpenCashShift(branchId: string, ventasIds: string[]) {
  const { data } = await supabase
    .from('cash_register_shifts')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .in('cash_register_id', ventasIds)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export async function sendScheduleNotification(input: ScheduleNotificationInput): Promise<void> {
  const monthName = monthNames[input.month - 1];

  if (input.notify_communication) {
    const title = input.is_modification
      ? `📅 Tu encargado modificó tu horario de ${monthName}`
      : `📅 Tu horario de ${monthName} ya está disponible`;

    const body = input.is_modification
      ? `Se realizó una modificación sobre tu horario${input.modified_date ? ` del día ${input.modified_date}` : ''}. ${input.modification_reason ? `Motivo: ${input.modification_reason}` : ''} Revisalo en 'Mi Horario'.`
      : `Tu encargado publicó el horario del mes. Revisalo en 'Mi Horario'.`;

    try {
      await supabase.from('communications').insert({
        title,
        body,
        type: input.is_modification ? 'warning' : 'info',
        source_type: 'local',
        source_branch_id: input.branch_id,
        target_branch_ids: [input.branch_id],
        target_roles: null,
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: input.sender_id,
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create communication:', error);
    }
  }

  if (input.notify_email) {
    try {
      await supabase.functions.invoke('send-schedule-notification', {
        body: {
          user_id: input.user_id,
          month: input.month,
          year: input.year,
          is_modification: input.is_modification,
          modification_reason: input.modification_reason,
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to send email notification:', error);
    }
  }
}

// ── Schedule Requests (with profiles) ────────────────────────────────

export async function fetchScheduleRequestsWithProfiles(branchId: string) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .select(
      'id, user_id, request_type, request_date, reason, status, created_at, responded_at, response_note, evidence_url, absence_type',
    )
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((r) => ({ ...r, profile: profileMap.get(r.user_id) }));
  }

  return data || [];
}

export async function fetchPendingScheduleRequestsWithProfiles(branchId: string) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .select(
      'id, user_id, request_type, request_date, reason, status, created_at, evidence_url, absence_type',
    )
    .eq('branch_id', branchId)
    .eq('status', 'pending')
    .order('request_date', { ascending: true });

  if (error) throw error;

  if (data && data.length > 0) {
    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    return data.map((r) => ({ ...r, profile: profileMap.get(r.user_id) }));
  }

  return data || [];
}

export async function respondToScheduleRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
  note?: string,
) {
  const { error } = await supabase
    .from('schedule_requests')
    .update({
      status,
      response_note: note || null,
      responded_by: respondedBy,
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw error;
}

// ── Employee Schedule (branch-scoped) ────────────────────────────────

export async function fetchEmployeeScheduleForBranch(
  userId: string,
  branchId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ── My Schedules (employee view) ─────────────────────────────────────

export async function fetchMySchedules(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('id, schedule_date, start_time, end_time, is_day_off, work_position')
    .eq('user_id', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ── Batch Schedule Operations ────────────────────────────────────────

export async function upsertSchedulesBatch(records: Record<string, unknown>[]) {
  const { error } = await supabase.from('employee_schedules').upsert(records, {
    onConflict: 'user_id,schedule_date',
    ignoreDuplicates: false,
  });
  if (error) throw error;
}

export async function deleteScheduleEntriesBatch(
  entries: Array<{ userId: string; date: string; branchId: string }>,
) {
  const results = await Promise.all(
    entries.map((record) =>
      supabase
        .from('employee_schedules')
        .delete()
        .eq('user_id', record.userId)
        .eq('schedule_date', record.date)
        .eq('branch_id', record.branchId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function sendBulkScheduleNotifications(
  employees: Array<{ id: string; name: string }>,
  params: Omit<ScheduleNotificationInput, 'user_id'>,
): Promise<void> {
  if (params.notify_communication) {
    const monthName = monthNames[params.month - 1];
    const title = params.is_modification
      ? `📅 Tu encargado modificó los horarios de ${monthName}`
      : `📅 Los horarios de ${monthName} ya están disponibles`;

    const body = params.is_modification
      ? `Se realizó una modificación sobre los horarios del equipo${params.modified_date ? ` (${params.modified_date})` : ''}. ${params.modification_reason ? `Motivo: ${params.modification_reason}` : ''} Revisá tu horario en 'Mi Cuenta'.`
      : `Se publicaron los horarios del mes. Revisá tu horario en 'Mi Cuenta'.`;

    try {
      await supabase.from('communications').insert({
        title,
        body,
        type: params.is_modification ? 'warning' : 'info',
        source_type: 'local',
        source_branch_id: params.branch_id,
        target_branch_ids: [params.branch_id],
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: params.sender_id,
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create bulk communication:', error);
    }
  }

  if (params.notify_email) {
    for (const employee of employees) {
      try {
        await supabase.functions.invoke('send-schedule-notification', {
          body: {
            user_id: employee.id,
            month: params.month,
            year: params.year,
            is_modification: params.is_modification,
            modification_reason: params.modification_reason,
          },
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`Failed to send email to ${employee.name}:`, error);
        }
      }
    }
  }
}
