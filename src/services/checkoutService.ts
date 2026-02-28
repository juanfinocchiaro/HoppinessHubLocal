import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { SavedAddress } from '@/types/checkout';

export async function fetchUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', userId)
    .single();
  return data;
}

export async function fetchSavedAddresses(userId: string) {
  const { data, error } = await supabase
    .from('cliente_direcciones')
    .select('id, etiqueta, direccion, piso, referencia')
    .eq('user_id', userId)
    .order('es_principal', { ascending: false });

  if (error) throw error;

  return (data || []) as SavedAddress[];
}

export async function fetchGoogleMapsApiKey() {
  const { data, error } = await supabase.functions.invoke('google-maps-key');
  if (error) return null;
  return data?.apiKey as string | null;
}

export async function fetchWebappConfigPayments(branchId: string) {
  const { data, error } = await fromUntyped('webapp_config')
    .select('service_schedules')
    .eq('branch_id', branchId)
    .maybeSingle();

  if (error) throw error;
  return data as { service_schedules?: unknown } | null;
}

export async function createWebappOrder(payload: unknown) {
  const { data, error } = await supabase.functions.invoke('create-webapp-order', {
    body: payload,
  });
  return { data, error };
}

export async function createMercadoPagoCheckout(payload: unknown) {
  const { data, error } = await supabase.functions.invoke('mp-checkout', {
    body: payload,
  });
  return { data, error };
}
