import { apiGet, apiPost } from './apiClient';
import type { SavedAddress } from '@/types/checkout';

export async function fetchUserProfile(userId: string) {
  return apiGet<{ full_name: string; phone: string; email: string } | null>(
    `/profiles/me`,
  );
}

export async function fetchSavedAddresses(userId: string) {
  return apiGet<SavedAddress[]>(`/webapp/addresses`, { user_id: userId });
}

export async function fetchGoogleMapsApiKey() {
  try {
    const data = await apiGet<{ apiKey: string }>('/webapp/google-maps-key');
    return data?.apiKey ?? null;
  } catch {
    return null;
  }
}

export async function fetchWebappConfigPayments(branchId: string) {
  return apiGet<{ service_schedules?: unknown } | null>(
    `/webapp/config/${branchId}/payments`,
  );
}

export async function createWebappOrder(payload: unknown) {
  try {
    const data = await apiPost('/webapp/orders', payload);
    return { data, error: null };
  } catch (error: unknown) {
    return { data: null, error };
  }
}

export async function createMercadoPagoCheckout(payload: unknown) {
  try {
    const data = await apiPost('/payments/checkout', payload);
    return { data, error: null };
  } catch (error: unknown) {
    return { data: null, error };
  }
}
