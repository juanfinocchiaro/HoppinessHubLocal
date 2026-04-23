import { apiGet, apiPost, apiPut } from './apiClient.js';

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: number;
  price_monthly_usd: number;
  price_yearly_usd: number;
  max_locations: number | null;
  features_json: string[];
  is_active: boolean;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'read_only'
  | 'suspended'
  | 'cancelled';

export interface Subscription {
  id: string;
  account_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_cycle: 'monthly' | 'yearly';
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  plan?: Plan;
}

export interface FeatureFlag {
  feature_slug: string;
  is_enabled: boolean;
  source: 'plan' | 'addon' | 'manual_override';
}

export interface Invoice {
  id: string;
  amount_usd: number;
  amount_local: number | null;
  currency_local: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paid_at: string | null;
  failed_at: string | null;
  retry_count: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export async function getMySubscription(): Promise<Subscription | null> {
  return apiGet<Subscription | null>('/billing/subscription');
}

export async function getMyFeatures(): Promise<FeatureFlag[]> {
  return apiGet<FeatureFlag[]>('/billing/features');
}

export async function getPlans(): Promise<Plan[]> {
  return apiGet<Plan[]>('/billing/plans');
}

export async function getMyInvoices(): Promise<Invoice[]> {
  return apiGet<Invoice[]>('/billing/invoices');
}

export async function createSubscription(params: {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  cardTokenId: string;
}): Promise<{ subscription_id: string }> {
  return apiPost<{ subscription_id: string }>('/billing/subscriptions', params);
}

export async function cancelSubscription(): Promise<void> {
  await apiPut('/billing/subscriptions/cancel');
}

export async function changePlan(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<void> {
  await apiPut('/billing/subscriptions/change-plan', { planId, billingCycle });
}
