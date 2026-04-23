import { useQuery } from '@tanstack/react-query';
import { getMyFeatures, type FeatureFlag } from '../services/billingService.js';

const PLAN_NAMES: Record<string, string> = {
  pos_basic: 'Starter',
  webapp_orders: 'Starter',
  afip_invoicing: 'Starter',
  basic_reports: 'Starter',
  cash_management: 'Starter',
  single_location: 'Starter',
  multi_location: 'Pro',
  modifier_groups: 'Pro',
  cost_tracking: 'Pro',
  multi_channel: 'Pro',
  promotions: 'Pro',
  staff_management: 'Pro',
  advanced_reports: 'Pro',
  aggregate_dashboard: 'Chain',
  api_access: 'Chain',
  priority_support: 'Chain',
  custom_branding: 'Chain',
  unlimited_locations: 'Chain',
};

interface UseFeatureResult {
  enabled: boolean;
  isLoading: boolean;
  planRequired: string | null;
}

export function useFeature(slug: string): UseFeatureResult {
  const { data: features = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['billing', 'features'],
    queryFn: getMyFeatures,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return { enabled: false, isLoading: true, planRequired: null };
  }

  const flag = features.find(f => f.feature_slug === slug || f.feature_slug === 'all');
  const enabled = flag?.is_enabled === true;

  return {
    enabled,
    isLoading: false,
    planRequired: enabled ? null : (PLAN_NAMES[slug] ?? null),
  };
}

export function useFeatureFlags(): { features: FeatureFlag[]; isLoading: boolean } {
  const { data: features = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['billing', 'features'],
    queryFn: getMyFeatures,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return { features, isLoading };
}
