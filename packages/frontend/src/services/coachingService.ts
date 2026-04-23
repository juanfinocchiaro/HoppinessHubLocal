import { apiGet, apiPost, apiPut } from './apiClient';
import type {
  CoachingWithDetails,
  CoachingFormData,
  CoachingStationScore,
  CoachingCompetencyScore,
  CertificationLevel,
  EmployeeCertificationWithStation,
} from '@/types/coaching';

// ── Shared filter / data interfaces ────────────────────────────────

export interface CoachingFilters {
  branchId?: string;
  userId?: string;
  month?: number;
  year?: number;
}

export interface CoachingStats {
  totalEmployees: number;
  coachingsThisMonth: number;
  pendingCoachings: number;
  pendingAcknowledgments: number;
  completionRate: number;
  averageScore: number | null;
  employeesWithoutCoaching: string[];
  totalManagers: number;
  managersWithCoaching: number;
  pendingManagerCoachings: number;
  managersWithoutCoaching: string[];
}

export interface CertificationFilters {
  branchId?: string;
  userId?: string;
  stationId?: string;
}

export interface UpsertCertificationData {
  userId: string;
  branchId: string;
  stationId: string;
  level: CertificationLevel;
  notes?: string;
}

// ── Coaching queries ───────────────────────────────────────────────

export async function fetchCoachings(
  filters: CoachingFilters,
): Promise<CoachingWithDetails[]> {
  const params: Record<string, string> = {};
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.userId) params.userId = filters.userId;
  if (filters.month) params.month = String(filters.month);
  if (filters.year) params.year = String(filters.year);

  return apiGet('/coaching/coachings', params);
}

export async function fetchCoachingDetails(
  coachingId: string,
): Promise<CoachingWithDetails | null> {
  if (!coachingId) return null;
  return apiGet(`/coaching/coachings/${coachingId}`);
}

export async function fetchEmployeeCoachings(
  userId: string,
  branchId: string | null,
): Promise<CoachingWithDetails[]> {
  if (!userId) return [];
  const params: Record<string, string> = { userId };
  if (branchId) params.branchId = branchId;
  return apiGet('/coaching/employee-coachings', params);
}

// ── Coaching mutations ─────────────────────────────────────────────

export async function createCoaching(
  formData: CoachingFormData & { previousActionReview?: string },
) {
  return apiPost('/coaching/coachings', {
    userId: formData.userId,
    branchId: formData.branchId,
    coachingDate: formData.coachingDate.toISOString(),
    stationScores: formData.stationScores,
    generalScores: formData.generalScores,
    strengths: formData.strengths,
    areasToImprove: formData.areasToImprove,
    actionPlan: formData.actionPlan,
    managerNotes: formData.managerNotes,
    previousActionReview: formData.previousActionReview,
    certificationChanges: formData.certificationChanges,
  });
}

export async function acknowledgeCoaching(coachingId: string, notes?: string) {
  return apiPost(`/coaching/coachings/${coachingId}/acknowledge`, { notes });
}

// ── Coaching stats queries ─────────────────────────────────────────

export async function fetchCoachingStats(
  branchId: string,
  currentMonth: number,
  currentYear: number,
): Promise<CoachingStats> {
  if (!branchId) {
    return {
      totalEmployees: 0,
      coachingsThisMonth: 0,
      pendingCoachings: 0,
      pendingAcknowledgments: 0,
      completionRate: 0,
      averageScore: null,
      employeesWithoutCoaching: [],
      totalManagers: 0,
      managersWithCoaching: 0,
      pendingManagerCoachings: 0,
      managersWithoutCoaching: [],
    };
  }
  return apiGet('/coaching/stats', {
    branchId,
    month: String(currentMonth),
    year: String(currentYear),
  });
}

export async function checkHasCoachingThisMonth(
  userId: string,
  branchId: string,
  currentMonth: number,
  currentYear: number,
): Promise<boolean> {
  if (!userId || !branchId) return false;
  return apiGet('/coaching/has-coaching', {
    userId,
    branchId,
    month: String(currentMonth),
    year: String(currentYear),
  });
}

export async function fetchMyPendingCoachings() {
  return apiGet('/coaching/my-pending');
}

export async function fetchEmployeeScoreHistory(
  userId: string,
  branchId: string,
  months: number = 6,
) {
  if (!userId || !branchId) return [];
  return apiGet('/coaching/score-history', {
    userId,
    branchId,
    months: String(months),
  });
}

// ── Certification queries ──────────────────────────────────────────

export async function fetchCertifications(
  filters: CertificationFilters,
): Promise<EmployeeCertificationWithStation[]> {
  const params: Record<string, string> = {};
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.userId) params.userId = filters.userId;
  if (filters.stationId) params.stationId = filters.stationId;

  return apiGet('/coaching/certifications', params);
}

