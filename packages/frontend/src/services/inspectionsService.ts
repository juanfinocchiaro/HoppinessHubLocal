import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './apiClient';
import type {
  InspectionType,
  CreateInspectionInput,
  UpdateInspectionItemInput,
  InspectionActionItem,
} from '@/types/inspection';

// ─── Templates ───

export async function fetchInspectionTemplates(type?: InspectionType) {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  return apiGet('/inspections/templates', params);
}

// ─── Inspections List ───

export async function fetchInspections(options: {
  branchId?: string;
  status?: string;
  inspectorId?: string;
  limit?: number;
}) {
  const params: Record<string, string> = {};
  if (options.branchId) params.branch_id = options.branchId;
  if (options.status) params.status = options.status;
  if (options.inspectorId) params.inspector_id = options.inspectorId;
  if (options.limit) params.limit = String(options.limit);
  return apiGet('/inspections', params);
}

// ─── Single Inspection ───

export async function fetchInspection(inspectionId: string) {
  return apiGet(`/inspections/${inspectionId}`);
}

// ─── Create ───

export async function createInspection(input: CreateInspectionInput) {
  return apiPost<{ id: string }>('/inspections', {
    branch_id: input.branch_id,
    inspection_type: input.inspection_type,
    present_manager_id: input.present_manager_id || null,
  });
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
  return apiPut(`/inspections/items/${itemId}`, updateData);
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
  return apiPut(`/inspections/${inspectionId}`, data);
}

// ─── Complete ───

export async function completeInspection(
  inspectionId: string,
  data: { general_notes?: string; critical_findings?: string; action_items?: InspectionActionItem[] },
) {
  return apiPost<{ inspectionId: string; score: number }>(
    `/inspections/${inspectionId}/complete`,
    data,
  );
}

// ─── Cancel ───

export async function cancelInspection(inspectionId: string) {
  return apiPost(`/inspections/${inspectionId}/cancel`);
}

// ─── Delete ───

export async function deleteInspection(inspectionId: string) {
  return apiDelete(`/inspections/${inspectionId}`);
}

// ─── Staff Members ───

export async function fetchInspectionStaffMembers(branchId: string) {
  return apiGet<Array<{ id: string; full_name: string; local_role: string }>>(
    `/inspections/staff-members/${branchId}`,
  );
}

export async function fetchInspectionStaffPresent(inspectionId: string) {
  return apiGet<
    Array<{
      id: string;
      user_id: string;
      uniform_ok: boolean | null;
      station_clean: boolean | null;
      observations: string | null;
    }>
  >(`/inspections/${inspectionId}/staff-present`);
}

export async function addInspectionStaffPresent(inspectionId: string, userId: string) {
  return apiPost<{
    id: string;
    user_id: string;
    uniform_ok: boolean | null;
    station_clean: boolean | null;
    observations: string | null;
  }>(`/inspections/${inspectionId}/staff-present`, { user_id: userId });
}

export async function removeInspectionStaffPresent(recordId: string) {
  return apiDelete(`/inspections/staff-present/${recordId}`);
}

export async function updateInspectionStaffEvaluation(
  recordId: string,
  field: 'uniform_ok' | 'station_clean',
  value: boolean | null,
) {
  return apiPut(`/inspections/staff-present/${recordId}/evaluation`, { field, value });
}

export async function updateInspectionStaffObservation(recordId: string, observations: string) {
  return apiPut(`/inspections/staff-present/${recordId}/observation`, {
    observations: observations || null,
  });
}

// ─── Upload Photo ───

export async function uploadInspectionPhoto(
  inspectionId: string,
  itemKey: string,
  file: File,
) {
  const ext = file.name.split('.').pop();
  const fileName = `${inspectionId}/${itemKey}_${Date.now()}.${ext}`;
  const result = await apiUpload<{ url: string }>(
    `/storage/upload/inspection-photos?path=${encodeURIComponent(fileName)}`,
    file,
  );
  return result.url ?? `/uploads/inspection-photos/${fileName}`;
}
