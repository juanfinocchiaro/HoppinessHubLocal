import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { ScheduleNotificationInput } from '@/types/schedule';

// ── Schedule CRUD ────────────────────────────────────────────────────

export async function fetchMonthlySchedules(branchId: string, startDate: string, endDate: string) {
  return apiGet(`/hr/schedules/branch/${branchId}`, { startDate, endDate });
}

export async function fetchEmployeeMonthSchedule(userId: string, startDate: string, endDate: string) {
  return apiGet(`/hr/schedules/user/${userId}`, { startDate, endDate });
}

export async function fetchHasPublishedSchedule(userId: string, startDate: string, endDate: string) {
  return apiGet<boolean>(`/hr/schedules/user/${userId}/has-published`, { startDate, endDate });
}

export async function deleteUserMonthSchedules(userId: string, startDate: string, endDate: string) {
  return apiDelete(`/hr/schedules/user/${userId}`, { startDate, endDate });
}

export async function insertScheduleRecords(records: Record<string, unknown>[]) {
  return apiPost('/hr/schedules', { records });
}

export async function fetchScheduleById(scheduleId: string) {
  return apiGet(`/hr/schedules/${scheduleId}`);
}

export async function updateScheduleEntry(scheduleId: string, updates: Record<string, unknown>) {
  return apiPut(`/hr/schedules/${scheduleId}`, updates);
}

export async function deleteUserBranchMonthSchedules(
  userId: string,
  branchId: string,
  startDate: string,
  endDate: string,
) {
  return apiDelete(`/hr/schedules/user/${userId}/branch/${branchId}`, { startDate, endDate });
}

export async function sendScheduleNotificationComm(input: {
  title: string;
  body: string;
  branch_id: string;
  user_id: string;
  sender_id: string;
}) {
  return apiPost('/hr/schedules/notify-communication', input);
}

export async function sendScheduleEmailNotification(input: {
  user_id: string;
  month: number;
  year: number;
  is_modification: boolean;
  modification_reason?: string;
}) {
  return apiPost('/hr/schedules/notify-email', input);
}

// ── Schedule Requests ────────────────────────────────────────────────

export async function fetchScheduleRequests(userId: string, startDate: string, endDate: string) {
  return apiGet(`/hr/schedule-requests/user/${userId}`, { startDate, endDate });
}

export async function fetchMyScheduleRequests(userId: string) {
  return apiGet(`/hr/schedule-requests/user/${userId}/recent`);
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
  return apiPost('/hr/schedule-requests', params);
}

export async function updateScheduleRequestStatus(
  requestId: string,
  updates: Record<string, unknown>,
) {
  return apiPut(`/hr/schedule-requests/${requestId}`, updates);
}

// ── Previous Month Pattern ───────────────────────────────────────────

export async function fetchSchedulesByDateRange(branchId: string, startDate: string, endDate: string) {
  return apiGet(`/hr/schedules/branch/${branchId}/range`, { startDate, endDate });
}

// ── Shift Closures ───────────────────────────────────────────────────

export async function fetchShiftClosuresByDate(branchId: string, dateStr: string) {
  return apiGet(`/hr/shift-closures/branch/${branchId}`, { date: dateStr });
}

export async function fetchShiftClosuresByDateRange(branchId: string, fromStr: string, toStr: string) {
  return apiGet(`/hr/shift-closures/branch/${branchId}/range`, { from: fromStr, to: toStr });
}

export async function fetchShiftClosureSingle(branchId: string, fecha: string, turno: string) {
  return apiGet(`/hr/shift-closures/branch/${branchId}/single`, { date: fecha, shift: turno });
}

export async function fetchAllShiftClosuresInRange(fromStr: string, toStr: string) {
  return apiGet('/hr/shift-closures', { from: fromStr, to: toStr });
}

export async function fetchAllBranches() {
  return apiGet<{ id: string; name: string; slug: string }[]>('/branches');
}

export async function fetchActiveBranchShifts() {
  return apiGet<{ branch_id: string; name: string }[]>('/branches/shifts/active');
}

export async function upsertShiftClosure(closureData: Record<string, unknown>) {
  return apiPost('/hr/shift-closures', closureData);
}

export async function fetchEnabledBranchShifts(branchId: string) {
  return apiGet(`/branches/${branchId}/shifts`);
}

// ── Shift Status ─────────────────────────────────────────────────────

export async function fetchVentasRegisters(branchId: string) {
  return apiGet<{ id: string }[]>(`/financial/branches/${branchId}/cash-registers`, {
    registerType: 'ventas',
  });
}

export async function fetchOpenCashShift(branchId: string, ventasIds: string[]) {
  return apiPost(`/financial/branches/${branchId}/cash-shifts/open`, { ventasIds });
}

export async function sendScheduleNotification(input: ScheduleNotificationInput): Promise<void> {
  return apiPost('/hr/schedules/notify', input);
}

// ── Schedule Requests (with profiles) ────────────────────────────────

export async function fetchScheduleRequestsWithProfiles(branchId: string) {
  return apiGet(`/hr/schedule-requests/branch/${branchId}`);
}

export async function fetchPendingScheduleRequestsWithProfiles(branchId: string) {
  return apiGet(`/hr/schedule-requests/branch/${branchId}/pending`);
}

export async function respondToScheduleRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
  note?: string,
) {
  return apiPost(`/hr/schedule-requests/${requestId}/respond`, {
    status,
    respondedBy,
    note,
  });
}

// ── Employee Schedule (branch-scoped) ────────────────────────────────

export async function fetchEmployeeScheduleForBranch(
  userId: string,
  branchId: string,
  startDate: string,
  endDate: string,
) {
  return apiGet(`/hr/schedules/user/${userId}/branch/${branchId}`, { startDate, endDate });
}

// ── My Schedules (employee view) ─────────────────────────────────────

export async function fetchMySchedules(userId: string, startDate: string, endDate: string) {
  return apiGet(`/hr/schedules/user/${userId}/mine`, { startDate, endDate });
}

// ── Batch Schedule Operations ────────────────────────────────────────

export async function upsertSchedulesBatch(records: Record<string, unknown>[]) {
  return apiPost('/hr/schedules/batch', { records });
}

export async function deleteScheduleEntriesBatch(
  entries: Array<{ userId: string; date: string; branchId: string }>,
) {
  return apiPost('/hr/schedules/batch-delete', { entries });
}

export async function sendBulkScheduleNotifications(
  employees: Array<{ id: string; name: string }>,
  params: Omit<ScheduleNotificationInput, 'user_id'>,
): Promise<void> {
  return apiPost('/hr/schedules/notify-bulk', { employees, ...params });
}
