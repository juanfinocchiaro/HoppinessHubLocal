import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type {
  Communication,
  CommunicationReader,
  CommunicationWithSource,
} from '@/types/communications';

export async function fetchCommunicationReaders(communicationId: string) {
  return apiGet<{ readers: CommunicationReader[]; totalTargeted: number }>(
    `/communications/${communicationId}/readers`,
  );
}

export async function listCommunications(limit = 100): Promise<Communication[]> {
  return apiGet<Communication[]>('/communications', { limit: String(limit) });
}

export async function listUserCommunications(userId: string): Promise<{
  brand: CommunicationWithSource[];
  local: CommunicationWithSource[];
}> {
  return apiGet(`/communications/user/${userId}`);
}

export async function markCommunicationAsRead(userId: string, communicationId: string) {
  return apiPost(`/communications/${communicationId}/read`, { user_id: userId });
}

export async function confirmCommunication(userId: string, communicationId: string) {
  return apiPut(`/communications/${communicationId}/confirm`, { user_id: userId });
}

export async function createCommunication(
  userId: string,
  data: {
    title: string;
    body: string;
    type: Communication['type'];
    target_branch_ids?: string[];
    target_roles?: string[];
    expires_at?: string;
  },
) {
  return apiPost('/communications', { ...data, created_by: userId });
}

export async function deleteCommunication(id: string) {
  return apiDelete(`/communications/${id}`);
}

export async function fetchBranchForComms(branchId: string) {
  return apiGet(`/communications/branches/${branchId}`);
}

export async function fetchBranchTeamForComms(branchId: string) {
  return apiGet<Array<{ user_id: string; full_name: string }>>(
    `/communications/branches/${branchId}/team`,
  );
}

export async function fetchLocalCommunications(branchId: string) {
  return apiGet(`/communications/local/${branchId}`);
}

export async function createLocalCommunication(data: {
  title: string;
  body: string;
  type: string;
  branchId: string;
  createdBy: string;
  targetRoles?: string[];
}) {
  return apiPost('/communications/local', data);
}

export async function deleteLocalCommunication(id: string) {
  return apiDelete(`/communications/${id}`);
}

export async function fetchUrgentUnreadCommunications(
  userId: string,
  userLocalRoles: Set<string>,
): Promise<Array<{ id: string; title: string }>> {
  return apiGet(`/communications/user/${userId}/urgent-unread`, {
    roles: Array.from(userLocalRoles).join(','),
  });
}
