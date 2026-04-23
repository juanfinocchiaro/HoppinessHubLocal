import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type {
  Meeting,
  MeetingWithDetails,
  MeetingConveneData,
  MeetingWizardData,
  MeetingStats,
  TeamMember,
} from '@/types/meeting';

// ─── Queries ───

export async function fetchBranchMeetings(branchId: string) {
  return apiGet<(Meeting & { participants: unknown[] })[]>(
    `/meetings/branch/${branchId}`,
  );
}

export async function fetchMyMeetings(userId: string) {
  return apiGet(`/meetings/user/${userId}`);
}

export async function fetchUnreadMeetingsCount(userId: string): Promise<MeetingStats> {
  return apiGet<MeetingStats>(`/meetings/user/${userId}/stats`);
}

export async function fetchBrandMeetings() {
  return apiGet('/meetings/brand');
}

export async function fetchBrandMeetingsStats() {
  return apiGet('/meetings/brand/stats');
}

export async function fetchMeetingDetail(meetingId: string): Promise<MeetingWithDetails> {
  return apiGet<MeetingWithDetails>(`/meetings/${meetingId}`);
}

// ─── Mutations: Fase 1 - Convocatoria ───

export async function conveneMeeting(userId: string, data: MeetingConveneData) {
  return apiPost('/meetings/convene', { userId, ...data });
}

export async function updateConvokedMeeting(
  meetingId: string,
  data: Partial<MeetingConveneData>,
) {
  return apiPut(`/meetings/${meetingId}/convene`, data);
}

export async function cancelMeeting(meetingId: string) {
  return apiPost(`/meetings/${meetingId}/cancel`);
}

// ─── Mutations: Fase 2 - Ejecución ───

export async function startMeeting(meetingId: string, userId: string) {
  return apiPost(`/meetings/${meetingId}/start`, { userId });
}

export async function updateAttendance(
  meetingId: string,
  attendance: Record<string, boolean>,
) {
  return apiPut(`/meetings/${meetingId}/attendance`, { attendance });
}

export async function saveMeetingNotes(meetingId: string, notes: string) {
  return apiPut(`/meetings/${meetingId}/notes`, { notes });
}

export async function addAgreement(params: {
  meetingId: string;
  description: string;
  assigneeIds: string[];
  sortOrder?: number;
}) {
  return apiPost(`/meetings/${params.meetingId}/agreements`, params);
}

export async function deleteAgreement(agreementId: string) {
  return apiDelete(`/meetings/agreements/${agreementId}`);
}

export async function closeMeeting(params: {
  meetingId: string;
  notes: string;
  attendance: Record<string, boolean>;
  agreements?: { description: string; assigneeIds: string[] }[];
}) {
  return apiPost(`/meetings/${params.meetingId}/close`, params);
}

// ─── Mutations: General ───

export async function markMeetingAsRead(meetingId: string, userId: string) {
  return apiPost(`/meetings/${meetingId}/read`, { userId });
}

export async function createMeetingLegacy(
  userId: string,
  branchId: string,
  data: MeetingWizardData,
) {
  return apiPost('/meetings/legacy', { userId, branchId, ...data });
}

// ─── Queries: Team Members ───

export async function fetchBranchTeamMembers(branchId: string): Promise<TeamMember[]> {
  return apiGet<TeamMember[]>(`/meetings/branch/${branchId}/team`);
}

export async function fetchNetworkMembers(): Promise<TeamMember[]> {
  return apiGet<TeamMember[]>('/meetings/network-members');
}

// ─── Queries: Conflict Detection ───

export interface MeetingConflict {
  userId: string;
  userName: string;
  meetingTitle: string;
  meetingTime: string;
}

export async function checkMeetingConflicts(params: {
  date: Date;
  time: string;
  participantIds: string[];
}): Promise<MeetingConflict[]> {
  if (params.participantIds.length === 0) return [];
  return apiPost<MeetingConflict[]>('/meetings/check-conflicts', {
    date: params.date.toISOString(),
    time: params.time,
    participantIds: params.participantIds,
  });
}
