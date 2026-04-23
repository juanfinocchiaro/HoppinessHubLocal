import { apiGet } from './apiClient';
import type { SellableMenuResponse } from '@hoppiness/shared';

export type { SellableItem, SellableMenuResponse, SellableActivePromo, SellableComboComponent, SellableChannelCode } from '@hoppiness/shared';

/**
 * Fase 1: trae el menú vendible resuelto para (channel, branch, at).
 * Usa el endpoint server-authoritative, nunca combina tablas ad-hoc.
 */
export async function fetchSellableMenu(params: {
  channel: string;
  branch?: string | null;
  at?: string;
}) {
  const query: Record<string, string> = { channel: params.channel };
  if (params.branch) query.branch = params.branch;
  if (params.at) query.at = params.at;
  return apiGet<SellableMenuResponse>('/menu/sellable', query);
}
