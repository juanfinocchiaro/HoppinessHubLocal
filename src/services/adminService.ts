/**
 * adminService - Supabase operations for admin (Mi Marca) pages/components
 * Covers: branches CRUD, central team, audit logs, reports, regulations,
 *         impersonation, user management, brand-level sales
 */
import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

// ── Branches ────────────────────────────────────────────────────────

export async function fetchAllBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchActiveBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchActiveBranchNames() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchBranchesIdName() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchBranchBySlug(slug: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchBranchForDelivery(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, slug, latitude, longitude')
    .eq('id', branchId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBranch(branchId: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from('branches')
    .update(values)
    .eq('id', branchId);
  if (error) throw error;
}

export async function createBranch(values: {
  name: string;
  address: string;
  city: string | null;
  slug: string;
  is_active: boolean;
}) {
  const { error } = await supabase.from('branches').insert(values);
  if (error) throw error;
}

export async function upsertPosConfig(branchId: string, posEnabled: boolean) {
  const { error } = await supabase
    .from('pos_config')
    .upsert(
      { branch_id: branchId, pos_enabled: posEnabled, updated_at: new Date().toISOString() },
      { onConflict: 'branch_id' },
    );
  if (error) throw error;
}

// ── Brand Home (monthly stats) ──────────────────────────────────────

export async function fetchBrandMonthlyStats(firstDay: string, lastDay: string) {
  const [closuresRes, clockRes] = await Promise.all([
    supabase
      .from('shift_closures')
      .select('branch_id, total_invoiced, total_burgers')
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase
      .from('clock_entries')
      .select('user_id, branch_id, entry_type, created_at, schedule_id')
      .gte('created_at', `${firstDay}T00:00:00`)
      .lte('created_at', `${lastDay}T23:59:59`)
      .order('created_at', { ascending: true }),
  ]);

  return {
    closures: closuresRes.data || [],
    clockEntries: clockRes.data || [],
  };
}

// ── Brand Daily Sales ───────────────────────────────────────────────

export async function fetchBrandClosures(from: string, to: string) {
  const { data, error } = await supabase
    .from('shift_closures')
    .select('*')
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return data || [];
}

// ── Central Team ────────────────────────────────────────────────────

export async function fetchCentralTeamMembers() {
  const { data: assignments, error: rolesError } = await supabase
    .from('user_role_assignments')
    .select('id, user_id, created_at, roles!inner(key, scope)')
    .eq('roles.scope', 'brand')
    .is('branch_id', null)
    .eq('is_active', true)
    .order('created_at');

  if (rolesError) throw rolesError;
  if (!assignments || assignments.length === 0) return [];

  const userIds = assignments.map((r) => r.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return assignments.map((role) => {
    const profile = profileMap.get(role.user_id);
    return {
      id: role.id,
      user_id: role.user_id,
      email: profile?.email || '',
      full_name: profile?.full_name || null,
      brand_role: (role.roles as any).key,
      created_at: role.created_at,
    };
  });
}

export async function removeCentralTeamMember(userId: string) {
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ is_active: false })
    .eq('user_id', userId)
    .is('branch_id', null);
  if (error) throw error;
}

export async function inviteCentralTeamMember(email: string, roleKey: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    throw new Error('Usuario no encontrado. Debe registrarse primero.');
  }

  const userId = profile.id;

  // Look up the role_id from the roles table
  const { data: roleRow, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('key', roleKey)
    .eq('scope', 'brand')
    .single();
  if (roleError || !roleRow) throw new Error(`Rol '${roleKey}' no encontrado`);

  const { data: existing } = await supabase
    .from('user_role_assignments')
    .select('id')
    .eq('user_id', userId)
    .is('branch_id', null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_role_assignments')
      .update({ role_id: roleRow.id, is_active: true })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('user_role_assignments').insert({
      user_id: userId,
      role_id: roleRow.id,
      branch_id: null,
      is_active: true,
    });
    if (error) throw error;
  }
}

// ── Branch Team ─────────────────────────────────────────────────────

export async function fetchBranchTeam(branchId: string) {
  const { data: teamRoles, error: teamError } = await supabase
    .from('user_role_assignments')
    .select('user_id, default_position, roles!inner(key)')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (teamError) throw teamError;
  if (!teamRoles?.length) return [];

  const userIds = teamRoles.map((t) => t.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return teamRoles.map((t) => ({
    user_id: t.user_id,
    local_role: (t.roles as any).key,
    default_position: t.default_position,
    profile: profileMap.get(t.user_id) ?? null,
  }));
}

export async function searchUsersByEmail(email: string, limit = 5) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .ilike('email', `%${email}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function updateBranchMemberRole(
  userId: string,
  branchId: string,
  newRoleKey: string,
) {
  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', newRoleKey)
    .eq('scope', 'branch')
    .single();
  if (!roleRow) throw new Error(`Rol '${newRoleKey}' no encontrado`);

  const { error } = await supabase
    .from('user_role_assignments')
    .update({ role_id: roleRow.id })
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('is_active', true);
  if (error) throw error;
}

export async function updateBranchMemberPosition(
  userId: string,
  branchId: string,
  position: string | null,
) {
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ default_position: position })
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('is_active', true);
  if (error) throw error;
}

export async function addBranchMember(
  userId: string,
  branchId: string,
  roleKey: string,
  position: string | null,
) {
  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', roleKey)
    .eq('scope', 'branch')
    .single();
  if (!roleRow) throw new Error(`Rol '${roleKey}' no encontrado`);

  const { error } = await supabase.from('user_role_assignments').insert({
    user_id: userId,
    branch_id: branchId,
    role_id: roleRow.id,
    default_position: position,
    is_active: true,
  });
  if (error) throw error;
}

export async function removeBranchMember(userId: string, branchId: string) {
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('branch_id', branchId);
  if (error) throw error;
}

// ── Inspection-related branch queries ───────────────────────────────

export async function fetchBranchManagers(branchId: string) {
  const { data: roles } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key)')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .eq('roles.key', 'encargado');

  if (!roles?.length) return [];

  const userIds = [...new Set(roles.map((r: any) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  return profiles || [];
}

export async function fetchBranchStaffMembers(branchId: string) {
  const { data: roles } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key)')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .neq('roles.key', 'franquiciado');

  if (!roles?.length) return [];

  const userIds = [...new Set(roles.map((r: any) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  return profiles || [];
}

// ── Audit Logs ──────────────────────────────────────────────────────

export async function fetchAuditLogs(params: {
  page: number;
  pageSize: number;
  search?: string;
  tableFilter?: string;
}) {
  let q = supabase
    .from('audit_logs')
    .select('*, profiles:user_id(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(params.page * params.pageSize, (params.page + 1) * params.pageSize - 1);

  if (params.tableFilter) q = q.eq('table_name', params.tableFilter);
  if (params.search)
    q = q.or(
      `table_name.ilike.%${params.search}%,action.ilike.%${params.search}%`,
    );

  const { data, error, count } = await q;
  if (error) throw error;
  return { logs: data || [], total: count || 0 };
}

export async function fetchAuditLogTables() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('table_name')
    .limit(500);
  if (error) throw error;
  const unique = [...new Set((data || []).map((d) => d.table_name))].sort();
  return unique;
}

// ── Reports ─────────────────────────────────────────────────────────

export async function fetchGastosSummary(periodo: string) {
  const { data, error } = await fromUntyped('expenses')
    .select('branch_id, amount')
    .eq('period', periodo)
    .is('deleted_at', null)
    .neq('status', 'pendiente_aprobacion');
  if (error) throw error;
  return data || [];
}

export async function fetchClockEntriesSummary(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('clock_entries')
    .select('branch_id, entry_type, created_at, schedule_id')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);
  if (error) throw error;
  return data || [];
}

// ── Ventas Mensuales Marca ──────────────────────────────────────────

export async function fetchVentasMensualesMarca(periodo: string) {
  const { data, error } = await fromUntyped('branch_monthly_sales')
    .select('*')
    .eq('period', periodo)
    .is('deleted_at', null);
  if (error) throw error;
  return (data as any[]) || [];
}

// ── Regulations ─────────────────────────────────────────────────────

export async function fetchAllRegulations() {
  const { data } = await supabase
    .from('regulations')
    .select('*')
    .order('version', { ascending: false });
  return data || [];
}

export async function fetchRegulationSignatureStats(regulationId: string) {
  const { data: employeeRoles } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key)')
    .eq('is_active', true)
    .neq('roles.key', 'franquiciado');

  const uniqueEmployees = new Set(employeeRoles?.map((r) => r.user_id) || []);
  const totalEmployees = uniqueEmployees.size;

  const { count: signedCount } = await supabase
    .from('regulation_signatures')
    .select('*', { count: 'exact', head: true })
    .eq('regulation_id', regulationId);

  return { total: totalEmployees || 0, signed: signedCount || 0 };
}

export async function uploadRegulationPdf(filePath: string, file: File) {
  const { error } = await supabase.storage
    .from('regulations')
    .upload(filePath, file);
  if (error) throw error;
}

export async function deactivateAllRegulations() {
  await supabase.from('regulations').update({ is_active: false }).neq('version', 0);
}

export async function createRegulation(data: Record<string, unknown>) {
  const { error } = await supabase.from('regulations').insert([data] as any);
  if (error) throw error;
}

export async function getRegulationSignedUrl(pdfUrl: string) {
  const { data } = await supabase.storage.from('regulations').createSignedUrl(pdfUrl, 3600);
  return data?.signedUrl || null;
}

// ── Impersonation (user listing) ────────────────────────────────────

export async function fetchBrandRoleUserIds() {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(scope)')
    .eq('roles.scope', 'brand')
    .is('branch_id', null)
    .eq('is_active', true);
  return data?.map((u) => u.user_id) || [];
}

export async function fetchBranchRoleUserIds(branchId: string) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true);
  return data?.map((u) => u.user_id) || [];
}

export async function fetchOperationalStaffUserIds() {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key)')
    .in('roles.key', ['empleado', 'cajero', 'encargado'])
    .eq('is_active', true);
  const unique = [...new Set(data?.map((u) => u.user_id) || [])];
  return unique;
}

export async function fetchSuperadminUserIds() {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key)')
    .eq('roles.key', 'superadmin')
    .eq('is_active', true);
  return data?.map((u) => u.user_id) || [];
}

export async function fetchProfilesForImpersonation(params: {
  userIds: string[];
  search?: string;
  limit?: number;
}) {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('is_active', true)
    .in('id', params.userIds)
    .order('full_name')
    .limit(params.limit || 50);

  if (params.search?.trim()) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchBrandRolesForUsers(userIds: string[]) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id, roles!inner(key, scope)')
    .in('user_id', userIds)
    .eq('is_active', true)
    .eq('roles.scope', 'brand')
    .is('branch_id', null);
  return (data || []).map((d) => ({ user_id: d.user_id, brand_role: (d.roles as any).key }));
}

export async function fetchBranchRolesForUsers(userIds: string[]) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('user_id, branch_id, roles!inner(key, scope), branches!inner(name)')
    .in('user_id', userIds)
    .eq('is_active', true)
    .eq('roles.scope', 'branch');
  return (data || []).map((d) => ({
    user_id: d.user_id,
    local_role: (d.roles as any).key,
    branch_id: d.branch_id,
    branches: d.branches,
  }));
}

// ── User Role Modal ─────────────────────────────────────────────────

export async function updateBrandRole(roleRecordId: string, brandRoleKey: string | null) {
  if (!brandRoleKey) {
    const { error } = await supabase
      .from('user_role_assignments')
      .update({ is_active: false })
      .eq('id', roleRecordId);
    if (error) throw error;
    return;
  }
  const { data: roleRow } = await supabase.from('roles').select('id').eq('key', brandRoleKey).eq('scope', 'brand').single();
  if (!roleRow) throw new Error(`Rol '${brandRoleKey}' no encontrado`);
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ role_id: roleRow.id, is_active: true })
    .eq('id', roleRecordId);
  if (error) throw error;
}

export async function insertBrandRole(userId: string, brandRoleKey: string) {
  const { data: roleRow } = await supabase.from('roles').select('id').eq('key', brandRoleKey).eq('scope', 'brand').single();
  if (!roleRow) throw new Error(`Rol '${brandRoleKey}' no encontrado`);
  const { error } = await supabase.from('user_role_assignments').insert({
    user_id: userId,
    role_id: roleRow.id,
    branch_id: null,
    is_active: true,
  });
  if (error) throw error;
}

export async function deactivateBranchRole(roleRecordId: string) {
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ is_active: false })
    .eq('id', roleRecordId);
  if (error) throw error;
}

export async function updateBranchRoleById(
  roleRecordId: string,
  localRoleKey: string,
  defaultPosition: string | null,
) {
  const { data: roleRow } = await supabase.from('roles').select('id').eq('key', localRoleKey).eq('scope', 'branch').single();
  if (!roleRow) throw new Error(`Rol '${localRoleKey}' no encontrado`);
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ role_id: roleRow.id, default_position: defaultPosition })
    .eq('id', roleRecordId);
  if (error) throw error;
}

export async function insertBranchRole(
  userId: string,
  branchId: string,
  localRoleKey: string,
  defaultPosition: string | null,
) {
  const { data: roleRow } = await supabase.from('roles').select('id').eq('key', localRoleKey).eq('scope', 'branch').single();
  if (!roleRow) throw new Error(`Rol '${localRoleKey}' no encontrado`);
  const { error } = await supabase.from('user_role_assignments').insert({
    user_id: userId,
    branch_id: branchId,
    role_id: roleRow.id,
    default_position: defaultPosition,
    is_active: true,
  });
  if (error) throw error;
}

// ── useUsersData (consolidated users list) ──────────────────────────

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllBrandRoles(profileIds: string[]) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('id, user_id, roles!inner(key, scope)')
    .eq('is_active', true)
    .eq('roles.scope', 'brand')
    .is('branch_id', null)
    .in('user_id', profileIds);
  return (data || []).map((d) => ({ id: d.id, user_id: d.user_id, brand_role: (d.roles as any).key }));
}

export async function fetchAllBranchRoles(profileIds: string[]) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('id, user_id, branch_id, default_position, clock_pin, is_active, roles!inner(key, scope)')
    .eq('is_active', true)
    .eq('roles.scope', 'branch')
    .in('user_id', profileIds);
  return (data || []).map((d) => ({
    id: d.id,
    user_id: d.user_id,
    branch_id: d.branch_id,
    local_role: (d.roles as any).key,
    default_position: d.default_position,
    clock_pin: d.clock_pin,
    is_active: d.is_active,
  }));
}

// ── Closure Config (full admin CRUD) ────────────────────────────────

export async function fetchAllClosureConfig() {
  const { data, error } = await supabase
    .from('brand_closure_config')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function toggleClosureConfigItem(id: string, is_active: boolean) {
  const { error } = await supabase
    .from('brand_closure_config')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function addClosureConfigItem(params: {
  type: string;
  key: string;
  label: string;
  categoria_padre?: string;
  sort_order: number;
  is_active: boolean;
}) {
  const { error } = await supabase.from('brand_closure_config').insert(params);
  if (error) throw error;
}

export async function deleteClosureConfigItem(id: string) {
  const { error } = await supabase.from('brand_closure_config').delete().eq('id', id);
  if (error) throw error;
}

// ── Communications (brand-level admin) ──────────────────────────────

export async function fetchBrandCommunications() {
  const { data, error } = await supabase
    .from('communications')
    .select('*, communication_reads(user_id, confirmed_at)')
    .eq('source_type', 'brand')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBrandCommunication(data: Record<string, unknown>) {
  const { error } = await supabase.from('communications').insert(data as any);
  if (error) throw error;
}

export async function deleteBrandCommunication(id: string) {
  const { error } = await supabase.from('communications').delete().eq('id', id);
  if (error) throw error;
}

// ── Branches map for ContactMessagesPage ────────────────────────────

export async function fetchBranchesMap() {
  const { data, error } = await supabase.from('branches').select('id, name');
  if (error) throw error;
  const map: Record<string, string> = {};
  data?.forEach((b) => { map[b.id] = b.name; });
  return map;
}

// ── Recalcular todos los costos (CentroCostosPage) ─────────────────

export async function recalcularTodosLosCostos() {
  await supabase.rpc('recalculate_all_costs' as never);
}

// ── Promo items fetching (PromocionesPage) ──────────────────────────

export async function fetchPromoItemsWithExtras(promoId: string) {
  const { data } = await fromUntyped('promotion_items')
    .select('*, menu_items!inner(name, image_url, base_price)')
    .eq('promocion_id', promoId);

  const promoItemIds = (data || []).map((d: any) => d.id as string);
  const extrasMap = new Map<string, Array<{ extra_item_carta_id: string; quantity: number; nombre: string; precio_extra: number }>>();

  if (promoItemIds.length > 0) {
    const { data: extrasData } = await fromUntyped('promotion_item_extras')
      .select('promocion_item_id, extra_item_carta_id, quantity')
      .in('promocion_item_id', promoItemIds);

    if (extrasData && (extrasData as any[]).length > 0) {
      const extraItemIds = [...new Set((extrasData as any[]).map((e: any) => e.extra_item_carta_id as string))];
      const { data: extraInfo } = await fromUntyped('menu_items').select('id, name, base_price').in('id', extraItemIds);
      const infoMap = new Map((extraInfo as any[] || []).map((n: any) => [n.id, { nombre: n.name, precio: Number(n.base_price ?? 0) }]));

      for (const e of extrasData as any[]) {
        const info = infoMap.get(e.extra_item_carta_id as string);
        const list = extrasMap.get(e.promocion_item_id as string) || [];
        list.push({
          extra_item_carta_id: e.extra_item_carta_id as string,
          quantity: e.quantity as number,
          nombre: info?.nombre || '',
          precio_extra: info?.precio || 0,
        });
        extrasMap.set(e.promocion_item_id as string, list);
      }
    }
  }

  return ((data as any[]) || []).map((d: any) => {
    const ic = d.menu_items as { name: string; image_url?: string | null; base_price: number } | null;
    return {
      item_carta_id: d.item_carta_id as string,
      name: ic?.name || '',
      image_url: ic?.image_url,
      base_price: Number(ic?.base_price || 0),
      precio_promo: Number(d.promo_price ?? 0),
      preconfigExtras: extrasMap.get(d.id as string) || undefined,
    };
  });
}
