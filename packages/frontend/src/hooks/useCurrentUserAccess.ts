/**
 * Sprint 3 — Capability-based access hook.
 *
 * Replaces the role-enum pattern from `usePermissions.ts` with a composable
 * capabilities model aligned with `user_location_access` and
 * `user_account_access` DB tables.
 *
 * Usage:
 *   const { locations, account, hasLocationCap, hasAccountCap } = useCurrentUserAccess();
 *
 *   // Can user operate POS at a specific location?
 *   if (hasLocationCap(locationId, 'operate_pos')) { ... }
 *
 *   // Can user see aggregate finance dashboard?
 *   if (hasAccountCap('view_aggregate_finance')) { ... }
 */

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/apiClient';
import { useAuth } from './useAuth';

export type LocationCapability =
  | 'operate_pos'
  | 'manage_staff'
  | 'manage_inventory'
  | 'manage_catalog_local'
  | 'view_finance'
  | 'manage_finance'
  | 'manage_promotions';

export type AccountCapability =
  | 'view_aggregate_sales'
  | 'view_aggregate_finance'
  | 'manage_account_catalog'
  | 'manage_account_users'
  | 'manage_account_settings';

export interface LocationAccess {
  id: string;
  name: string;
  capabilities: LocationCapability[];
}

export interface AccountAccess {
  id: string;
  name: string | null;
  capabilities: AccountCapability[];
}

export interface UserAccessData {
  locations: LocationAccess[];
  account: AccountAccess | null;
}

async function fetchMyAccess(): Promise<UserAccessData> {
  return apiGet<UserAccessData>('/permissions/my-access');
}

export function useCurrentUserAccess() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['my-access', user?.id],
    queryFn: fetchMyAccess,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data;

  function hasLocationCap(locationId: string, cap: LocationCapability): boolean {
    if (!data) return false;
    const loc = data.locations.find((l) => l.id === locationId);
    return !!loc && loc.capabilities.includes(cap);
  }

  function hasAccountCap(cap: AccountCapability): boolean {
    if (!data?.account) return false;
    return data.account.capabilities.includes(cap);
  }

  function canAccessAnyLocation(): boolean {
    return !!data && data.locations.length > 0;
  }

  function canAccessAccount(): boolean {
    return !!data?.account && data.account.capabilities.length > 0;
  }

  /** True if user has access to more than 1 location (show switcher). */
  function isMultiLocation(): boolean {
    return !!data && data.locations.length > 1;
  }

  return {
    ...query,
    locations: data?.locations ?? [],
    account: data?.account ?? null,
    hasLocationCap,
    hasAccountCap,
    canAccessAnyLocation,
    canAccessAccount,
    isMultiLocation,
  };
}
