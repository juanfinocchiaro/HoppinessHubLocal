import { supabase } from './supabaseClient';

export async function fetchProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('full_name, phone, avatar_url, birth_date')
    .eq('id', userId)
    .maybeSingle();
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
  return supabase.from('profiles').update(data).eq('id', userId);
}

export async function updateStaffProfile(
  userId: string,
  data: Record<string, unknown>,
) {
  return supabase.from('profiles').update(data).eq('id', userId);
}

export async function fetchFullProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserBranchRolesWithPins(userId: string) {
  const { data, error } = await supabase
    .from('user_branch_roles')
    .select('id, branch_id, local_role, clock_pin, branches!inner(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function checkClockPinAvailability(
  branchId: string,
  pin: string,
  excludeUserId: string | null,
) {
  const { data, error } = await supabase.rpc('is_clock_pin_available', {
    _branch_id: branchId,
    _pin: pin,
    _exclude_user_id: excludeUserId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function updateBranchRoleClockPin(roleId: string, pin: string) {
  const { error } = await supabase
    .from('user_branch_roles')
    .update({ clock_pin: pin })
    .eq('id', roleId);
  if (error) throw error;
}

export async function verifyBranchRoleClockPin(roleId: string) {
  const { data, error } = await supabase
    .from('user_branch_roles')
    .select('clock_pin')
    .eq('id', roleId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProfileCompleteness(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'phone, dni, birth_date, cbu, emergency_contact_name, emergency_contact_phone, avatar_url',
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchEmployeeDataCompleteness(userId: string) {
  const { data, error } = await supabase
    .from('employee_data')
    .select(
      'dni, birth_date, personal_address, emergency_contact, emergency_phone, bank_name, cbu, cuil, hire_date',
    )
    .eq('user_id', userId)
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function uploadStaffEvidence(filePath: string, file: File) {
  const { error } = await supabase.storage.from('staff-documents').upload(filePath, file);
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from('staff-documents').getPublicUrl(filePath);
  return publicUrl;
}

export async function fetchLatestRegulation() {
  const { data } = await supabase
    .from('regulations')
    .select('*')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchBranchNameById(branchId: string) {
  const { data } = await supabase
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .maybeSingle();
  return data;
}

export async function fetchBranchTeamRolesForRegulation(branchId: string) {
  const { data } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .neq('local_role', 'franquiciado')
    .neq('local_role', 'contador_local');
  return data || [];
}

export async function fetchProfilesByIds(userIds: string[]) {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);
  return data || [];
}

export async function fetchEmployeeDataByBranchAndUsers(branchId: string, userIds: string[]) {
  const { data } = await supabase
    .from('employee_data')
    .select('user_id, dni')
    .eq('branch_id', branchId)
    .in('user_id', userIds);
  return data || [];
}

export async function fetchRegulationSignatures(regulationId: string, userIds: string[]) {
  const { data } = await supabase
    .from('regulation_signatures')
    .select('*')
    .eq('regulation_id', regulationId)
    .in('user_id', userIds);
  return data || [];
}

export async function uploadRegulationSignatureFile(filePath: string, file: File) {
  const { error } = await supabase.storage
    .from('regulation-signatures')
    .upload(filePath, file);
  if (error) throw error;
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
  const { error } = await supabase.from('regulation_signatures').insert([data]);
  if (error) throw error;
}

export function getRegulationDocumentUrl(path: string): string {
  return supabase.storage.from('regulations').getPublicUrl(path).data.publicUrl;
}
