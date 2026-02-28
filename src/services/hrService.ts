import { supabase } from './supabaseClient';

// ── Clock Entries / Labor ────────────────────────────────────────────

export async function fetchClockEntries(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('id, user_id, entry_type, created_at, branch_id, schedule_id, work_date')
    .eq('branch_id', branchId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchSpecialDays(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('special_days')
    .select('day_date')
    .is('branch_id', null)
    .gte('day_date', startDate)
    .lte('day_date', endDate);
  if (error) throw error;
  return (data || []).map((h) => h.day_date);
}

export async function fetchBranchSchedules(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('user_id, schedule_date, is_day_off')
    .eq('branch_id', branchId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);
  if (error) throw error;
  return data || [];
}

export async function fetchAbsences(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('schedule_requests')
    .select('user_id, request_date, request_type, status')
    .eq('branch_id', branchId)
    .gte('request_date', startDate)
    .lte('request_date', endDate)
    .in('request_type', ['absence', 'sick_leave', 'justified_absence', 'unjustified_absence']);
  if (error) return [];
  return data || [];
}

export async function fetchLaborUsersData(branchId: string, userIds: string[]) {
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const { data: roles, error: rolesError } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .in('user_id', userIds)
    .eq('is_active', true);
  if (rolesError) throw rolesError;

  const { data: employeeData } = await supabase
    .from('employee_data')
    .select('user_id, cuil, hire_date, registered_hours')
    .eq('branch_id', branchId)
    .in('user_id', userIds);

  return (profiles || []).map((p) => {
    const role = roles?.find((r) => r.user_id === p.id);
    const empData = employeeData?.find((e) => e.user_id === p.id);
    return {
      user_id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      local_role: role?.local_role || null,
      cuil: empData?.cuil || null,
      hire_date: empData?.hire_date || null,
      registered_hours: empData?.registered_hours ?? null,
    };
  });
}

export async function fetchLastClockEntry(userId: string, branchId: string) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('entry_type')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Salary Advances ─────────────────────────────────────────────────

export async function fetchSalaryAdvances(branchId: string, selectedMonth?: Date) {
  let query = supabase
    .from('salary_advances')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (selectedMonth) {
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    query = query
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const userIds = [
    ...new Set([
      ...(data?.map((a) => a.user_id).filter(Boolean) || []),
      ...(data?.map((a) => a.authorized_by).filter(Boolean) || []),
    ]),
  ];

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    profiles?.forEach((p) => {
      if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
    });
  }

  return (data || []).map((a) => ({
    ...a,
    user_name: a.user_id ? profileMap[a.user_id] : 'N/A',
    authorizer_name: a.authorized_by ? profileMap[a.authorized_by] : null,
  }));
}

export async function fetchMySalaryAdvancesForCard(userId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .select('id, amount, status, payment_method, reason, paid_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function fetchMyAdvances(userId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const authorizerIds = [...new Set(data?.map((a) => a.authorized_by).filter(Boolean) || [])];
  let profileMap: Record<string, string> = {};

  if (authorizerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorizerIds);

    profiles?.forEach((p) => {
      if (p.id) profileMap[p.id] = p.full_name || '';
    });
  }

  return (data || []).map((a) => ({
    ...a,
    authorizer_name: a.authorized_by ? profileMap[a.authorized_by] : null,
  }));
}

export async function fetchShiftAdvances(shiftId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .select('id, amount, paid_at, user_id, authorized_by')
    .eq('shift_id', shiftId)
    .eq('status', 'paid')
    .order('paid_at');

  if (error) throw error;

  const userIds = [
    ...new Set([
      ...(data?.map((a) => a.user_id).filter(Boolean) || []),
      ...(data?.map((a) => a.authorized_by).filter(Boolean) || []),
    ]),
  ];

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    profiles?.forEach((p) => {
      if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
    });
  }

  return (data || []).map((a) => ({
    id: a.id,
    employee_name: a.user_id ? profileMap[a.user_id] : 'N/A',
    amount: a.amount,
    authorized_by_name: a.authorized_by ? profileMap[a.authorized_by] : null,
    paid_at: a.paid_at,
  }));
}

export async function fetchPendingTransferAdvances(branchId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'pending_transfer')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = data?.map((a) => a.user_id).filter(Boolean) || [];
  let profileMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    profiles?.forEach((p) => {
      if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
    });
  }

  return (data || []).map((a) => ({
    ...a,
    user_name: a.user_id ? profileMap[a.user_id] : 'N/A',
  }));
}

