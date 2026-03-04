import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

// ─── Helpers ───

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Pricing Config ───

export async function fetchDeliveryPricingConfig() {
  const { data, error } = await supabase
    .from('delivery_pricing_config')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDeliveryPricingConfig(values: {
  base_distance_km?: number;
  base_price?: number;
  price_per_extra_km?: number;
  max_allowed_radius_km?: number;
  estimated_speed_kmh?: number;
  prep_time_minutes?: number;
  time_disclaimer?: string | null;
}) {
  const { data: existing } = await supabase
    .from('delivery_pricing_config')
    .select('id')
    .limit(1)
    .single();
  if (!existing) throw new Error('No pricing config found');

  const { error } = await supabase
    .from('delivery_pricing_config')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', existing.id);
  if (error) throw error;
}

// ─── Branch Delivery Config ───

export async function fetchBranchDeliveryConfig(branchId: string) {
  const { data, error } = await supabase
    .from('branch_delivery_config')
    .select('*')
    .eq('branch_id', branchId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function fetchAllBranchDeliveryConfigs() {
  const { data, error } = await supabase
    .from('branch_delivery_config')
    .select('*, branches!inner(id, name, slug, latitude, longitude, is_active)');
  if (error) throw error;
  return data ?? [];
}

export async function updateBranchDeliveryConfig(
  branchId: string,
  values: {
    default_radius_km?: number;
    delivery_enabled?: boolean;
    radius_override_km?: number | null;
    radius_override_until?: string | null;
    radius_override_by?: string | null;
    delivery_hours?: Record<string, Array<{ opens: string; closes: string }>> | null;
  },
) {
  const { error } = await supabase
    .from('branch_delivery_config')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('branch_id', branchId);
  if (error) throw error;
}

// ─── Neighborhoods ───

export async function fetchCityNeighborhoods() {
  const { data, error } = await supabase.from('city_neighborhoods').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchBranchNeighborhoods(branchId: string) {
  const { data, error } = await supabase
    .from('branch_delivery_neighborhoods')
    .select('*, city_neighborhoods(*)')
    .eq('branch_id', branchId)
    .order('distance_km');
  if (error) throw error;
  return data ?? [];
}

export async function updateNeighborhoodStatus(
  id: string,
  status: 'enabled' | 'blocked_security',
  blockReason?: string,
) {
  const { error } = await supabase
    .from('branch_delivery_neighborhoods')
    .update({
      status,
      block_reason: blockReason ?? null,
      decided_by: 'brand_admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function regenerateBranchNeighborhoods(params: {
  branchId: string;
  branchLat: number;
  branchLng: number;
  radiusKm: number;
}) {
  const { branchId, branchLat, branchLng, radiusKm } = params;

  const [{ data: neighborhoods }, { data: existing }] = await Promise.all([
    supabase.from('city_neighborhoods').select('*'),
    supabase
      .from('branch_delivery_neighborhoods')
      .select('id, neighborhood_id, distance_km')
      .eq('branch_id', branchId),
  ]);
  if (!neighborhoods) return { added: 0, updated: 0 };

  const withinRadius = neighborhoods.filter((n) => {
    const dist = haversineDistance(
      branchLat,
      branchLng,
      Number(n.centroid_lat),
      Number(n.centroid_lng),
    );
    return dist <= radiusKm;
  });

  const existingByNeighborhood = new Map((existing ?? []).map((r) => [r.neighborhood_id, r]));
  const toInsert: Array<{
    branch_id: string;
    neighborhood_id: string;
    status: 'enabled';
    distance_km: number;
    decided_by: 'auto';
  }> = [];
  const toUpdateDistance: Array<{ id: string; distance_km: number }> = [];

  for (const n of withinRadius) {
    const distance_km =
      Math.round(
        haversineDistance(
          branchLat,
          branchLng,
          Number(n.centroid_lat),
          Number(n.centroid_lng),
        ) * 100,
      ) / 100;
    const row = existingByNeighborhood.get(n.id);
    if (!row) {
      toInsert.push({
        branch_id: branchId,
        neighborhood_id: n.id,
        status: 'enabled',
        distance_km,
        decided_by: 'auto',
      });
    } else if (Number(row.distance_km) !== distance_km) {
      toUpdateDistance.push({ id: row.id, distance_km });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('branch_delivery_neighborhoods').insert(toInsert);
    if (error) throw error;
  }

  for (const { id, distance_km } of toUpdateDistance) {
    const { error } = await supabase
      .from('branch_delivery_neighborhoods')
      .update({ distance_km })
      .eq('id', id);
    if (error) throw error;
  }

  return { added: toInsert.length, updated: toUpdateDistance.length };
}

// ─── Radius Override Log ───

export async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function logDeliveryRadiusOverride(params: {
  branch_id: string;
  previous_km: number | null;
  new_km: number | null;
  action: 'reduce' | 'restore';
  performed_by: string | null;
}) {
  await supabase.from('delivery_radius_overrides_log').insert(params);
}

// ─── Dynamic Prep Time ───

export async function fetchDynamicPrepTime(
  branchId: string,
  tipoServicio: 'delivery' | 'retiro',
) {
  const { data, error } = await supabase.rpc('get_dynamic_prep_time', {
    p_branch_id: branchId,
    p_tipo_servicio: tipoServicio,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (
    row ?? {
      prep_time_min: tipoServicio === 'delivery' ? 40 : 15,
      active_orders: 0,
      base_prep_time: tipoServicio === 'delivery' ? 40 : 15,
    }
  );
}

// ─── Calculate Delivery ───

export async function calculateDelivery(params: {
  branch_id: string;
  customer_lat: number;
  customer_lng: number;
  neighborhood_name?: string;
}) {
  const { data, error } = await supabase.functions.invoke('calculate-delivery', {
    body: params,
  });
  if (error) throw error;
  return data as {
    available: boolean;
    cost: number | null;
    distance_km: number | null;
    duration_min: number | null;
    estimated_delivery_min: number | null;
    disclaimer: string | null;
    reason?:
      | 'out_of_radius'
      | 'blocked_zone'
      | 'delivery_disabled'
      | 'assigned_other_branch'
      | 'not_assigned';
    suggested_branch?: { id: string; name: string; slug: string } | null;
  };
}

// ─── Neighborhood Assignments ───

export async function fetchNeighborhoodAssignments(neighborhoodIds: string[]) {
  if (neighborhoodIds.length === 0) return [];
  const { data, error } = await supabase
    .from('branch_delivery_neighborhoods')
    .select('neighborhood_id, branch_id, status, branches!inner(id, name, slug)')
    .in('neighborhood_id', neighborhoodIds)
    .eq('status', 'enabled');
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveDeliveryStats(branchId: string) {
  const { data, error } = await fromUntyped('orders')
    .select('id, created_at, tiempo_en_camino')
    .eq('branch_id', branchId)
    .eq('tipo_servicio', 'delivery')
    .in('estado', ['confirmado', 'en_preparacion', 'listo', 'en_camino'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) return { activeCount: 0, avgMinutes: null };

  const activeCount = data?.length ?? 0;
  const deliveredWithTime = (data ?? []).filter((p) => p.tiempo_en_camino);
  let avgMinutes: number | null = null;
  if (deliveredWithTime.length > 0) {
    const totalMin = deliveredWithTime.reduce((sum, p) => {
      const created = new Date(p.created_at!).getTime();
      const delivered = new Date(p.tiempo_en_camino!).getTime();
      return sum + (delivered - created) / 60000;
    }, 0);
    avgMinutes = Math.round(totalMin / deliveredWithTime.length);
  }
  return { activeCount, avgMinutes };
}

export async function fetchDeliveryZones(branchId: string) {
  const { data, error } = await fromUntyped('delivery_zones')
    .select('*')
    .eq('branch_id', branchId)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createDeliveryZone(branchId: string, orden: number) {
  const { error } = await fromUntyped('delivery_zones').insert({
    branch_id: branchId,
    nombre: 'Nueva zona',
    costo_envio: 0,
    pedido_minimo: 0,
    tiempo_estimado_min: 40,
    barrios: [],
    orden,
    is_active: true,
  });
  if (error) throw error;
}

export async function updateDeliveryZone(id: string, patch: Record<string, unknown>) {
  const { error } = await fromUntyped('delivery_zones')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDeliveryZone(id: string) {
  const { error } = await fromUntyped('delivery_zones')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function toggleDeliveryZoneActive(id: string, is_active: boolean) {
  const { error } = await fromUntyped('delivery_zones')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}
