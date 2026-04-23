import { apiGet, apiPost, apiPut, apiUpload } from './apiClient';

export async function fetchProfile(userId: string) {
  return apiGet<{ full_name: string; phone: string; avatar_url: string; birth_date: string | null } | null>(
    `/profiles/${userId}`,
  );
}

export async function updateProfile(
  userId: string,
  data: {
    full_name?: string;
    phone?: string;
    birth_date?: string | null;
    updated_at?: string;
  },
) {
  return apiPut(`/profiles/${userId}`, data);
}

export async function updateStaffProfile(
  userId: string,
  data: Record<string, unknown>,
) {
  return apiPut(`/profiles/${userId}/staff`, data);
}

export async function fetchFullProfile(userId: string) {
  return apiGet(`/profiles/${userId}/full`);
}

export async function fetchUserBranchRolesWithPins(userId: string) {
  return apiGet<
    Array<{
      id: string;
      branch_id: string;
      local_role: string;
      clock_pin: string | null;
      branches: { id: string; name: string };
    }>
  >(`/profiles/${userId}/branch-roles`);
}

export async function checkClockPinAvailability(
  branchId: string,
  pin: string,
  excludeUserId: string | null,
) {
  const params: Record<string, string> = { branch_id: branchId, pin };
  if (excludeUserId) params.exclude_user_id = excludeUserId;
  return apiGet<boolean>('/profiles/clock-pin-available', params);
}

export async function updateBranchRoleClockPin(roleId: string, pin: string) {
  return apiPut(`/profiles/branch-roles/${roleId}/clock-pin`, { pin });
}

export async function verifyBranchRoleClockPin(roleId: string) {
  return apiGet<{ clock_pin: string | null }>(`/profiles/branch-roles/${roleId}/clock-pin`);
}

export async function fetchProfileCompleteness(userId: string) {
  return apiGet(`/profiles/${userId}/completeness`);
}

export async function fetchEmployeeDataCompleteness(userId: string) {
  return apiGet(`/profiles/${userId}/employee-completeness`);
}

export async function uploadStaffEvidence(filePath: string, file: File) {
  const result = await apiUpload<{ url: string }>(
    `/storage/upload/staff-documents?path=${encodeURIComponent(filePath)}`,
    file,
  );
  return result.url ?? `/uploads/staff-documents/${filePath}`;
}

export async function fetchLatestRegulation() {
  return apiGet('/profiles/regulations/latest');
}

export async function fetchBranchNameById(branchId: string) {
  return apiGet<{ name: string } | null>(`/profiles/branches/${branchId}/name`);
}

export async function fetchBranchTeamRolesForRegulation(branchId: string) {
  return apiGet<Array<{ user_id: string; local_role: string }>>(
    `/profiles/branches/${branchId}/team-roles`,
  );
}

export async function fetchProfilesByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  return apiPost<Array<{ id: string; full_name: string }>>('/profiles/by-ids', {
    user_ids: userIds,
  });
}

export async function fetchEmployeeDataByBranchAndUsers(branchId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  return apiPost<Array<{ user_id: string; dni: string }>>(
    '/profiles/employee-data-by-users',
    { branch_id: branchId, user_ids: userIds },
  );
}

export async function fetchRegulationSignatures(regulationId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  return apiPost('/profiles/regulation-signatures', {
    regulation_id: regulationId,
    user_ids: userIds,
  });
}

export async function uploadRegulationSignatureFile(filePath: string, file: File) {
  await apiUpload(
    `/storage/upload/regulation-signatures?path=${encodeURIComponent(filePath)}`,
    file,
  );
}

export async function insertRegulationSignature(data: {
  user_id: string;
  regulation_id: string;
  regulation_version: number;
  signed_document_url: string;
  signed_at: string;
  uploaded_by: string;
  branch_id: string;
}) {
  return apiPost('/profiles/regulation-signatures/create', data);
}

export function getRegulationDocumentUrl(path: string): string {
  return `/uploads/regulations/${path}`;
}
