import { supabase } from './supabaseClient';

export async function fetchUserBrandRole(userId: string) {
  const { data, error } = await supabase
    .from('user_roles_v2')
    .select('id, user_id, brand_role, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserBranchRoles(userId: string) {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_branches', {
    _user_id: userId,
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return (rpcData as { branch_id: string; local_role: string }[]).map((r) => ({
      branch_id: r.branch_id,
      local_role: r.local_role,
    }));
  }

  const { data: ubrData, error: ubrError } = await supabase
    .from('user_branch_roles')
    .select('branch_id, local_role')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!ubrError && ubrData && ubrData.length > 0) {
    return ubrData;
  }

  const { data: urv2, error: urv2Error } = await supabase
    .from('user_roles_v2')
    .select('branch_ids, local_role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .not('branch_ids', 'is', null)
    .not('local_role', 'is', null)
    .maybeSingle();

  if (urv2Error || !urv2?.branch_ids?.length || !urv2.local_role) return [];

  return urv2.branch_ids.map((branch_id: string) => ({
    branch_id,
    local_role: urv2.local_role as string,
  }));
}

// ── Permission Config ────────────────────────────────────────────────

export async function fetchPermissionConfig() {
  const { data, error } = await supabase
    .from('permission_config')
    .select('*')
    .order('scope')
    .order('category')
    .order('permission_label');
  if (error) throw error;
  return data || [];
}

export async function updatePermissionRoles(permissionId: string, newRoles: string[]) {
  const { error } = await supabase
    .from('permission_config')
    .update({ allowed_roles: newRoles })
    .eq('id', permissionId);
  if (error) throw error;
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchImpersonationData(userId: string) {
  const { data: brandRoleData } = await supabase
    .from('user_roles_v2')
    .select('brand_role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  const { data: branchRolesData } = await supabase
    .from('user_branch_roles')
    .select('branch_id, local_role')
    .eq('user_id', userId)
    .eq('is_active', true);

  const branchRoles = (branchRolesData || []).map((r) => ({
    branch_id: r.branch_id,
    local_role: r.local_role,
  }));

  let branches: any[] = [];

  if (brandRoleData?.brand_role === 'superadmin') {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('name');
    branches = data || [];
  } else if (branchRoles.length > 0) {
    const branchIds = branchRoles.map((r) => r.branch_id);
    const { data } = await supabase
      .from('branches')
      .select('*')
      .in('id', branchIds)
      .eq('is_active', true)
      .order('name');
    branches = data || [];
  }

  return {
    brandRole: brandRoleData?.brand_role || null,
    branchRoles,
    branches,
  };
}

export async function checkIsSuperadmin(userId: string) {
  const { data } = await supabase
    .from('user_roles_v2')
    .select('brand_role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.brand_role === 'superadmin';
}

export async function fetchAccessibleBranches(
  brandRole: string | null,
  branchIds: string[],
) {
  if (brandRole === 'superadmin') {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return data || [];
  }

  if (branchIds.length > 0) {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .in('id', branchIds)
      .eq('is_active', true)
      .order('name');
    return data || [];
  }

  return [];
}
