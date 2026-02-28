import { supabase } from './supabaseClient';

export async function linkGuestOrders(body?: Record<string, unknown>) {
  return supabase.functions.invoke('link-guest-orders', { body: body ?? {} });
}

export async function fetchOnboardingStatus(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function completeOnboarding(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