export async function createAdvance(params: {
  branchId: string;
  userId: string;
  amount: number;
  reason?: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const isCash = params.paymentMethod === 'cash';
  const status = isCash ? 'paid' : 'transferred';

  const { data: advance, error: advanceError } = await supabase
    .from('salary_advances')
    .insert({
      branch_id: params.branchId,
      employee_id: params.userId,
      user_id: params.userId,
      amount: params.amount,
      reason: params.reason || null,
      payment_method: params.paymentMethod,
      status,
      authorized_by: user.id,
      authorized_at: new Date().toISOString(),
      paid_by: user.id,
      paid_at: new Date().toISOString(),
      transferred_by: !isCash ? user.id : null,
      transferred_at: !isCash ? new Date().toISOString() : null,
      shift_id: isCash ? params.shiftId : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (advanceError) throw advanceError;
  return advance;
}

export async function approveAdvance(params: {
  advanceId: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const isCash = params.paymentMethod === 'cash';
  const status = isCash ? 'paid' : 'transferred';

  const { data, error } = await supabase
    .from('salary_advances')
    .update({
      status,
      payment_method: params.paymentMethod,
      authorized_by: user.id,
      authorized_at: new Date().toISOString(),
      paid_by: user.id,
      paid_at: new Date().toISOString(),
      transferred_by: !isCash ? user.id : null,
      transferred_at: !isCash ? new Date().toISOString() : null,
      shift_id: isCash ? params.shiftId : null,
    })
    .eq('id', params.advanceId)
    .eq('status', 'pending')
    .select('branch_id')
    .single();

  if (error) throw error;
  return data;
}

export async function rejectAdvance(advanceId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .update({ status: 'cancelled' })
    .eq('id', advanceId)
    .eq('status', 'pending')
    .select('branch_id')
    .single();

  if (error) throw error;
  return data;
}

export async function markAdvanceTransferred(advanceId: string, reference?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('salary_advances')
    .update({
      status: 'transferred',
      transferred_by: user.id,
      transferred_at: new Date().toISOString(),
      transfer_reference: reference || null,
    })
    .eq('id', advanceId)
    .select('branch_id')
    .single();

  if (error) throw error;
  return data;
}

export async function requestAdvance(params: { branchId: string; amount: number; reason?: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('salary_advances')
    .insert({
      branch_id: params.branchId,
      employee_id: user.id,
      user_id: user.id,
      amount: params.amount,
      reason: params.reason || null,
      payment_method: 'cash',
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelAdvance(advanceId: string) {
  const { data, error } = await supabase
    .from('salary_advances')
    .update({ status: 'cancelled' })
    .eq('id', advanceId)
    .select('branch_id')
    .single();

  if (error) throw error;
  return data;
}

// ── Holidays ────────────────────────────────────────────────────────

export async function fetchHolidays(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('special_days')
    .select('*')
    .is('branch_id', null)
    .gte('day_date', startDate)
    .lte('day_date', endDate)
    .order('day_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHoliday(input: {
  day_date: string;
  description: string;
  day_type?: 'holiday' | 'special_event';
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('special_days')
    .insert({
      branch_id: null,
      day_date: input.day_date,
      day_type: input.day_type || 'holiday',
      description: input.description,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHoliday(holidayId: string) {
  const { error } = await supabase
    .from('special_days')
    .delete()
    .eq('id', holidayId)
    .is('branch_id', null);

  if (error) throw error;
}

export async function createHolidaysBulk(
  holidays: { day_date: string; description: string; day_type?: 'holiday' | 'special_event' }[],
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const dates = holidays.map((h) => h.day_date);
  const { data: existing } = await supabase
    .from('special_days')
    .select('day_date')
    .is('branch_id', null)
    .in('day_date', dates);

  const existingDates = new Set(existing?.map((e) => e.day_date) || []);
  const newHolidays = holidays.filter((h) => !existingDates.has(h.day_date));

  if (newHolidays.length === 0) {
    return [];
  }

  const records = newHolidays.map((h) => ({
    branch_id: null,
    day_date: h.day_date,
    day_type: h.day_type || 'holiday',
    description: h.description,
    created_by: user.id,
  }));

  const { data, error } = await supabase.from('special_days').insert(records).select();

  if (error) throw error;
  return data || [];
}

// ── Work Positions ──────────────────────────────────────────────────

export async function fetchActiveWorkPositions() {
  const { data, error } = await supabase
    .from('work_positions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

export async function fetchAllWorkPositions() {
  const { data, error } = await supabase.from('work_positions').select('*').order('sort_order');

  if (error) throw error;
  return data;
}

export async function createWorkPosition(input: {
  key: string;
  label: string;
  sort_order?: number;
}) {
  const { data: result, error } = await supabase
    .from('work_positions')
    .insert({
      key: input.key.toLowerCase().replace(/\s+/g, '_'),
      label: input.label,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateWorkPosition(
  id: string,
  updates: { key?: string; label?: string; sort_order?: number; is_active?: boolean },
) {
  const { data: result, error } = await supabase
    .from('work_positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteWorkPosition(id: string) {
  const { error } = await supabase
    .from('work_positions')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchDayRequests(branchId: string, dateStr: string) {
  const { data } = await supabase
    .from('schedule_requests')
    .select('user_id, request_type, status')
    .eq('branch_id', branchId)
    .eq('request_date', dateStr)
    .eq('status', 'approved');

  return (data || []).map((r) => ({
    userId: r.user_id,
    requestType: r.request_type,
    status: r.status,
  }));
}

export async function createLeaveRequest(params: {
  branchId: string;
  userId: string;
  date: string;
  requestType: 'sick_leave' | 'vacation' | 'day_off';
  reason?: string;
  respondedBy: string;
}) {
  const { error } = await supabase.from('schedule_requests').insert({
    branch_id: params.branchId,
    user_id: params.userId,
    request_type: params.requestType,
    request_date: params.date,
    reason: params.reason || null,
    status: 'approved',
    response_note: 'Marcado por encargado',
    responded_by: params.respondedBy,
    responded_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function fetchBranchStaffForClock(branchId: string) {
  const { data: roles } = await supabase
    .from('user_branch_roles')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (!roles?.length) return [];

  const userIds = [...new Set(roles.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  return (profiles || []).map((p) => ({ userId: p.id, userName: p.full_name || 'Sin nombre' }));
}

// ── Clock Entries (page-level) ──────────────────────────────────────

export async function fetchClockEntriesRaw(
  branchId: string,
  workDate: string,
) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('id, entry_type, photo_url, created_at, user_id, gps_status, is_manual, manual_by, manual_reason, original_created_at, schedule_id, resolved_type, anomaly_type, work_date')
    .eq('branch_id', branchId)
    .eq('work_date', workDate)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchNextDayClockOuts(
  branchId: string,
  userIds: string[],
  afterIso: string,
  beforeIso: string,
) {
  const { data } = await supabase
    .from('clock_entries')
    .select('id, entry_type, photo_url, created_at, user_id, gps_status, is_manual, manual_by, manual_reason, original_created_at')
    .eq('branch_id', branchId)
    .in('user_id', userIds)
    .eq('entry_type', 'clock_out')
    .gt('created_at', afterIso)
    .lte('created_at', beforeIso)
    .order('created_at', { ascending: true });

  return data || [];
}

export async function fetchProfileNames(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  return new Map(data?.map((p) => [p.id, p.full_name || 'Usuario']) || []);
}

export async function fetchDaySchedulesForClock(branchId: string, dateStr: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('id, user_id, start_time, end_time, is_day_off')
    .eq('branch_id', branchId)
    .eq('schedule_date', dateStr);

  if (error) throw error;
  return data || [];
}

export async function fetchBranchClockInfo(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, clock_code, clock_window_before_min, clock_window_after_min')
    .eq('id', branchId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchBranchClockInfoMaybe(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, clock_code')
    .eq('id', branchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchEmployeeClockInsMonth(
  userId: string,
  branchId: string,
  startIso: string,
  endIso: string,
) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMyClockEntries(userId: string, startIso: string, endIso: string) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('id, entry_type, created_at, branch_id, is_manual, schedule_id, branches:branch_id(name)')
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function createManualClockEntry(params: {
  branchId: string;
  userId: string;
  entryType: 'clock_in' | 'clock_out';
  timestamp: string;
  reason: string;
  managerId: string;
}) {
  const ts = new Date(params.timestamp);
  const dateStr = ts.toISOString().slice(0, 10);

  // Find matching schedule for the given timestamp
  let scheduleId: string | null = null;
  let resolvedType: 'scheduled' | 'unscheduled' = 'unscheduled';

  if (params.entryType === 'clock_in') {
    const { data: schedules } = await supabase
      .from('employee_schedules')
      .select('id, start_time')
      .eq('user_id', params.userId)
      .eq('branch_id', params.branchId)
      .eq('schedule_date', dateStr)
      .eq('is_day_off', false)
      .not('start_time', 'is', null);

    if (schedules?.length) {
      const entryMin = ts.getHours() * 60 + ts.getMinutes();
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const s of schedules) {
        const [h, m] = s.start_time.split(':').map(Number);
        const dist = Math.abs(h * 60 + m - entryMin);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = s.id;
        }
      }
      if (bestId) {
        scheduleId = bestId;
        resolvedType = 'scheduled';
      }
    }
  } else {
    // For clock_out, inherit schedule_id from the open clock_in
    const { data: ets } = await supabase
      .from('employee_time_state')
      .select('open_schedule_id')
      .eq('employee_id', params.userId)
      .maybeSingle();
    if (ets?.open_schedule_id) {
      scheduleId = ets.open_schedule_id;
      resolvedType = 'scheduled';
    }
  }

  // Determine work_date: use schedule's date if linked, otherwise the entry's local date.
  // For clock_out, inherit from open clock_in.
  let workDate = dateStr;
  if (scheduleId) {
    const { data: sched } = await supabase
      .from('employee_schedules')
      .select('schedule_date')
      .eq('id', scheduleId)
      .single();
    if (sched?.schedule_date) workDate = sched.schedule_date;
  } else if (params.entryType === 'clock_out') {
    const { data: openCi } = await supabase
      .from('clock_entries')
      .select('work_date')
      .eq('user_id', params.userId)
      .eq('branch_id', params.branchId)
      .eq('entry_type', 'clock_in')
      .lt('created_at', params.timestamp)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openCi?.work_date) workDate = openCi.work_date;
  }

  const { data, error } = await supabase
    .from('clock_entries')
    .insert({
      branch_id: params.branchId,
      user_id: params.userId,
      entry_type: params.entryType,
      created_at: params.timestamp,
      is_manual: true,
      manual_by: params.managerId,
      manual_reason: params.reason,
      schedule_id: scheduleId,
      resolved_type: resolvedType,
      work_date: workDate,
    })
    .select()
    .single();
  if (error) throw error;

  // Update employee_time_state
  const newState = params.entryType === 'clock_in' ? 'working' : 'off';
  await supabase.from('employee_time_state').upsert(
    {
      employee_id: params.userId,
      branch_id: params.branchId,
      current_state: newState,
      last_event_id: data.id,
      open_clock_in_id: params.entryType === 'clock_in' ? data.id : null,
      open_schedule_id: params.entryType === 'clock_in' ? scheduleId : null,
      last_updated: ts.toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  return data;
}

export async function updateClockEntry(
  entryId: string,
  patch: { entry_type?: string; created_at?: string; reason: string; schedule_id?: string | null },
  managerId: string,
  originalCreatedAt: string,
) {
  const updatePayload: Record<string, unknown> = {
    is_manual: true,
    manual_by: managerId,
    manual_reason: patch.reason,
    original_created_at: originalCreatedAt,
  };
  if (patch.entry_type) updatePayload.entry_type = patch.entry_type;
  if (patch.created_at) updatePayload.created_at = patch.created_at;
  if (patch.schedule_id !== undefined) updatePayload.schedule_id = patch.schedule_id;

  const { error } = await supabase
    .from('clock_entries')
    .update(updatePayload)
    .eq('id', entryId);
  if (error) throw error;
}

export async function deleteClockEntry(entryId: string) {
  const { error } = await supabase
    .from('clock_entries')
    .delete()
    .eq('id', entryId);
  if (error) throw error;
}

// ── Fichaje (clock-in flow) ─────────────────────────────────────────

export async function fetchBranchForClock(clockCode: string) {
  const { data, error } = await supabase.rpc('get_branch_for_clock', {
    _clock_code: clockCode,
  });

  if (error) throw error;
  return data;
}

export async function validateClockPin(branchCode: string, pin: string) {
  const { data, error } = await supabase.rpc('validate_clock_pin_v2', {
    _branch_code: branchCode,
    _pin: pin,
  });

  if (error) throw error;
  return data;
}

export async function checkRegulationStatus(userId: string) {
  const { data: regulations, error: regError } = await supabase
    .from('regulations')
    .select('id, version, created_at')
    .order('version', { ascending: false })
    .limit(1);

  if (regError || !regulations || regulations.length === 0) {
    return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
  }

  const regulation = regulations[0];

  const { data: signatures, error: sigError } = await supabase
    .from('regulation_signatures')
    .select('id')
    .eq('user_id', userId)
    .eq('regulation_version', regulation.version);

  if (!sigError && signatures && signatures.length > 0) {
    return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
  }

  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(regulation.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const isBlocked = daysSinceUpload > 5;

  return { hasPending: true, daysSinceUpload, isBlocked };
}

export async function fetchEmployeeBirthdays(branchId: string) {
  const { data } = await supabase
    .from('employee_data')
    .select('user_id, birth_date')
    .eq('branch_id', branchId);

  return data || [];
}

// ── Regulations ─────────────────────────────────────────────────────

export async function fetchUserLocalRoles(userId: string) {
  const { data } = await supabase
    .from('user_branch_roles')
    .select('local_role')
    .eq('user_id', userId)
    .eq('is_active', true);

  return (data || []).map((r) => r.local_role);
}

export async function fetchLatestRegulation() {
  const { data } = await supabase
    .from('regulations')
    .select('*')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function fetchRegulationSignature(userId: string, regulationId: string) {
  const { data } = await supabase
    .from('regulation_signatures')
    .select('*')
    .eq('user_id', userId)
    .eq('regulation_id', regulationId)
    .maybeSingle();

  return data;
}

export async function fetchRegulationSignatureHistory(userId: string) {
  const { data } = await supabase
    .from('regulation_signatures')
    .select('*')
    .eq('user_id', userId)
    .order('signed_at', { ascending: false });

  return data || [];
}

export async function getStorageSignedUrl(bucket: string, path: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
