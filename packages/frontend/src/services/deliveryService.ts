import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';

// ─── Pricing Config ───

export async function fetchDeliveryPricingConfig() {
  return apiGet('/delivery/pricing-config');
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
  return apiPut('/delivery/pricing-config', values);
}

// ─── Branch Delivery Config ───

export async function fetchBranchDeliveryConfig(branchId: string) {
  return apiGet(`/delivery/branch-config/${branchId}`);
}

export async function fetchAllBranchDeliveryConfigs() {
  return apiGet('/delivery/branch-configs');
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
  return apiPut(`/delivery/branch-config/${branchId}`, values);
}

// ─── Neighborhoods ───

export async function fetchCityNeighborhoods() {
  return apiGet('/delivery/neighborhoods');
}

export async function fetchBranchNeighborhoods(branchId: string) {
  return apiGet(`/delivery/branch-neighborhoods/${branchId}`);
}

export async function updateNeighborhoodStatus(
  id: string,
  status: 'enabled' | 'blocked_security',
  blockReason?: string,
) {
  return apiPut(`/delivery/neighborhoods/${id}/status`, {
    status,
    block_reason: blockReason ?? null,
  });
}

export async function regenerateBranchNeighborhoods(params: {
  branchId: string;
  branchLat: number;
  branchLng: number;
  radiusKm: number;
}) {
  return apiPost<{ added: number; updated: number }>(
    '/delivery/branch-neighborhoods/regenerate',
    params,
  );
}

// ─── Radius Override Log ───

export async function getAuthenticatedUserId(): Promise<string | null> {
  return null;
}

export async function logDeliveryRadiusOverride(params: {
  branch_id: string;
  previous_km: number | null;
  new_km: number | null;
  action: 'reduce' | 'restore';
  performed_by: string | null;
}) {
  return apiPost('/delivery/radius-override-log', params);
}

// ─── Dynamic Prep Time ───

export async function fetchDynamicPrepTime(
  branchId: string,
  tipoServicio: 'delivery' | 'retiro',
) {
  const data = await apiGet('/delivery/dynamic-prep-time', {
    branch_id: branchId,
    tipo_servicio: tipoServicio,
  });
  return (
    data ?? {
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
  return apiPost<{
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
  }>('/delivery/calculate', params);
}

// ─── Neighborhood Assignments ───

export async function fetchNeighborhoodAssignments(neighborhoodIds: string[]) {
  if (neighborhoodIds.length === 0) return [];
  return apiPost('/delivery/neighborhood-assignments', {
    neighborhood_ids: neighborhoodIds,
  });
}

export async function fetchActiveDeliveryStats(branchId: string) {
  return apiGet<{ activeCount: number; avgMinutes: number | null }>(
    `/delivery/active-stats/${branchId}`,
  );
}

export async function fetchDeliveryZones(branchId: string) {
  return apiGet(`/delivery/zones/${branchId}`);
}

export async function createDeliveryZone(branchId: string, orden: number) {
  return apiPost('/delivery/zones', {
    branch_id: branchId,
    sort_order: orden,
  });
}

export async function updateDeliveryZone(id: string, patch: Record<string, unknown>) {
  return apiPut(`/delivery/zones/${id}`, patch);
}

export async function deleteDeliveryZone(id: string) {
  return apiDelete(`/delivery/zones/${id}`);
}

export async function toggleDeliveryZoneActive(id: string, is_active: boolean) {
  return apiPatch(`/delivery/zones/${id}/active`, { is_active });
}
