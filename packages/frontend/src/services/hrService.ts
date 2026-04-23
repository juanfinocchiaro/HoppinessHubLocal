import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ── Clock Entries / Labor ────────────────────────────────────────────

export async function fetchClockEntries(branchId: string, startDate: string, endDate: string) {
  return apiGet('/hr/clock-entries', { branchId, startDate, endDate });
}

export async function fetchSpecialDays(startDate: string, endDate: string) {
  const data = await apiGet<{ day_date: string }[]>('/hr/special-days', { startDate, endDate });
  return data.map((h) => h.day_date);
}

export async function fetchBranchSchedules(branchId: string, startDate: string, endDate: string) {
  return apiGet('/hr/schedules', { branchId, startDate, endDate });
}

export async function fetchAbsences(branchId: string, startDate: string, endDate: string) {
  return apiGet('/hr/absences', { branchId, startDate, endDate });
}

export async function fetchLaborUsersData(branchId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  return apiPost('/hr/labor-users', { branchId, userIds });
}

export async function fetchLastClockEntry(userId: string, branchId: string) {
  return apiGet('/hr/clock-entries/last', { userId, branchId });
}

// ── Salary Advances ─────────────────────────────────────────────────

export async function fetchSalaryAdvances(branchId: string, selectedMonth?: Date) {
  const params: Record<string, string> = { branchId };
  if (selectedMonth) {
    params.selectedMonth = selectedMonth.toISOString();
  }
  return apiGet('/hr/salary-advances', params);
}

export async function fetchMySalaryAdvancesForCard(userId: string) {
  return apiGet('/hr/salary-advances/mine', { userId });
}

export async function fetchMyAdvances(userId: string) {
  return apiGet('/hr/salary-advances/my-full', { userId });
}

export async function fetchShiftAdvances(shiftId: string) {
  return apiGet('/hr/salary-advances/shift', { shiftId });
}

export async function fetchPendingTransferAdvances(branchId: string) {
  return apiGet('/hr/salary-advances/pending-transfer', { branchId });
}

export async function createAdvance(params: {
  branchId: string;
  userId: string;
  amount: number;
  reason?: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}) {
  return apiPost('/hr/salary-advances', params);
}

export async function approveAdvance(params: {
  advanceId: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}) {
  return apiPost('/hr/salary-advances/approve', params);
}

export async function rejectAdvance(advanceId: string) {
  return apiPost('/hr/salary-advances/reject', { advanceId });
}

export async function markAdvanceTransferred(advanceId: string, reference?: string) {
  return apiPost('/hr/salary-advances/mark-transferred', { advanceId, reference });
}

export async function requestAdvance(params: { branchId: string; amount: number; reason?: string }) {
  return apiPost('/hr/salary-advances/request', params);
}

export async function cancelAdvance(advanceId: string) {
  return apiPost('/hr/salary-advances/cancel', { advanceId });
}

// ── Holidays ────────────────────────────────────────────────────────

export async function fetchHolidays(startDate: string, endDate: string) {
  return apiGet('/hr/holidays', { startDate, endDate });
}

export async function createHoliday(input: {
  day_date: string;
  description: string;
  day_type?: 'holiday' | 'special_event';
}) {
  return apiPost('/hr/holidays', input);
}

export async function deleteHoliday(holidayId: string) {
  return apiDelete(`/hr/holidays/${holidayId}`);
}

export async function createHolidaysBulk(
  holidays: { day_date: string; description: string; day_type?: 'holiday' | 'special_event' }[],
) {
  return apiPost('/hr/holidays/bulk', { holidays });
}

// ── Work Positions ──────────────────────────────────────────────────

export async function fetchActiveWorkPositions() {
  return apiGet('/hr/work-positions/active');
}

export async function fetchAllWorkPositions() {
  return apiGet('/hr/work-positions');
}

export async function createWorkPosition(input: {
  key: string;
  label: string;
  sort_order?: number;
}) {
  return apiPost('/hr/work-positions', input);
}

export async function updateWorkPosition(
  id: string,
  updates: { key?: string; label?: string; sort_order?: number; is_active?: boolean },
) {
  return apiPut(`/hr/work-positions/${id}`, updates);
}

export async function deleteWorkPosition(id: string) {
  return apiDelete(`/hr/work-positions/${id}`);
}

export async function fetchDayRequests(branchId: string, dateStr: string) {
  return apiGet('/hr/schedule-requests/day', { branchId, date: dateStr });
}

export async function createLeaveRequest(params: {
  branchId: string;
  userId: string;
  date: string;
  requestType: 'sick_leave' | 'vacation' | 'day_off';
  reason?: string;
  respondedBy: string;
}) {
  return apiPost('/hr/schedule-requests/leave', params);
}

