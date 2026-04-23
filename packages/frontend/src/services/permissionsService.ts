import { apiGet, apiPost, apiDelete } from './apiClient';

export interface RoleRow {
  id: string;
  key: string;
  display_name: string;
  scope: 'brand' | 'branch';
  hierarchy_level: number;
  is_system: boolean;
}

export interface PermissionRow {
  id: string;
  key: string;
  label: string;
  scope: 'brand' | 'local';
  category: string;
  is_editable: boolean;
}

export interface RolePermissionRow {
  role_id: string;
  permission_id: string;
}

export async function fetchUserBrandRole(userId: string) {
  try {
    const data = await apiGet(`/permissions/impersonation-data/${userId}`);
    if (!data.brandRole) return null;
    return { id: '', user_id: userId, brand_role: data.brandRole, is_active: true };
  } catch {
    return null;
  }
}

export async function fetchUserBranchRoles(userId: string) {
  try {
    const data = await apiGet(`/permissions/impersonation-data/${userId}`);
    return data.branchRoles || [];
  } catch {
    return [];
  }
}

export async function fetchRoles(): Promise<RoleRow[]> {
  return apiGet('/permissions/roles');
}

export async function fetchPermissions(): Promise<PermissionRow[]> {
  return apiGet('/permissions/permissions');
}

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  return apiGet('/permissions/role-permissions');
}

export async function addRolePermission(roleId: string, permissionId: string) {
  return apiPost('/permissions/role-permissions', { role_id: roleId, permission_id: permissionId });
}

export async function removeRolePermission(roleId: string, permissionId: string) {
  return apiDelete('/permissions/role-permissions', { role_id: roleId, permission_id: permissionId });
}

export async function fetchUserProfile(userId: string) {
  return apiGet(`/permissions/user-profile/${userId}`);
}

export async function fetchImpersonationData(userId: string) {
  return apiGet(`/permissions/impersonation-data/${userId}`);
}

export async function checkIsSuperadmin(userId: string) {
  try {
    const data = await apiGet(`/permissions/impersonation-data/${userId}`);
    return data.brandRole === 'superadmin';
  } catch {
    return false;
  }
}

export async function fetchAccessibleBranches(brandRole: string | null, branchIds: string[]) {
  const data = await apiGet('/permissions/my-branches');
  return data || [];
}
