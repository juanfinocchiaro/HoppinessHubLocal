import { supabase } from './supabaseClient';

// ── Team Members (basic) ────────────────────────────────────────────

export async function fetchBranchTeamMembersBasic(branchId: string) {
  const { data, error } = await supabase
    .from('user_branch_roles')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (error) throw error;

  const userIds = data?.map((r) => r.user_id) || [];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  if (profilesError) throw profilesError;
  return (profiles || []).map((p) => ({ user_id: p.id, full_name: p.full_name }));
}

// ── Warnings CRUD ───────────────────────────────────────────────────

export async function fetchBranchWarnings(branchId: string) {
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = [
    ...new Set([
      ...(data?.map((w) => w.user_id).filter(Boolean) || []),
      ...(data?.map((w) => w.issued_by).filter(Boolean) || []),
    ]),
  ];

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    profiles?.forEach((p) => {
      if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
    });
  }

  return (data || []).map((w) => ({
    ...w,
    employee_name: w.user_id ? profileMap[w.user_id] : 'N/A',
    issuer_name: w.issued_by ? profileMap[w.issued_by] : 'Sistema',
  }));
}

export async function createWarningRecord(params: {
  userId: string;
  branchId: string;
  warningType: string;
  description: string;
  warningDate: string;
  issuedBy: string;
}) {
  const { data, error } = await supabase
    .from('warnings')
    .insert({
      user_id: params.userId,
      branch_id: params.branchId,
      warning_type: params.warningType,
      description: params.description,
      warning_date: params.warningDate,
      issued_by: params.issuedBy,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function uploadWarningSignature(warningId: string, userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${warningId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('warning-signatures')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('warning-signatures').getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('warnings')
    .update({ signed_document_url: urlData.publicUrl })
    .eq('id', warningId);

  if (updateError) throw updateError;
}

export async function uploadWarningSignatureWithAck(
  warningId: string,
  userId: string,
  file: File,
) {
  const filePath = `${userId}/${warningId}_${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('warning-signatures')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('warnings')
    .update({ signed_document_url: filePath, acknowledged_at: new Date().toISOString() })
    .eq('id', warningId);

  if (updateError) throw updateError;
}

// ── Warning Employee Profile (for WarningModal) ─────────────────────

export async function fetchWarningEmployeeProfile(userId: string, branchId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  const { data: empData } = await supabase
    .from('employee_data')
    .select('dni')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle();

  const { data: role } = await supabase
    .from('user_branch_roles')
    .select('local_role')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle();

  return {
    fullName: profile?.full_name || 'Sin nombre',
    dni: empData?.dni || undefined,
    role: role?.local_role || 'empleado',
  };
}

export async function fetchWarningBranchName(branchId: string) {
  const { data } = await supabase
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .maybeSingle();
  return data;
}

export async function fetchWarningIssuerName(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function sendWarningNotification(params: {
  warningId: string;
  employeeId: string;
  branchId: string;
  warningType: string;
  description: string;
  issuedByName?: string;
}) {
  return supabase.functions.invoke('send-warning-notification', {
    body: {
      warning_id: params.warningId,
      employee_id: params.employeeId,
      branch_id: params.branchId,
      warning_type: params.warningType,
      description: params.description,
      issued_by_name: params.issuedByName,
    },
  });
}

// ── My Warnings (employee view) ─────────────────────────────────────

export async function fetchMyWarnings(userId: string) {
  const { data, error } = await supabase
    .from('warnings')
    .select(
      'id, warning_type, description, warning_date, acknowledged_at, signed_document_url, issued_by',
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('warning_date', { ascending: false })
    .limit(10);

  if (error) throw error;

  const issuerIds = [...new Set(data?.map((w) => w.issued_by).filter(Boolean))];
  let issuerMap: Record<string, string> = {};

  if (issuerIds.length > 0) {
    const { data: issuers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', issuerIds);

    issuers?.forEach((i) => {
      if (i.id) issuerMap[i.id] = i.full_name || '';
    });
  }

  return (data || []).map((w) => ({
    ...w,
    issuer: w.issued_by ? { full_name: issuerMap[w.issued_by] || 'Desconocido' } : undefined,
  }));
}

export async function acknowledgeWarning(warningId: string) {
  const { error } = await supabase
    .from('warnings')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', warningId);

  if (error) throw error;
}
