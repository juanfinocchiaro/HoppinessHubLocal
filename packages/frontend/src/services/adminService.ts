/**
 * adminService - HTTP API operations for admin (Mi Marca) pages/components
 * Covers: branches CRUD, central team, audit logs, reports, regulations,
 *         impersonation, user management, brand-level sales
 */
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './apiClient';

// ── Branches ────────────────────────────────────────────────────────

export async function fetchAllBranches() {
  return apiGet('/branches');
}

export async function fetchActiveBranches() {
  return apiGet('/branches/active');
}

export async function fetchActiveBranchNames() {
  return apiGet('/branches/active-names');
}

export async function fetchBranchesIdName() {
  return apiGet('/branches/id-name');
}

export async function fetchBranchBySlug(slug: string) {
  return apiGet(`/branches/by-slug/${slug}`);
}

export async function fetchBranchForDelivery(branchId: string) {
  return apiGet(`/branches/${branchId}/delivery-info`);
}

export async function updateBranch(branchId: string, values: Record<string, unknown>) {
  return apiPut(`/branches/${branchId}`, values);
}

export async function createBranch(values: {
  name: string;
  address: string;
  city: string | null;
  slug: string;
  is_active: boolean;
}) {
  return apiPost('/branches', values);
}

export async function upsertPosConfig(branchId: string, posEnabled: boolean) {
  return apiPost(`/branches/${branchId}/pos-config`, { pos_enabled: posEnabled });
}

// ── Brand Home (monthly stats) ──────────────────────────────────────

export async function fetchBrandMonthlyStats(firstDay: string, lastDay: string) {
  return apiGet<{ closures: any[]; clockEntries: any[] }>('/admin/brand-monthly-stats', {
    firstDay,
    lastDay,
  });
}

// ── Brand Daily Sales ───────────────────────────────────────────────

export async function fetchBrandClosures(from: string, to: string) {
  return apiGet('/admin/brand-closures', { from, to });
}

// ── Central Team ────────────────────────────────────────────────────

export async function fetchCentralTeamMembers() {
  return apiGet('/admin/central-team');
}

export async function removeCentralTeamMember(userId: string) {
  return apiDelete(`/admin/central-team/${userId}`);
}

export async function inviteCentralTeamMember(email: string, roleKey: string) {
  return apiPost('/admin/central-team', { email, roleKey });
}

// ── Branch Team ─────────────────────────────────────────────────────

export async function fetchBranchTeam(branchId: string) {
  return apiGet(`/branches/${branchId}/team`);
}

export async function searchUsersByEmail(email: string, limit = 5) {
  return apiGet('/admin/users/search', { email, limit: String(limit) });
}

export async function updateBranchMemberRole(
  userId: string,
  branchId: string,
  newRoleKey: string,
) {
  return apiPut(`/branches/${branchId}/team/${userId}/role`, { roleKey: newRoleKey });
}

export async function updateBranchMemberPosition(
  userId: string,
  branchId: string,
  position: string | null,
) {
  return apiPut(`/branches/${branchId}/team/${userId}/position`, { position });
}

export async function addBranchMember(
  userId: string,
  branchId: string,
  roleKey: string,
  position: string | null,
) {
  return apiPost(`/branches/${branchId}/team`, { userId, roleKey, position });
}

export async function removeBranchMember(userId: string, branchId: string) {
  return apiDelete(`/branches/${branchId}/team/${userId}`);
}

// ── Inspection-related branch queries ───────────────────────────────

export async function fetchBranchManagers(branchId: string) {
  return apiGet(`/branches/${branchId}/managers`);
}

export async function fetchBranchStaffMembers(branchId: string) {
  return apiGet(`/branches/${branchId}/staff`);
}

// ── Audit Logs ──────────────────────────────────────────────────────

