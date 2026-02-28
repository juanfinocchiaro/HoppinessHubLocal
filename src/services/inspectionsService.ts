import { supabase } from './supabaseClient';
import type {
  InspectionType,
  CreateInspectionInput,
  UpdateInspectionItemInput,
  InspectionActionItem,
} from '@/types/inspection';
import type { Json } from '@/integrations/supabase/types';

// ─── Templates ───

export async function fetchInspectionTemplates(type?: InspectionType) {
  let query = supabase
    .from('inspection_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (type) {
    query = query.eq('inspection_type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Inspections List ───

export async function fetchInspections(options: {
  branchId?: string;
  status?: string;
  inspectorId?: string;
  limit?: number;
}) {
  const { branchId, status, inspectorId, limit = 50 } = options;

  let query = supabase
    .from('branch_inspections')
    .select(`*, branch:branches(id, name, slug)`)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (branchId) query = query.eq('branch_id', branchId);
  if (status) query = query.eq('status', status);
  if (inspectorId) query = query.eq('inspector_id', inspectorId);

  const { data, error } = await query;
  if (error) throw error;

  const inspectorIds = [...new Set((data || []).map((d) => d.inspector_id).filter(Boolean))];
  const managerIds = [
    ...new Set((data || []).map((d) => d.present_manager_id).filter(Boolean)),
  ];
  const allUserIds = [...new Set([...inspectorIds, ...managerIds])];

  let profiles: Record<string, { id: string; full_name: string }> = {};
  if (allUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds);

    if (profilesData) {
      profiles = Object.fromEntries(profilesData.map((p) => [p.id, p]));
    }
  }

  return (data || []).map((row) => ({
    ...row,
    inspection_type: row.inspection_type as InspectionType,
    action_items: (Array.isArray(row.action_items)
      ? row.action_items
      : []) as unknown as InspectionActionItem[],
    inspector: profiles[row.inspector_id] || undefined,
    present_manager: row.present_manager_id ? profiles[row.present_manager_id] : undefined,
  }));
}

// ─── Single Inspection ───

export async function fetchInspection(inspectionId: string) {
  const { data: inspection, error: inspError } = await supabase
    .from('branch_inspections')
    .select(`*, branch:branches(id, name, slug)`)
    .eq('id', inspectionId)
    .single();

  if (inspError) throw inspError;

  const userIds = [inspection.inspector_id, inspection.present_manager_id].filter(Boolean);
  let profiles: Record<string, { id: string; full_name: string }> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesData) {
      profiles = Object.fromEntries(profilesData.map((p) => [p.id, p]));
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('inspection_items')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('sort_order');

  if (itemsError) throw itemsError;

  return {
    ...inspection,
    inspection_type: inspection.inspection_type as InspectionType,
    action_items: (Array.isArray(inspection.action_items)
      ? inspection.action_items
      : []) as unknown as InspectionActionItem[],
    inspector: profiles[inspection.inspector_id] || undefined,
    present_manager: inspection.present_manager_id
      ? profiles[inspection.present_manager_id]
      : undefined,
    items,
  };
}

// ─── Create ───

export async function createInspection(input: CreateInspectionInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: inspectionId, error } = await supabase.rpc('create_inspection_with_items', {
    p_branch_id: input.branch_id,
    p_inspection_type: input.inspection_type,
    p_inspector_id: user.id,
    p_present_manager_id: input.present_manager_id || null,
  });

  if (error) throw error;
  return { id: inspectionId };
}

// ─── Update Item ───

export async function updateInspectionItem(itemId: string, data: UpdateInspectionItemInput) {
  const updateData: Record<string, unknown> = {
    complies: data.complies,
    observations: data.observations || null,
  };
  if (data.photo_urls !== undefined) {
    updateData.photo_urls = data.photo_urls;
  }
  const { error } = await supabase.from('inspection_items').update(updateData).eq('id', itemId);
  if (error) throw error;
}

// ─── Update Inspection ───

export async function updateInspectionData(
  inspectionId: string,
  data: Partial<{
    present_manager_id: string | null;
    general_notes: string | null;
    critical_findings: string | null;
  }>,
) {
  const { error } = await supabase
    .from('branch_inspections')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inspectionId);

  if (error) throw error;
}

