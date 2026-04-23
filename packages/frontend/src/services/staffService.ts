import { apiGet, apiPost, apiPut, apiUpload } from './apiClient';

type LocalRole = 'encargado' | 'cajero' | 'empleado';
type ExtendedLocalRole = LocalRole | 'contador_local' | 'franquiciado';

export async function findProfileByEmail(email: string) {
  return apiGet<{ id: string; full_name: string; email: string } | null>(
    '/hr/staff/find-by-email',
    { email: email.toLowerCase().trim() },
  );
}

export async function findBranchRole(userId: string, branchId: string) {
  return apiGet<{ id: string; local_role: string; is_active: boolean } | null>(
    '/hr/branch-roles/find',
    { user_id: userId, branch_id: branchId },
  );
}

export async function reactivateBranchMember(
  userId: string,
  branchId: string,
  localRole: LocalRole,
) {
  return apiPost('/hr/branch-roles/reactivate', {
    user_id: userId,
    branch_id: branchId,
    local_role: localRole,
  });
}

export async function sendStaffInvitation(payload: {
  email: string;
  role: LocalRole;
  branch_id: string;
}) {
  return apiPost('/hr/staff-invitations/send', payload);
}

export async function validateInvitationToken(token: string) {
  return apiPost('/hr/staff-invitations/validate', { token });
}

export async function uploadStaffDocument(file: File, userId: string, type: 'front' | 'back') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/dni-${type}.${fileExt}`;
  const result = await apiUpload<{ url: string }>(
    `/storage/upload/staff-documents?path=${encodeURIComponent(fileName)}`,
    file,
  );
  return result.url ?? `/uploads/staff-documents/${fileName}`;
}

export async function upsertBranchRole(
  userId: string,
  branchId: string,
  localRole: ExtendedLocalRole,
) {
  return apiPost('/hr/branch-roles/upsert', {
    user_id: userId,
    branch_id: branchId,
    local_role: localRole,
  });
}

export async function acceptInvitation(invitationId: string, userId: string) {
  return apiPost(`/hr/staff-invitations/${invitationId}/accept`, {
    user_id: userId,
  });
}

export async function fetchBranchTeamData(branchId: string, excludeOwners: boolean = false) {
  const params: Record<string, string> = {};
  if (excludeOwners) params.exclude_owners = 'true';
  return apiGet<{
    roles: Array<{
      id: string;
      user_id: string;
      local_role: string;
      default_position: string | null;
      is_active: boolean;
      created_at: string;
    }>;
    profiles: Array<{ id: string; full_name: string; email: string; phone: string | null }>;
    employeeData: Array<{ user_id: string; monthly_hours_target: number | null }>;
    clockEntries: Array<{ user_id: string; entry_type: string; created_at: string }>;
    warnings: Array<{ user_id: string }>;
  }>(`/hr/branch-team/${branchId}`, params);
}

export async function fetchEmployeeData(userId: string, branchId: string) {
  return apiGet(`/hr/employee-data`, {
    user_id: userId,
    branch_id: branchId,
  });
}

export async function fetchEmployeeWarnings(userId: string, branchId: string) {
  return apiGet(`/hr/employee-warnings`, {
    user_id: userId,
    branch_id: branchId,
  });
}

export async function upsertEmployeeData(
  existingId: string | undefined,
  data: Record<string, unknown>,
) {
  return apiPost('/hr/employee-data', {
    existing_id: existingId ?? null,
    ...data,
  });
}

export async function updateBranchRole(
  roleId: string,
  updates: Record<string, unknown>,
) {
  return apiPut(`/hr/branch-roles/${roleId}`, updates);
}

export async function fetchProfileClockPin(userId: string) {
  return apiGet<{ clock_pin: string | null }>(`/hr/profiles/${userId}/clock-pin`);
}

export async function updateEmployeeNotes(
  employeeDataId: string | undefined,
  userId: string,
  branchId: string,
  notes: unknown[],
) {
  return apiPut('/hr/employee-notes', {
    employee_data_id: employeeDataId ?? null,
    user_id: userId,
    branch_id: branchId,
    internal_notes: notes,
  });
}

export async function deactivateBranchRole(roleId: string) {
  return apiPost(`/hr/branch-roles/${roleId}/deactivate`);
}
