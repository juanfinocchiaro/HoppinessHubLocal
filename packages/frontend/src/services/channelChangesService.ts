import { apiGet, apiPost, apiPut } from './apiClient';

export type ChangeType =
  | 'new_article'
  | 'price_change'
  | 'deactivation'
  | 'activation'
  | 'new_promotion'
  | 'promotion_change'
  | 'promotion_end';

export type EntityType = 'menu_item' | 'promotion';

export interface ChannelPendingChange {
  id: string;
  channel_code: string;
  change_type: ChangeType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, unknown> | null;
  created_at: string | null;
  created_by: string | null;
  included_in_pdf_id: string | null;
}

export interface ChannelPdfExport {
  id: string;
  channel_code: string;
  generated_at: string | null;
  generated_by: string | null;
  delivered_to: string | null;
  confirmed_loaded_at: string | null;
  change_count: number | null;
}

export interface ChannelExportResult {
  export_id: string;
  channel_code: string;
  generated_at: string;
  change_count: number;
  changes: ChannelPendingChange[];
}

export async function fetchPendingChanges(channelCode?: string) {
  return apiGet<ChannelPendingChange[]>('/channels/pending-changes', channelCode ? { channel_code: channelCode } : undefined);
}

export async function fetchPendingCounts() {
  return apiGet<Record<string, number>>('/channels/pending-counts');
}

export async function generateChannelExport(channelCode: string, deliveredTo?: string | null) {
  return apiPost<ChannelExportResult>(`/channels/${channelCode}/export`, { delivered_to: deliveredTo ?? null });
}

export async function fetchChannelExports(channelCode?: string) {
  return apiGet<ChannelPdfExport[]>('/channels/exports', channelCode ? { channel_code: channelCode } : undefined);
}

export async function confirmChannelExport(exportId: string) {
  return apiPut<ChannelPdfExport>(`/channels/exports/${exportId}/confirm`, {});
}
