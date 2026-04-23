import { apiGet } from './apiClient';
import { ORDER_ACTIVE_STATES } from '@/lib/constants';
import { subscribeToEvent } from '@/hooks/useSocket';

const ACTIVE_STATES = ORDER_ACTIVE_STATES as unknown as string[];

export async function fetchUserOrders(userId: string, limit = 30) {
  return apiGet(`/webapp/orders/user/${userId}`, { limit: String(limit) });
}

export async function fetchBranchNamesAndSlugs(branchIds: string[]) {
  if (branchIds.length === 0) return {};
  return apiGet<Record<string, { name: string; slug: string | null }>>(
    '/webapp/branches/names',
    { ids: branchIds.join(',') },
  );
}

export async function fetchActiveOrdersForUser(userId: string) {
  return apiGet(`/webapp/orders/user/${userId}/active`, {
    states: ACTIVE_STATES.join(','),
  });
}

export async function fetchActiveOrdersByTrackingCode(code: string) {
  return apiGet(`/webapp/orders/tracking/${code}/active`, {
    states: ACTIVE_STATES.join(','),
  });
}

export async function fetchActiveOrderWithBranch(userId: string) {
  return apiGet(`/webapp/orders/user/${userId}/active-with-branch`, {
    states: ACTIVE_STATES.join(','),
  });
}

export async function fetchOrderByTrackingWithBranch(code: string) {
  return apiGet(`/webapp/orders/tracking/${code}/with-branch`, {
    states: ACTIVE_STATES.join(','),
  });
}

export async function fetchPendingWebappCount(branchId: string): Promise<number> {
  return apiGet<number>(`/orders/branch/${branchId}/pending-webapp-count`);
}

export function subscribeToPedidosChanges(
  branchId: string,
  _channelName: string,
  callback: () => void,
) {
  const unsub = subscribeToEvent('order:updated', callback, `branch:${branchId}`);
  return { unsubscribe: unsub };
}

export function unsubscribeChannel(channel: { unsubscribe: () => void }) {
  channel?.unsubscribe?.();
}

export async function fetchOrderStatuses(trackingCodes: string[]) {
  if (trackingCodes.length === 0) return [];
  return apiGet(`/webapp/orders/statuses`, { codes: trackingCodes.join(',') });
}

export async function fetchLastUserOrder(userId: string) {
  return apiGet(`/webapp/orders/user/${userId}/last`);
}

export async function fetchBranchNameAndSlug(branchId: string) {
  const data = await apiGet(`/webapp/branches/${branchId}/name`);
  return data || { name: '', slug: null };
}

export function subscribeToTrackingUpdates(
  trackingCode: string,
  _channelName: string,
  callback: () => void,
) {
  const unsub = subscribeToEvent('order:tracking', callback, `tracking:${trackingCode}`);
  return { unsubscribe: unsub };
}

export function subscribeToChatMessages(
  pedidoId: string,
  _channelName: string,
  callback: (payload: unknown) => void,
) {
  const unsub = subscribeToEvent('chat:message', callback, `order:${pedidoId}`);
  return { unsubscribe: unsub };
}

export function subscribeToDeliveryTracking(
  pedidoId: string,
  _channelName: string,
  callback: (payload: unknown) => void,
) {
  const unsub = subscribeToEvent('delivery:tracking', callback, `order:${pedidoId}`);
  return { unsubscribe: unsub };
}