export async function fetchBranchStaffForClock(branchId: string) {
  return apiGet(`/hr/branches/${branchId}/staff-clock`);
}

// ── Clock Entries (page-level) ──────────────────────────────────────

export async function fetchClockEntriesRaw(
  branchId: string,
  workDate: string,
) {
  return apiGet('/hr/clock-entries/raw', { branchId, workDate });
}

export async function fetchNextDayClockOuts(
  branchId: string,
  userIds: string[],
  afterIso: string,
  beforeIso: string,
) {
  return apiPost('/hr/clock-entries/next-day-outs', { branchId, userIds, afterIso, beforeIso });
}

export async function fetchProfileNames(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const data = await apiPost<Record<string, string>>('/hr/profiles/names', { userIds });
  return new Map(Object.entries(data));
}

export async function fetchDaySchedulesForClock(branchId: string, dateStr: string) {
  return apiGet('/hr/schedules/day', { branchId, date: dateStr });
}

export async function fetchBranchClockInfo(branchId: string) {
  return apiGet(`/hr/branches/${branchId}/clock-info`);
}

export async function fetchBranchClockInfoMaybe(branchId: string) {
  return apiGet(`/hr/branches/${branchId}/clock-info-maybe`);
}

export async function fetchEmployeeClockInsMonth(
  userId: string,
  branchId: string,
  startIso: string,
  endIso: string,
) {
  return apiGet('/hr/clock-entries/employee-month', { userId, branchId, startIso, endIso });
}

export async function fetchMyClockEntries(userId: string, startIso: string, endIso: string) {
  return apiGet('/hr/clock-entries/mine', { userId, startIso, endIso });
}

export async function createManualClockEntry(params: {
  branchId: string;
  userId: string;
  entryType: 'clock_in' | 'clock_out';
  timestamp: string;
  reason: string;
  managerId: string;
  earlyLeaveAuthorized?: boolean;
  workDate?: string;
}) {
  return apiPost('/hr/clock-entries/manual', params);
}

export async function updateClockEntry(
  entryId: string,
  patch: { entry_type?: string; created_at?: string; reason: string; schedule_id?: string | null; work_date?: string; early_leave_authorized?: boolean },
  managerId: string,
  originalCreatedAt: string,
) {
  return apiPut(`/hr/clock-entries/${entryId}`, { patch, managerId, originalCreatedAt });
}

export async function deleteClockEntry(entryId: string) {
  return apiDelete(`/hr/clock-entries/${entryId}`);
}

// ── Fichaje (clock-in flow) ─────────────────────────────────────────

export async function fetchBranchForClock(clockCode: string) {
  return apiPost('/hr/clock/branch', { clockCode });
}

export async function validateClockPin(branchCode: string, pin: string) {
  return apiPost('/hr/clock/validate-pin', { branchCode, pin });
}

export async function validateManagerOverridePin(
  branchCode: string,
  pin: string,
): Promise<{ user_id: string; full_name: string } | null> {
  return apiPost('/hr/clock/validate-manager-pin', { branchCode, pin });
}

export async function checkRegulationStatus(userId: string) {
  return apiGet('/hr/regulations/status', { userId });
}

export async function fetchEmployeeBirthdays(branchId: string) {
  return apiGet('/hr/employees/birthdays', { branchId });
}

// ── Regulations ─────────────────────────────────────────────────────

export async function fetchUserLocalRoles(userId: string) {
  return apiGet(`/hr/users/${userId}/local-roles`);
}

export async function fetchLatestRegulation() {
  return apiGet('/hr/regulations/latest');
}

export async function fetchRegulationSignature(userId: string, regulationId: string) {
  return apiGet('/hr/regulations/signature', { userId, regulationId });
}

export async function fetchRegulationSignatureHistory(userId: string) {
  return apiGet('/hr/regulations/signatures', { userId });
}

export async function getStorageSignedUrl(bucket: string, path: string) {
  return apiGet<string | null>('/hr/storage/signed-url', { bucket, path });
}

// ── Payroll Closing ─────────────────────────────────────────────────

export async function fetchPayrollClosing(branchId: string, month: number, year: number) {
  return apiGet('/hr/payroll-closing', {
    branchId,
    month: String(month),
    year: String(year),
  });
}

export async function closePayrollMonth(params: {
  branchId: string;
  month: number;
  year: number;
  closedBy: string;
  notes?: string;
}) {
  return apiPost('/hr/payroll-closing/close', params);
}

export async function reopenPayrollMonth(params: {
  branchId: string;
  month: number;
  year: number;
  notes?: string;
}) {
  return apiPost('/hr/payroll-closing/reopen', params);
}

export async function fetchEmployeeConsumptions(branchId: string, startDate: string, endDate: string) {
  return apiGet('/hr/employee-consumptions', { branchId, startDate, endDate });
}
