import { apiGet, apiPost } from './apiClient';

export async function linkGuestOrders(body?: Record<string, unknown>) {
  return apiPost('/profiles/link-guest-orders', body ?? {});
}

export async function fetchOnboardingStatus(userId: string) {
  return apiGet<{ onboarding_completed_at: string | null } | null>(
    `/profiles/onboarding-status`,
  );
}

export async function completeOnboarding(userId: string) {
  return apiPost('/profiles/onboarding/complete', {});
}
