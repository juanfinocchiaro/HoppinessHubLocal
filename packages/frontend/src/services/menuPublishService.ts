import { apiGet, apiPost } from './apiClient';

export interface PublishMenuResult {
  snapshot_id: string;
  scope_type: string;
  scope_id: string;
  channel_code: string;
  item_count: number;
  published_at: string;
}

export interface MenuSnapshotRow {
  id: string;
  scope_type: string;
  scope_id: string;
  channel_code: string;
  item_count: number | null;
  published_at: string | null;
  published_by: string | null;
  is_current: boolean;
}

export async function publishMenu(params: {
  scope_type: 'brand' | 'branch';
  scope_id: string;
  channel_code: string;
}) {
  return apiPost<PublishMenuResult>('/menu/publish', params);
}

export async function fetchMenuSnapshots(params: {
  scope_type: string;
  scope_id: string;
  channel_code?: string;
}) {
  const q: Record<string, string> = { scope_type: params.scope_type, scope_id: params.scope_id };
  if (params.channel_code) q.channel_code = params.channel_code;
  return apiGet<MenuSnapshotRow[]>('/menu/snapshots', q);
}
