import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchDeliveryPricingConfig,
  updateDeliveryPricingConfig,
  fetchBranchDeliveryConfig,
  fetchAllBranchDeliveryConfigs,
  updateBranchDeliveryConfig,
  fetchCityNeighborhoods,
  fetchBranchNeighborhoods,
  updateNeighborhoodStatus,
  regenerateBranchNeighborhoods,
  getAuthenticatedUserId,
  logDeliveryRadiusOverride,
  fetchDynamicPrepTime,
  calculateDelivery,
  fetchNeighborhoodAssignments,
} from '@/services/deliveryService';

// ─── Pricing Config (brand-level, single row) ───────────────

export function useDeliveryPricingConfig() {
  return useQuery({
    queryKey: ['delivery-pricing-config'],
    queryFn: fetchDeliveryPricingConfig,
  });
}

export function useUpdateDeliveryPricingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      base_distance_km?: number;
      base_price?: number;
      price_per_extra_km?: number;
      max_allowed_radius_km?: number;
      estimated_speed_kmh?: number;
      prep_time_minutes?: number;
      time_disclaimer?: string | null;
    }) => {
      await updateDeliveryPricingConfig(values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-pricing-config'] });
      toast.success('Configuración de pricing actualizada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Branch Delivery Config ─────────────────────────────────

export function useBranchDeliveryConfig(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-delivery-config', branchId],
    queryFn: () => fetchBranchDeliveryConfig(branchId!),
    enabled: !!branchId,
  });
}

export function useAllBranchDeliveryConfigs() {
  return useQuery({
    queryKey: ['branch-delivery-configs-all'],
    queryFn: fetchAllBranchDeliveryConfigs,
  });
}

export function useUpdateBranchDeliveryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      values,
    }: {
      branchId: string;
      values: {
        default_radius_km?: number;
        delivery_enabled?: boolean;
        radius_override_km?: number | null;
        radius_override_until?: string | null;
        radius_override_by?: string | null;
        delivery_hours?: Record<string, Array<{ opens: string; closes: string }>> | null;
      };
    }) => {
      await updateBranchDeliveryConfig(branchId, values);
    },
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-delivery-config', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-delivery-configs-all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Neighborhoods ──────────────────────────────────────────

export function useCityNeighborhoods() {
  return useQuery({
    queryKey: ['city-neighborhoods'],
    queryFn: fetchCityNeighborhoods,
  });
}

export function useBranchNeighborhoods(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-neighborhoods', branchId],
    queryFn: () => fetchBranchNeighborhoods(branchId!),
    enabled: !!branchId,
  });
}

export function useUpdateNeighborhoodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      blockReason,
    }: {
      id: string;
      status: 'enabled' | 'blocked_security';
      blockReason?: string;
    }) => {
      await updateNeighborhoodStatus(id, status, blockReason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-neighborhoods'] });
      toast.success('Estado del barrio actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegenerateBranchNeighborhoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      branchId: string;
      branchLat: number;
      branchLng: number;
      radiusKm: number;
    }) => {
      return regenerateBranchNeighborhoods(params);
    },
    onSuccess: (result, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-neighborhoods', branchId] });
      const { added = 0, updated = 0 } = result ?? {};
      if (added === 0 && updated === 0) {
        toast.success('No hay barrios nuevos que cargar');
      } else {
        const parts = [];
        if (added) parts.push(`${added} nuevo(s)`);
        if (updated) parts.push(`${updated} distancia(s) actualizada(s)`);
        toast.success(`Barrios actualizados: ${parts.join(', ')}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Radius Override Log ────────────────────────────────────

export function useDeliveryRadiusOverride() {
  const qc = useQueryClient();
  const updateConfig = useUpdateBranchDeliveryConfig();

  return useMutation({
    mutationFn: async ({
      branchId,
      newRadiusKm,
      previousKm,
      action,
    }: {
      branchId: string;
      newRadiusKm: number | null;
      previousKm: number | null;
      action: 'reduce' | 'restore';
    }) => {
      const userId = await getAuthenticatedUserId();

      const overrideUntil =
        newRadiusKm != null ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

      await updateConfig.mutateAsync({
        branchId,
        values: {
          radius_override_km: newRadiusKm,
          radius_override_until: overrideUntil,
          radius_override_by: userId,
        },
      });

      await logDeliveryRadiusOverride({
        branch_id: branchId,
        previous_km: previousKm,
        new_km: newRadiusKm,
        action,
        performed_by: userId,
      });
    },
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-delivery-config', branchId] });
      toast.success('Radio de delivery actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Dynamic Prep Time (queue-aware ETA) ────────────────────

export interface DynamicPrepTime {
  prep_time_min: number;
  active_orders: number;
  base_prep_time: number;
}

export function useDynamicPrepTime(
  branchId: string | undefined,
  tipoServicio: 'delivery' | 'retiro',
) {
  return useQuery<DynamicPrepTime>({
    queryKey: ['dynamic-prep-time', branchId, tipoServicio],
    queryFn: () => fetchDynamicPrepTime(branchId!, tipoServicio),
    enabled: !!branchId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ─── Calculate Delivery (client-side call) ──────────────────

export function useCalculateDelivery() {
  return useMutation({
    mutationFn: async (params: {
      branch_id: string;
      customer_lat: number;
      customer_lng: number;
      neighborhood_name?: string;
    }) => {
      return calculateDelivery(params);
    },
  });
}

// ─── Neighborhood Assignments (cross-branch) ───────────────

export function useNeighborhoodAssignments(neighborhoodIds: string[]) {
  return useQuery({
    queryKey: ['neighborhood-assignments', neighborhoodIds],
    queryFn: () => fetchNeighborhoodAssignments(neighborhoodIds),
    enabled: neighborhoodIds.length > 0,
  });
}
