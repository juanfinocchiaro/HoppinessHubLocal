import { apiGet, apiPost, apiPut } from './apiClient';

// ── Team Members (basic) ────────────────────────────────────────────

export async function fetchBranchTeamMembersBasic(branchId: string) {
  return apiGet<Array<{ user_id: string; full_name: string }>>(
    `/hr/warnings/branches/${branchId}/team`,
  );
}

// ── Warnings CRUD ───────────────────────────────────────────────────

export async function fetchBranchWarnings(branchId: string) {
  return apiGet(`/hr/warnings/branch/${branchId}`);
}

export async function createWarningRecord(params: {
  userId: string;
  branchId: string;
  warningType: string;
  description: string;
  warningDate: string;
  issuedBy: string;
}) {
  return apiPost('/hr/warnings', {
    user_id: params.userId,
    branch_id: params.branchId,
    warning_type: params.warningType,
    description: params.description,
    warning_date: params.warningDate,
    issued_by: params.issuedBy,
  });
}

export async function uploadWarningSignature(warningId: string, userId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  return apiPost(`/hr/warnings/${warningId}/signature`, formData);
}

export async function uploadWarningSignatureWithAck(
  warningId: string,
  userId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  formData.append('acknowledge', 'true');

  return apiPost(`/hr/warnings/${warningId}/signature`, formData);
}

// ── Warning Employee Profile (for WarningModal) ─────────────────────

export async function fetchWarningEmployeeProfile(userId: string, branchId: string) {
  return apiGet<{ fullName: string; dni?: string; role: string }>(
    `/hr/warnings/employee-profile/${userId}`,
    { branch_id: branchId },
  );
}

export async function fetchWarningBranchName(branchId: string) {
  return apiGet<{ name: string } | null>(`/hr/warnings/branches/${branchId}/name`);
}

export async function fetchWarningIssuerName(userId: string) {
  return apiGet<{ full_name: string } | null>(`/hr/warnings/issuer/${userId}`);
}

export async function sendWarningNotification(params: {
  warningId: string;
  employeeId: string;
  branchId: string;
  warningType: string;
  description: string;
  issuedByName?: string;
}) {
  return apiPost('/hr/warnings/notify', {
    warning_id: params.warningId,
    employee_id: params.employeeId,
    branch_id: params.branchId,
    warning_type: params.warningType,
    description: params.description,
    issued_by_name: params.issuedByName,
  });
}

// ── My Warnings (employee view) ─────────────────────────────────────

export async function fetchMyWarnings(userId: string) {
  return apiGet(`/hr/warnings/my/${userId}`);
}

export async function acknowledgeWarning(warningId: string) {
  return apiPut(`/hr/warnings/${warningId}/acknowledge`);
}