export async function fetchEmployeeCertifications(
  userId: string,
  branchId: string,
): Promise<EmployeeCertificationWithStation[]> {
  if (!userId || !branchId) return [];
  return apiGet('/coaching/certifications/employee', { userId, branchId });
}

export async function fetchTeamCertifications(branchId: string) {
  if (!branchId) return { certifications: [] as EmployeeCertificationWithStation[], byUser: {} };
  return apiGet('/coaching/certifications/team', { branchId });
}

// ── Certification mutations ────────────────────────────────────────

export async function upsertCertification(data: UpsertCertificationData) {
  return apiPost('/coaching/certifications', data);
}

// ── Network coaching stats ─────────────────────────────────────────

export async function fetchActiveBranches() {
  return apiGet('/coaching/branches/active');
}

export async function fetchStaffRolesByBranches(branchIds: string[]) {
  return apiPost('/coaching/staff-roles', { branchIds });
}

export async function fetchCoachingsByBranchesAndMonth(
  branchIds: string[],
  month: number,
  year: number,
) {
  return apiPost('/coaching/by-branches-month', {
    branchIds,
    month,
    year,
  });
}

export async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return apiPost('/coaching/profiles', { ids });
}

export async function fetchCoachingScoresByBranchesAndMonth(
  branchIds: string[],
  month: number,
  year: number,
) {
  return apiPost('/coaching/scores-by-branches-month', {
    branchIds,
    month,
    year,
  });
}

// ── Team coaching analysis ─────────────────────────────────────────

export async function fetchBranchCoachingsLast6Months(branchId: string) {
  return apiGet('/coaching/branch-last-6-months', { branchId });
}

export async function fetchStationScoresByBranch(branchId: string) {
  return apiGet('/coaching/station-scores', { branchId });
}

export async function fetchActiveWorkStations() {
  return apiGet('/coaching/work-stations/active');
}

export async function fetchCompetencyScoresByBranch(branchId: string) {
  return apiGet('/coaching/competency-scores', { branchId });
}

export async function fetchActiveGeneralCompetencies() {
  return apiGet('/coaching/general-competencies/active');
}

export async function fetchEmployeeCoachingComparison(userId: string, branchId: string) {
  return apiGet('/coaching/employee-comparison', { userId, branchId });
}

// ── Managers coaching list ─────────────────────────────────────────

export async function fetchManagerRoles(branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  return apiGet('/coaching/manager-roles', params);
}

export async function fetchBranchesByIds(branchIds: string[]) {
  if (branchIds.length === 0) return [];
  return apiPost('/coaching/branches-by-ids', { branchIds });
}

export async function fetchCoachingsByUsersAndMonth(
  userIds: string[],
  month: number,
  year: number,
) {
  return apiPost('/coaching/by-users-month', { userIds, month, year });
}

export async function fetchCoachingScoresByUsersAndMonth(
  userIds: string[],
  month: number,
  year: number,
) {
  return apiPost('/coaching/scores-by-users-month', { userIds, month, year });
}

// ── Station & competency config ────────────────────────────────────

export async function fetchAllWorkStations() {
  return apiGet('/coaching/work-stations');
}

export async function fetchStationCompetencies(stationId: string) {
  return apiGet('/coaching/station-competencies', { stationId });
}

export async function fetchAllStationCompetencies() {
  return apiGet('/coaching/station-competencies/all');
}

export async function fetchAllGeneralCompetencies() {
  return apiGet('/coaching/general-competencies');
}

export async function fetchManagerCompetencies() {
  return apiGet('/coaching/manager-competencies');
}

export async function fetchBranchNameForCoaching(branchId: string) {
  return apiGet(`/coaching/branches/${branchId}/name`);
}

export async function fetchCoachingTeamMembers(branchId: string, excludeUserId?: string) {
  const params: Record<string, string> = { branchId };
  if (excludeUserId) params.excludeUserId = excludeUserId;
  return apiGet('/coaching/team-members', params);
}

export async function fetchEmployeesWithCoachingCounts(branchId: string) {
  return apiGet('/coaching/employees-with-counts', { branchId });
}

export async function fetchOwnCoachings(userId: string, branchId: string) {
  if (!userId) return [];
  return apiGet('/coaching/own', { userId, branchId });
}

export async function fetchBranchManager(branchId: string) {
  return apiGet(`/coaching/branches/${branchId}/manager`);
}

export async function fetchManagerCoachings(managerId: string, branchId: string) {
  if (!managerId) return [];
  return apiGet('/coaching/manager-coachings', { managerId, branchId });
}

export async function batchUpdateCertifications(updates: UpsertCertificationData[]) {
  return apiPost('/coaching/certifications/batch', { updates });
}