// ─── Complete ───

export async function completeInspection(
  inspectionId: string,
  data: { general_notes?: string; critical_findings?: string; action_items?: InspectionActionItem[] },
) {
  const { data: items, error: itemsError } = await supabase
    .from('inspection_items')
    .select('complies')
    .eq('inspection_id', inspectionId);

  if (itemsError) throw itemsError;

  const applicableItems = items.filter((i) => i.complies !== null);
  const compliantItems = applicableItems.filter((i) => i.complies === true);
  const score =
    applicableItems.length > 0
      ? Math.round((compliantItems.length / applicableItems.length) * 100)
      : 0;

  const { error } = await supabase
    .from('branch_inspections')
    .update({
      status: 'completada',
      completed_at: new Date().toISOString(),
      score_total: score,
      general_notes: data.general_notes || null,
      critical_findings: data.critical_findings || null,
      action_items: (data.action_items || []) as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inspectionId);

  if (error) throw error;
  return { inspectionId, score };
}

// ─── Cancel ───

export async function cancelInspection(inspectionId: string) {
  const { error } = await supabase
    .from('branch_inspections')
    .update({
      status: 'cancelada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inspectionId);

  if (error) throw error;
}

// ─── Delete ───

export async function deleteInspection(inspectionId: string) {
  const { error: itemsError } = await supabase
    .from('inspection_items')
    .delete()
    .eq('inspection_id', inspectionId);

  if (itemsError) throw itemsError;

  const { error } = await supabase.from('branch_inspections').delete().eq('id', inspectionId);

  if (error) throw error;
}

// ─── Upload Photo ───

export async function fetchInspectionStaffMembers(branchId: string) {
  const { data: roles } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('local_role', ['cajero', 'empleado']);

  if (!roles?.length) return [];

  const userIds = [...new Set(roles.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  return (profiles || []).map((p) => {
    const role = roles.find((r) => r.user_id === p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      local_role: role?.local_role || 'empleado',
    };
  });
}

export async function fetchInspectionStaffPresent(inspectionId: string) {
  const { data } = await supabase
    .from('inspection_staff_present')
    .select('id, user_id, uniform_ok, station_clean, observations')
    .eq('inspection_id', inspectionId);
  return data || [];
}

export async function addInspectionStaffPresent(inspectionId: string, userId: string) {
  const { data, error } = await supabase
    .from('inspection_staff_present')
    .insert({ inspection_id: inspectionId, user_id: userId })
    .select('id, user_id, uniform_ok, station_clean, observations')
    .single();
  if (error) throw error;
  return data;
}

export async function removeInspectionStaffPresent(recordId: string) {
  const { error } = await supabase.from('inspection_staff_present').delete().eq('id', recordId);
  if (error) throw error;
}

export async function updateInspectionStaffEvaluation(
  recordId: string,
  field: 'uniform_ok' | 'station_clean',
  value: boolean | null,
) {
  const { error } = await supabase
    .from('inspection_staff_present')
    .update({ [field]: value })
    .eq('id', recordId);
  if (error) throw error;
}

export async function updateInspectionStaffObservation(recordId: string, observations: string) {
  const { error } = await supabase
    .from('inspection_staff_present')
    .update({ observations: observations || null })
    .eq('id', recordId);
  if (error) throw error;
}

export async function uploadInspectionPhoto(
  inspectionId: string,
  itemKey: string,
  file: File,
) {
  const ext = file.name.split('.').pop();
  const fileName = `${inspectionId}/${itemKey}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('inspection-photos')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('inspection-photos').getPublicUrl(fileName);

  return publicUrl;
}
