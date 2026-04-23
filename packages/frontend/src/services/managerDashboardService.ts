import { apiGet } from './apiClient';

export async function fetchCurrentlyWorking(branchId: string) {
  return apiGet<Array<{
    id: string;
    user_id: string;
    check_in: string;
    profile: { id: string; full_name: string; avatar_url: string | null } | undefined;
    minutesWorking: number;
  }>>(`/branches/${branchId}/dashboard/working`);
}

export async function fetchPendingItems(branchId: string) {
  return apiGet<{
    pendingRequests: number;
    unreadComms: number;
    pendingSignatures: number;
    total: number;
  }>(`/branches/${branchId}/dashboard/pending`);
}

export async function fetchPosSalesToday(branchId: string) {
  return apiGet<{
    totalVendido: number;
    cantidad: number;
    ticketPromedio: number;
  }>(`/branches/${branchId}/dashboard/sales-today`);
}