export async function fetchAuditLogs(params: {
  page: number;
  pageSize: number;
  search?: string;
  tableFilter?: string;
}) {
  const query: Record<string, string> = {
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
  if (params.search) query.search = params.search;
  if (params.tableFilter) query.tableFilter = params.tableFilter;
  return apiGet<{ logs: any[]; total: number }>('/admin/audit-logs', query);
}

export async function fetchAuditLogTables() {
  return apiGet<string[]>('/admin/audit-logs/tables');
}

// ── Reports ─────────────────────────────────────────────────────────

export async function fetchGastosSummary(periodo: string) {
  return apiGet('/admin/reports/gastos-summary', { periodo });
}

export async function fetchClockEntriesSummary(startDate: string, endDate: string) {
  return apiGet('/admin/reports/clock-entries-summary', { startDate, endDate });
}

// ── Ventas Mensuales Marca ──────────────────────────────────────────

export async function fetchVentasMensualesMarca(periodo: string) {
  return apiGet('/admin/ventas-mensuales', { periodo });
}

// ── Regulations ─────────────────────────────────────────────────────

export async function fetchAllRegulations() {
  return apiGet('/admin/regulations');
}

export async function fetchRegulationSignatureStats(regulationId: string) {
  return apiGet<{ total: number; signed: number }>(`/admin/regulations/${regulationId}/signature-stats`);
}

export async function uploadRegulationPdf(filePath: string, file: File) {
  return apiUpload(`/admin/regulations/upload?path=${encodeURIComponent(filePath)}`, file);
}

export async function deactivateAllRegulations() {
  return apiPost('/admin/regulations/deactivate-all');
}

export async function createRegulation(data: Record<string, unknown>) {
  return apiPost('/admin/regulations', data);
}

export async function getRegulationSignedUrl(pdfUrl: string) {
  const result = await apiGet<{ signedUrl: string | null }>('/admin/regulations/signed-url', {
    path: pdfUrl,
  });
  return result?.signedUrl || null;
}

// ── Impersonation (user listing) ────────────────────────────────────

export async function fetchBrandRoleUserIds() {
  return apiGet<string[]>('/admin/impersonation/brand-role-user-ids');
}

export async function fetchBranchRoleUserIds(branchId: string) {
  return apiGet<string[]>('/admin/impersonation/branch-role-user-ids', { branchId });
}

export async function fetchOperationalStaffUserIds() {
  return apiGet<string[]>('/admin/impersonation/operational-staff-user-ids');
}

export async function fetchSuperadminUserIds() {
  return apiGet<string[]>('/admin/impersonation/superadmin-user-ids');
}

export async function fetchProfilesForImpersonation(params: {
  userIds: string[];
  search?: string;
  limit?: number;
}) {
  return apiPost('/admin/impersonation/profiles', params);
}

export async function fetchBrandRolesForUsers(userIds: string[]) {
  return apiPost('/admin/impersonation/brand-roles', { userIds });
}

export async function fetchBranchRolesForUsers(userIds: string[]) {
  return apiPost('/admin/impersonation/branch-roles', { userIds });
}

// ── User Role Modal ─────────────────────────────────────────────────

export async function updateBrandRole(roleRecordId: string, brandRoleKey: string | null) {
  return apiPut(`/permissions/brand-role/${roleRecordId}`, { brandRoleKey });
}

export async function insertBrandRole(userId: string, brandRoleKey: string) {
  return apiPost('/permissions/brand-role', { userId, brandRoleKey });
}

export async function deactivateBranchRole(roleRecordId: string) {
  return apiPut(`/permissions/branch-role/${roleRecordId}/deactivate`);
}

export async function updateBranchRoleById(
  roleRecordId: string,
  localRoleKey: string,
  defaultPosition: string | null,
) {
  return apiPut(`/permissions/branch-role/${roleRecordId}`, {
    localRoleKey,
    defaultPosition,
  });
}

export async function insertBranchRole(
  userId: string,
  branchId: string,
  localRoleKey: string,
  defaultPosition: string | null,
) {
  return apiPost('/permissions/branch-role', {
    userId,
    branchId,
    localRoleKey,
    defaultPosition,
  });
}

// ── useUsersData (consolidated users list) ──────────────────────────

export async function fetchAllProfiles() {
  return apiGet('/admin/users/profiles');
}

export async function fetchAllBrandRoles(profileIds: string[]) {
  return apiPost('/admin/users/brand-roles', { profileIds });
}

export async function fetchAllBranchRoles(profileIds: string[]) {
  return apiPost('/admin/users/branch-roles', { profileIds });
}

// ── Closure Config (full admin CRUD) ────────────────────────────────

export async function fetchAllClosureConfig() {
  return apiGet('/admin/closure-config');
}

export async function toggleClosureConfigItem(id: string, is_active: boolean) {
  return apiPut(`/admin/closure-config/${id}/toggle`, { is_active });
}

export async function addClosureConfigItem(params: {
  type: string;
  key: string;
  label: string;
  categoria_padre?: string;
  sort_order: number;
  is_active: boolean;
}) {
  return apiPost('/admin/closure-config', params);
}

export async function deleteClosureConfigItem(id: string) {
  return apiDelete(`/admin/closure-config/${id}`);
}

// ── Communications (brand-level admin) ──────────────────────────────

export async function fetchBrandCommunications() {
  return apiGet('/admin/communications');
}

export async function createBrandCommunication(data: Record<string, unknown>) {
  return apiPost('/admin/communications', data);
}

export async function deleteBrandCommunication(id: string) {
  return apiDelete(`/admin/communications/${id}`);
}

// ── Branches map for ContactMessagesPage ────────────────────────────

export async function fetchBranchesMap() {
  const data = await apiGet<Array<{ id: string; name: string }>>('/branches/id-name');
  const map: Record<string, string> = {};
  data?.forEach((b) => { map[b.id] = b.name; });
  return map;
}

// ── Recalcular todos los costos (CentroCostosPage) ─────────────────

export async function recalcularTodosLosCostos() {
  return apiPost('/admin/recalculate-all-costs');
}

// ── Promo items fetching (PromocionesPage) ──────────────────────────

export async function fetchPromoItemsWithExtras(promoId: string) {
  return apiGet(`/admin/promotions/${promoId}/items-with-extras`);
}
